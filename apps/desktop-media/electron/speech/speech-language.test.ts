import { describe, expect, it } from "vitest";
import { sanitizeSpeechLanguage, whisperLanguageArg } from "./speech-language";

describe("sanitizeSpeechLanguage", () => {
  it("defaults missing and blank values to auto", () => {
    expect(sanitizeSpeechLanguage(undefined)).toBe("auto");
    expect(sanitizeSpeechLanguage("  ")).toBe("auto");
    expect(sanitizeSpeechLanguage("AUTO")).toBe("auto");
  });

  it("keeps a language code and a partial code being typed", () => {
    expect(sanitizeSpeechLanguage(" RU ")).toBe("ru");
    expect(sanitizeSpeechLanguage("r")).toBe("r");
    expect(sanitizeSpeechLanguage("eng")).toBe("eng");
  });

  it("rejects values that are not a language code", () => {
    expect(sanitizeSpeechLanguage("russian")).toBe("auto");
    expect(sanitizeSpeechLanguage("en-US")).toBe("auto");
  });
});

describe("whisperLanguageArg", () => {
  it("passes auto and full codes, and treats a partial code as auto", () => {
    expect(whisperLanguageArg("auto")).toBe("auto");
    expect(whisperLanguageArg("fr")).toBe("fr");
    expect(whisperLanguageArg("r")).toBe("auto");
  });
});
