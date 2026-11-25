/**
 * Speech-to-text result stored on `MediaMetadataV2.speech_analysis`.
 * Speaker traits (gender, age) are intentionally absent until a later phase.
 */

export interface SpeechAnalysisWord {
  start_ms: number;
  end_ms: number;
  text: string;
  filler?: boolean;
}

export interface SpeechAnalysisSegment {
  start_ms: number;
  end_ms: number;
  text: string;
  speaker_id?: string | null;
  words?: SpeechAnalysisWord[];
}

export interface SpeechAnalysisSpeaker {
  id: string;
  label: string;
}

export interface SpeechAnalysisSilenceSpan {
  start_ms: number;
  end_ms: number;
}

export interface SpeechAnalysisOptions {
  word_timestamps: boolean;
  silence_min_ms: number;
  filler_detection: boolean;
}

export interface SpeechAnalysisMetadata {
  processed_at: string;
  engine: "whisper.cpp";
  model: string;
  language: string | null;
  duration_ms: number;
  /** False when the video file has no audio track. */
  has_audio: boolean;
  /** False when no speech was recognized (silent or music-only audio). */
  has_speech: boolean;
  text: string;
  /** Null until a diarization phase fills speakers. */
  speaker_count: number | null;
  speakers: SpeechAnalysisSpeaker[] | null;
  segments: SpeechAnalysisSegment[];
  silence_spans?: SpeechAnalysisSilenceSpan[];
  options: SpeechAnalysisOptions;
}
