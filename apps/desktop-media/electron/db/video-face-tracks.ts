import { randomUUID } from "node:crypto";
import { getDesktopDatabase } from "./client";
import { DEFAULT_LIBRARY_ID } from "./folder-analysis-status";
import { upsertFaceEmbedding } from "./face-embeddings";
import type { FaceTrack } from "../video-face/track-faces";
import type { RepresentativePick } from "../video-face/representative-face";

export interface PersistedVideoFaceResult {
  mediaItemId: string;
  trackCount: number;
  representativeFaceCount: number;
  faceInstanceIds: string[];
}

function bboxFromDetection(detection: { bbox_xyxy: [number, number, number, number] }): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const [x1, y1, x2, y2] = detection.bbox_xyxy;
  return {
    x: x1,
    y: y1,
    width: Math.max(0, x2 - x1),
    height: Math.max(0, y2 - y1),
  };
}

export function getVideoDurationSecForPath(
  sourcePath: string,
  libraryId = DEFAULT_LIBRARY_ID,
): number | null {
  const db = getDesktopDatabase();
  const row = db
    .prepare(
      `SELECT video_duration_sec FROM media_items
       WHERE library_id = ? AND source_path = ? AND deleted_at IS NULL LIMIT 1`,
    )
    .get(libraryId, sourcePath) as { video_duration_sec: number | null } | undefined;
  if (!row || typeof row.video_duration_sec !== "number" || !Number.isFinite(row.video_duration_sec)) {
    return null;
  }
  return row.video_duration_sec;
}

export function replaceVideoFaceTracks(params: {
  sourcePath: string;
  tracks: FaceTrack[];
  representatives: Array<{ trackIndex: number; pick: RepresentativePick }>;
  imageSize: { width: number; height: number } | null;
  detectorModel: string;
  embeddingsByFaceKey: Map<string, { vector: number[]; model: string; dimension: number }>;
  libraryId?: string;
}): PersistedVideoFaceResult | null {
  const libraryId = params.libraryId ?? DEFAULT_LIBRARY_ID;
  const db = getDesktopDatabase();
  const now = new Date().toISOString();
  const mediaItem = db
    .prepare(
      `SELECT id FROM media_items WHERE library_id = ? AND source_path = ? AND deleted_at IS NULL LIMIT 1`,
    )
    .get(libraryId, params.sourcePath) as { id: string } | undefined;
  if (!mediaItem) {
    return null;
  }

  const refW = params.imageSize?.width ?? null;
  const refH = params.imageSize?.height ?? null;
  const faceInstanceIds: string[] = [];

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE media_items
       SET face_detection_processed_at = ?,
           face_detection_failed_at = NULL,
           face_detection_error = NULL,
           updated_at = ?
       WHERE id = ?`,
    ).run(now, now, mediaItem.id);

    const existingTracks = db
      .prepare(`SELECT id FROM media_face_tracks WHERE library_id = ? AND media_item_id = ?`)
      .all(libraryId, mediaItem.id) as Array<{ id: string }>;
    for (const track of existingTracks) {
      db.prepare(`DELETE FROM media_face_track_samples WHERE track_id = ?`).run(track.id);
    }
    db.prepare(`DELETE FROM media_face_tracks WHERE library_id = ? AND media_item_id = ?`).run(
      libraryId,
      mediaItem.id,
    );
    db.prepare(
      `DELETE FROM media_face_instances WHERE library_id = ? AND media_item_id = ? AND source = 'auto' AND face_track_id IS NOT NULL`,
    ).run(libraryId, mediaItem.id);

    const insertTrack = db.prepare(
      `INSERT INTO media_face_tracks (
        id, library_id, media_item_id, track_index, sample_count,
        start_time_ms, end_time_ms, suggested_tag_id,
        primary_face_instance_id, secondary_face_instance_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    );
    const insertSample = db.prepare(
      `INSERT INTO media_face_track_samples (
        id, library_id, track_id, frame_index, time_ms,
        bbox_x, bbox_y, bbox_width, bbox_height, bbox_ref_width, bbox_ref_height,
        confidence, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertFace = db.prepare(
      `INSERT INTO media_face_instances (
        id, library_id, media_item_id, source, tag_id, cluster_id, confidence,
        bbox_x, bbox_y, bbox_width, bbox_height, bbox_ref_width, bbox_ref_height,
        bbox_area_image_ratio, bbox_short_side_ratio_to_largest, subject_role,
        detector_model, landmarks_json, estimated_age_years, estimated_gender,
        age_gender_confidence, age_gender_model, embedding_json, embedding_status,
        face_track_id, created_at, updated_at
      ) VALUES (?, ?, ?, 'auto', NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?, ?, ?)`,
    );

    const pickByTrack = new Map(params.representatives.map((row) => [row.trackIndex, row.pick]));

    for (const track of params.tracks) {
      if (track.samples.length === 0) continue;
      const trackId = randomUUID();
      const first = track.samples[0]!;
      const last = track.samples[track.samples.length - 1]!;
      const pick = pickByTrack.get(track.trackIndex);
      let primaryId: string | null = null;
      let secondaryId: string | null = null;

      const insertRep = (candidate: RepresentativePick["primary"], key: string): string => {
        const id = randomUUID();
        const box = bboxFromDetection(candidate);
        const landmarksJson =
          Array.isArray(candidate.landmarks_5) && candidate.landmarks_5.length === 5
            ? JSON.stringify(candidate.landmarks_5)
            : null;
        const detection = track.samples.find(
          (sample) => sample.timeMs === candidate.timeMs && sample.frameIndex === candidate.frameIndex,
        )?.detection;
        insertFace.run(
          id,
          libraryId,
          mediaItem.id,
          candidate.score,
          box.x,
          box.y,
          box.width,
          box.height,
          refW,
          refH,
          detection?.bboxAreaImageRatio ?? candidate.bboxAreaImageRatio ?? null,
          detection?.bboxShortSideRatioToLargest ?? null,
          detection?.subjectRole ?? null,
          params.detectorModel,
          landmarksJson,
          detection?.ageGender?.ageYears ?? null,
          detection?.ageGender?.gender ?? null,
          detection?.ageGender?.genderConfidence ?? null,
          detection?.ageGender?.model ?? null,
          trackId,
          now,
          now,
        );
        faceInstanceIds.push(id);
        const embedding = params.embeddingsByFaceKey.get(key);
        if (embedding) {
          upsertFaceEmbedding(id, embedding.vector, embedding.model, embedding.dimension, libraryId);
        }
        return id;
      };

      if (pick) {
        primaryId = insertRep(pick.primary, `${track.trackIndex}:primary`);
        if (pick.secondary) {
          secondaryId = insertRep(pick.secondary, `${track.trackIndex}:secondary`);
        }
      }

      insertTrack.run(
        trackId,
        libraryId,
        mediaItem.id,
        track.trackIndex,
        track.samples.length,
        first.timeMs,
        last.timeMs,
        primaryId,
        secondaryId,
        now,
        now,
      );

      for (const sample of track.samples) {
        const box = bboxFromDetection(sample.detection);
        insertSample.run(
          randomUUID(),
          libraryId,
          trackId,
          sample.frameIndex,
          sample.timeMs,
          box.x,
          box.y,
          box.width,
          box.height,
          refW,
          refH,
          sample.detection.score,
          now,
        );
      }
    }
  });

  tx();
  return {
    mediaItemId: mediaItem.id,
    trackCount: params.tracks.length,
    representativeFaceCount: faceInstanceIds.length,
    faceInstanceIds,
  };
}
