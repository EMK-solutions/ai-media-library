/** Fixed whisper.cpp JSON used when `EMK_E2E_SPEECH_MODEL_STUB=1`. */
export const STUB_WHISPER_JSON: unknown = {
  result: { language: "en" },
  transcription: [
    {
      offsets: { from: 0, to: 400 },
      text: " hello um",
      tokens: [
        { text: " hello", offsets: { from: 0, to: 200 } },
        { text: " um", offsets: { from: 200, to: 400 } },
      ],
    },
    {
      offsets: { from: 2000, to: 2500 },
      text: " there",
      tokens: [{ text: " there", offsets: { from: 2000, to: 2500 } }],
    },
  ],
};

export const STUB_WHISPER_DURATION_MS = 3000;

export function isStubSpeechFailure(videoPath: string): boolean {
  return videoPath.toLowerCase().includes("fail-speech");
}

/** Stub mode treats paths containing `no-voice` as videos without speech. */
export function isStubNoVoice(videoPath: string): boolean {
  return videoPath.toLowerCase().includes("no-voice");
}
