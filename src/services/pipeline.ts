import {
  IOcrService,
  IMeaningService,
  IScriptService,
  IVoiceService,
  IVideoService,
  ScriptVariants
} from "../types";

export class MockOcrService implements IOcrService {
  async extractText(sourceUrl: string): Promise<{ rawOcr: string; cleanText: string }> {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      rawOcr: "the biggest risk is not taking any risk... in a world that is changing really quickly, the only strategy that is guaranteed to fail is not taking risks. it's not about being reckless, but about making smart bets and moving fast.",
      cleanText: "The biggest risk is not taking any risk. In a world that is changing really quickly, the only strategy that is guaranteed to fail is not taking risks. It's not about being reckless, but about making smart bets and moving fast."
    };
  }
}

export class MockMeaningService implements IMeaningService {
  async extractCoreMeaning(cleanText: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return "True security comes from embracing calculated risks in a fast-evolving world; standing still is the only guaranteed way to fail.";
  }
}

export class RealScriptService implements IScriptService {
  async generateScripts(
    cleanText: string,
    coreMeaning: string,
    language: string,
    options?: {
      scriptProcessRunCount: number;
      cumulativeScriptInputTokens: number;
      cumulativeScriptOutputTokens: number;
      cumulativeScriptTotalTokens: number;
    }
  ): Promise<any> {
    const response = await fetch("/api/generate-scripts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cleanText,
        coreMeaning,
        language,
        scriptProcessRunCount: options?.scriptProcessRunCount || 0,
        cumulativeScriptInputTokens: options?.cumulativeScriptInputTokens || 0,
        cumulativeScriptOutputTokens: options?.cumulativeScriptOutputTokens || 0,
        cumulativeScriptTotalTokens: options?.cumulativeScriptTotalTokens || 0
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${response.status}: Failed to generate scripts`);
    }

    return await response.json();
  }
}

export class MockVoiceService implements IVoiceService {
  async generateVoice(script: string, voiceId: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    return `https://dummy-audio-url.mp3?voice=${voiceId}&text=${encodeURIComponent(script.substring(0, 20))}`;
  }
}

export class MockVideoService implements IVideoService {
  async composeVideo(params: {
    sourceUrl: string;
    script: string;
    audioUrl: string;
    format: "1080x1920";
  }): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4";
  }
}

// Global service provider to resemble clean framework setups
export const services = {
  ocr: new MockOcrService(),
  meaning: new MockMeaningService(),
  script: new RealScriptService(),
  voice: new MockVoiceService(),
  video: new MockVideoService()
};
