import { QuoteJob } from "./types";

export const initialMockJob: QuoteJob = {
  contentId: "Q000001",
  status: "OCR_READY", // A realistic initial state where RAW OCR has run, ready for cleaning/meaning
  sourceFilename: "tom_wisdom_keynote_clip_02.mp4",
  sourceType: "video",
  sourceUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1080", // Using a professional presentation video placeholder image
  rawOcr: "the biggest risk is not taking any risk... in a world that is changing really quickly, the only strategy that is guaranteed to fail is not taking risks. it's not about being reckless, but about making smart bets and moving fast.",
  cleanText: "The biggest risk is not taking any risk. In a world that is changing really quickly, the only strategy that is guaranteed to fail is not taking risks. It's not about being reckless, but about making smart bets and moving fast.",
  coreMeaning: "True security comes from embracing calculated risks in a fast-evolving world; standing still is the only guaranteed way to fail.",
  scripts: {
    scriptA: "The biggest risk is not taking any risk. In a rapidly changing world, playing it safe is the only guaranteed way to fail. Don't be reckless, but make smart bets and move fast. Your future depends on it.",
    scriptB: "Are you avoiding risks? Think again. In a fast-changing world, the only strategy guaranteed to fail is standing still. It's not about being reckless—it's about calculated bets and speed.",
    scriptC: "If you don't take risks, you've already failed. The world moves too fast for comfort zones. Make smart, calculated bets. Move fast. Take the risk or lose the chance."
  },
  femaleVoice: {
    voiceId: "Sulafat",
    name: "Sienna (Warm, Professional)",
    status: "PENDING",
    audioUrl: undefined,
    duration: undefined,
    audioUrlOrRef: null,
    durationMs: null
  },
  maleVoice: {
    voiceId: "Charon",
    name: "Marcus (Deep, Cinematic)",
    status: "PENDING",
    audioUrl: undefined,
    duration: undefined,
    audioUrlOrRef: null,
    durationMs: null
  },
  videoStatus: "READY",
  videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4", // Standard stock video preview
  // Build 5 Observability & Accounting Patch Initializers
  textProcessRunCount: 0,
  lastTextProcessAt: null,
  lastInputTokens: null,
  lastOutputTokens: null,
  lastTotalTokens: null,
  lastLatencyMs: null,
  cumulativeInputTokens: 0,
  cumulativeOutputTokens: 0,
  cumulativeTotalTokens: 0,
  estimatedCost: null,
  // Build 6 Stage 4 Observability & Accounting Patch Initializers
  scriptProcessRunCount: 0,
  lastScriptProcessAt: null,
  lastScriptInputTokens: null,
  lastScriptOutputTokens: null,
  lastScriptTotalTokens: null,
  lastScriptLatencyMs: null,
  cumulativeScriptInputTokens: 0,
  cumulativeScriptOutputTokens: 0,
  cumulativeScriptTotalTokens: 0,
  scriptEstimatedCost: null,
  language: "en",
  // Build 7 Stage 5 Voice Foundation Properties
  voiceSourceType: "SCRIPT_A",
  voiceSourceTextSnapshot: null,
  voiceProvider: null,
  voiceEngine: null,
  voiceProcessRunCount: 0,
  lastVoiceProcessAt: null,
  lastVoiceLatencyMs: null,
  cumulativeVoiceCharacters: 0,
  voiceEstimatedCost: null
};
