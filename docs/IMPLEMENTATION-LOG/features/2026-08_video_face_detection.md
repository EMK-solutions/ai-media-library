# Face detection in video files

**Date:** 2026-08-29

## Goal

Extend the existing face-detection pipeline so it can sample video files, track faces across
frames, store a small set of representative faces, and write the same person suggestions used for
photos — so videos appear in people search when **Include unconfirmed similar faces** is on.

## What shipped

- Settings: **Detect faces in video files** (default on) and **Video face sample interval**
  (default 1.0 s), persisted with the rest of `faceDetectionSettings`.
- Schema: `media_face_tracks`, `media_face_track_samples`, and `face_track_id` on
  `media_face_instances`. Catalog `face_detection_processed_at` is reused for videos.
- One pipeline (`face-detection`): all pending images in the tree, then pending videos.
  ffmpeg samples frames; ONNX detects; IoU + embedding tracks; 1–2 representative faces per track.
- People grids / grouping / similar-counts stay image-only. Suggestions include videos.
- Folder coverage includes videos in the face denominator when the setting is on.
- Background operations copy: image and video processed counts plus files-with-faces, not raw
  instance totals. Time left resets at the video phase.
- Person-chip search UNIONs matching videos after ranked stills (no vision index required).

## Notes

- v1 does not add Face tags on playback, People-grid cards for video reps, or per-run include-videos
  on the folder menu.
- ffmpeg missing fails that clip and continues the job.
