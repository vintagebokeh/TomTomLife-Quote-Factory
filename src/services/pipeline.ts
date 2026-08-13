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

export class MockScriptService implements IScriptService {
  async generateScripts(coreMeaning: string): Promise<ScriptVariants> {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      scriptA: "The biggest risk is not taking any risk. In a rapidly changing world, playing it safe is the only guaranteed way to fail. Don't be reckless, but make smart bets and move fast. Your future depends on it.",
      scriptB: "Are you avoiding risks? Think again. In a fast-changing world, the only strategy guaranteed to fail is standing still. It's not about being reckless—it's about calculated bets and speed.",
      scriptC: "If you don't take risks, you've already failed. The world moves too fast for comfort zones. Make smart, calculated bets. Move fast. Take the risk or lose the chance."
    };
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
  script: new MockScriptService(),
  voice: new MockVoiceService(),
  video: new MockVideoService()
};
