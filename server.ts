import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import { execFile } from "child_process";

interface VideoGenerationRequest {
  contentId?: unknown;
  jobStatus?: unknown;
  visualRef?: unknown;
  voiceSourceTextSnapshot?: unknown;
  language?: unknown;
  femaleAudioStatus?: unknown;
  maleAudioStatus?: unknown;
  femaleAudioRef?: unknown;
  maleAudioRef?: unknown;
}

interface VideoGenerationResult {
  status: "READY" | "FAILED";
  provider: string;
  engine: string;
  providerTaskId?: string | null;
  videoUrlOrRef?: string | null;
  mimeType?: string | null;
  filename?: string | null;
  fileSizeBytes?: number | null;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
  frameRate?: number | null;
  hasAudio?: boolean | null;
  latencyMs?: number | null;
  failureCode?: string | null;
  failureMessage?: string | null;
}

const inspectVideoArtifact = (filePath: string): Promise<Record<string, unknown>> => new Promise((resolve) => {
  execFile("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate", "-of", "json", filePath], (error, stdout) => {
    if (error) return resolve({ available: false, code: "FFPROBE_UNAVAILABLE", message: error.message });
    try {
      resolve({ available: true, ...(JSON.parse(stdout) as Record<string, unknown>) });
    } catch {
      resolve({ available: false, code: "FFPROBE_INVALID_OUTPUT", message: "ffprobe did not return valid JSON." });
    }
  });
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Set up standard JSON parser with a generous size limit for base64 frames
  app.use(express.json({ limit: "50mb" }));

  // Create audio directory if it doesn't exist
  const audioDir = path.join(process.cwd(), "audio");
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  // Serve audio folder statically
  app.use("/audio", express.static(audioDir));

  // Stage 6 keeps visual and video artifacts server-owned; browser blob URLs are never durable refs.
  const sourceDir = path.join(process.cwd(), "source");
  const videoDir = path.join(process.cwd(), "video");
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(videoDir, { recursive: true });
  app.use("/source", express.static(sourceDir));
  app.use("/video", express.static(videoDir));

  app.post("/api/source-artifacts", (req, res) => {
    const { fileName, mimeType, dataBase64 } = req.body || {};
    const acceptedMime = typeof mimeType === "string" && /^(image|video)\//i.test(mimeType);
    if (typeof fileName !== "string" || !acceptedMime || typeof dataBase64 !== "string" || !dataBase64) {
      return res.status(400).json({ error: "INVALID_SOURCE_ARTIFACT", message: "A source filename, image/video MIME type, and Base64 payload are required." });
    }

    try {
      const payload = Buffer.from(dataBase64, "base64");
      if (!payload.length) throw new Error("Decoded payload is empty.");
      const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${safeName}`;
      fs.writeFileSync(path.join(sourceDir, filename), payload);
      return res.status(201).json({ sourceRef: `/source/${filename}`, filename, mimeType, sizeBytes: payload.length });
    } catch (error: any) {
      return res.status(400).json({ error: "SOURCE_ARTIFACT_WRITE_FAILED", message: error.message || "Unable to persist the source artifact." });
    }
  });

  // Endpoint to check configuration status
  app.get("/api/config-status", (req, res) => {
    const isConfigured = !!process.env.GOOGLE_CLOUD_VISION_API_KEY;
    res.json({ configured: isConfigured });
  });

  // Main Google Cloud Vision OCR proxy endpoint
  app.post("/api/ocr-vision", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "NOT_CONFIGURED",
          message: "Google Cloud Vision API Key is not configured in environment variables."
        });
      }

      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing imageBase64 data." });
      }

      // Strip any standard base64 data url scheme (e.g. data:image/png;base64,)
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, "");

      // Call Google Cloud Vision Annotate API
      const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
      const payload = {
        requests: [
          {
            image: {
              content: cleanBase64
            },
            features: [
              {
                type: "DOCUMENT_TEXT_DETECTION"
              }
            ],
            imageContext: {
              languageHints: ["th"]
            }
          }
        ]
      };

      const response = await fetch(visionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `Google API Error (${response.status})`,
          message: errorText
        });
      }

      const data = await response.json();
      
      const responseAnnotation = data.responses?.[0];
      if (responseAnnotation?.error) {
        return res.status(400).json({
          error: "Google Vision API Error",
          message: responseAnnotation.error.message
        });
      }

      // Extract raw full text detection
      const textAnnotations = responseAnnotation?.textAnnotations;
      const rawText = textAnnotations?.[0]?.description || "";

      res.json({ text: rawText });
    } catch (err: any) {
      console.error("[Vision API Proxy Error]", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: err.message || "Unknown error occurred on the proxy server."
      });
    }
  });

  // Main Google Gemini Text Processing endpoint using Gemma 4 26B with usage accounting patch
  app.post("/api/text-process", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "NOT_CONFIGURED",
          message: "GEMINI_API_KEY is not configured in environment variables."
        });
      }

      const { rawOcrText } = req.body;
      if (!rawOcrText || typeof rawOcrText !== "string" || rawOcrText.trim() === "") {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing or empty rawOcrText parameter in request body."
        });
      }

      const startTime = Date.now();
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are an elite automated text processing service in a video production pipeline.
Analyze the following raw OCR text (which is machine evidence and may contain artifacts, bad spacing, or formatting noise):
"${rawOcrText}"

Perform these operations:
1. Normalise spacing, repair OCR errors/artifacts, and improve line breaks and punctuation. Preserve Thai meaning and do not creatively rewrite or invent any information. Save this as 'clean_text'.
2. Synthesize a concise, accurate semantic interpretation of the central meaning, preserving the original intent. Do not invent any attribution or unsupported facts. Save this as 'core_meaning'.
3. Identify the language code of the text (e.g., 'th', 'en'). Save this as 'language'.

You MUST return a valid JSON object matching this schema EXACTLY:
{
  "clean_text": "corrected string",
  "core_meaning": "concise interpretation",
  "language": "language code"
}

Do NOT include any markdown code fences, preambles, explanation prose, or analysis. Return ONLY the raw JSON.`;

      // Track how many REAL model invocations have been made.
      // Increment only when the backend actually attempts a request to the Gemma model.
      const nextRunCount = (req.body.textProcessRunCount || 0) + 1;
      let textResponse = "";
      let usageMetadata: any = null;

      try {
        try {
          const aiRes = await ai.models.generateContent({
            model: "gemma-4-26b-a4b-it",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          });
          textResponse = aiRes.text || "";
          usageMetadata = aiRes.usageMetadata;
        } catch (firstErr: any) {
          console.warn("[Gemma Structured Call Warning] Retrying without strict json mime-type...", firstErr);
          // Fallback retry without strict application/json configuration to avoid parameter incompatibility
          const aiResFallback = await ai.models.generateContent({
            model: "gemma-4-26b-a4b-it",
            contents: prompt,
            config: {
              temperature: 0.1
            }
          });
          textResponse = aiResFallback.text || "";
          usageMetadata = aiResFallback.usageMetadata;
        }
      } catch (invocationError: any) {
        console.error("[Gemma Invocation Error]", invocationError);
        return res.status(502).json({
          error: "PROVIDER_FAILURE",
          message: invocationError.message || "The standard Gemma model invocation failed at provider level.",
          status: 502,
          textProcessRunCount: nextRunCount
        });
      }

      let cleanedText = textResponse.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```(json)?\s*/i, "");
        cleanedText = cleanedText.replace(/\s*```$/, "");
      }
      cleanedText = cleanedText.trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleanedText);
      } catch (parseErr: any) {
        console.error("[JSON Parse Failure]", cleanedText, parseErr);
        return res.status(422).json({
          error: "MALFORMED_OUTPUT",
          message: "The model did not return a parseable JSON object.",
          rawOutput: textResponse,
          textProcessRunCount: nextRunCount
        });
      }

      const clean_text = parsed.clean_text || parsed.cleanText;
      const core_meaning = parsed.core_meaning || parsed.coreMeaning;
      const language = parsed.language;

      if (!clean_text || typeof clean_text !== "string" || clean_text.trim() === "" ||
          !core_meaning || typeof core_meaning !== "string" || core_meaning.trim() === "" ||
          !language || typeof language !== "string" || language.trim() === "") {
        return res.status(422).json({
          error: "INVALID_STRUCTURE",
          message: "Model output is missing required fields: 'clean_text', 'core_meaning', or 'language'.",
          parsed,
          textProcessRunCount: nextRunCount
        });
      }

      const latency_ms = Date.now() - startTime;
      const input_tokens = usageMetadata?.promptTokenCount || null;
      const output_tokens = usageMetadata?.candidatesTokenCount || null;
      const total_tokens = usageMetadata?.totalTokenCount || null;

      const cumulative_input_tokens = (req.body.cumulativeInputTokens || 0) + (input_tokens || 0);
      const cumulative_output_tokens = (req.body.cumulativeOutputTokens || 0) + (output_tokens || 0);
      const cumulative_total_tokens = (req.body.cumulativeTotalTokens || 0) + (total_tokens || 0);

      res.json({
        clean_text: clean_text.trim(),
        core_meaning: core_meaning.trim(),
        language: language.trim().toLowerCase(),
        textProcessRunCount: nextRunCount,
        last_text_process_at: new Date().toISOString(),
        last_input_tokens: input_tokens,
        last_output_tokens: output_tokens,
        last_total_tokens: total_tokens,
        last_latency_ms: latency_ms,
        cumulative_input_tokens,
        cumulative_output_tokens,
        cumulative_total_tokens,
        estimated_cost: null,
        provenance: {
          provider: "google-gemini-api",
          model: "gemma-4-26b-a4b-it",
          live_model_used: "gemma-4-26b-a4b-it",
          processed_at: new Date().toISOString(),
          latency_ms,
          input_tokens,
          output_tokens,
          total_tokens
        }
      });
    } catch (err: any) {
      console.error("[Text Process Error]", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: err.message || "An unexpected error occurred during text processing.",
        status: 500
      });
    }
  });

  // Script Generation endpoint using Gemma 4 26B with structured JSON output and strict validation
  app.post("/api/generate-scripts", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "NOT_CONFIGURED",
          message: "GEMINI_API_KEY is not configured in environment variables."
        });
      }

      const { cleanText, coreMeaning, language } = req.body;
      if (!cleanText || typeof cleanText !== "string" || cleanText.trim() === "" ||
          !coreMeaning || typeof coreMeaning !== "string" || coreMeaning.trim() === "") {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing or empty cleanText or coreMeaning in request body."
        });
      }

      const startTime = Date.now();
      const ai = new GoogleGenAI({ apiKey });

      const targetLang = (language || "en").trim().toLowerCase();

      const prompt = `You are an elite short-form video scriptwriter. Your job is to convert the following text and core meaning into exactly 3 Short-form Script Variants:
Source Text: "${cleanText}"
Core Meaning: "${coreMeaning}"
Source Language: "${targetLang}"

You must write the scripts in the specified Source Language. If the Source Language is 'th' (Thai), the generated scripts MUST be in Thai. Do NOT translate Thai into English.

Generate EXACTLY three script variants with these visual formatting and delivery requirements:
1. SCRIPT A (DIRECT):
- Purpose: Stay closest to the accepted clean_text/core_meaning. Natural spoken short-form delivery.
- Format: A short, elegant monologue.

2. SCRIPT B (HOOK_FIRST):
- Purpose: Begin with a strong attention hook, then deliver the same accepted core meaning naturally.
- Format: Starts with a high-impact question or statement to stop the scroll.

3. SCRIPT C (PUNCHY):
- Purpose: Shorter, sharper, and highly memorable. Suitable for ultra-fast-paced short-form vertical content.
- Format: Extremely brief, concise, and punchy.

All three variants MUST:
- Preserve the accepted core meaning.
- Not invent factual claims, attribution, or unsupported facts.
- Not include any meta-commentary, bracketed cues, sound effects, or descriptions (like [Sound effect] or [Music plays]). ONLY output the actual words to be spoken.
- Be written natively in the target language (if language is "th", write Thai scripts natively. Do NOT translate).

You MUST return a JSON object matching this schema EXACTLY:
{
  "script_a": {
    "type": "DIRECT",
    "text": "Script A text goes here"
  },
  "script_b": {
    "type": "HOOK_FIRST",
    "text": "Script B text goes here"
  },
  "script_c": {
    "type": "PUNCHY",
    "text": "Script C text goes here"
  }
}

Do NOT include any markdown code fences (like \`\`\`json), preambles, explanation prose, or analysis. Return ONLY the raw JSON.`;

      // Track run counts for script generation
      const nextRunCount = (req.body.scriptProcessRunCount || 0) + 1;
      let textResponse = "";
      let usageMetadata: any = null;

      try {
        try {
          const aiRes = await ai.models.generateContent({
            model: "gemma-4-26b-a4b-it",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              temperature: 0.3
            }
          });
          textResponse = aiRes.text || "";
          usageMetadata = aiRes.usageMetadata;
        } catch (firstErr: any) {
          console.warn("[Gemma Script Structured Call Warning] Retrying without strict json mime-type...", firstErr);
          const aiResFallback = await ai.models.generateContent({
            model: "gemma-4-26b-a4b-it",
            contents: prompt,
            config: {
              temperature: 0.3
            }
          });
          textResponse = aiResFallback.text || "";
          usageMetadata = aiResFallback.usageMetadata;
        }
      } catch (invocationError: any) {
        console.error("[Gemma Script Invocation Error]", invocationError);
        return res.status(502).json({
          error: "PROVIDER_FAILURE",
          message: invocationError.message || "The standard Gemma model invocation for script generation failed.",
          status: 502,
          scriptProcessRunCount: nextRunCount
        });
      }

      let cleanedText = textResponse.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```(json)?\s*/i, "");
        cleanedText = cleanedText.replace(/\s*```$/, "");
      }
      cleanedText = cleanedText.trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleanedText);
      } catch (parseErr: any) {
        console.error("[JSON Script Parse Failure]", cleanedText, parseErr);
        return res.status(422).json({
          error: "MALFORMED_OUTPUT",
          message: "The model did not return a parseable JSON object.",
          rawOutput: textResponse,
          scriptProcessRunCount: nextRunCount
        });
      }

      const script_a = parsed.script_a || parsed.scriptA;
      const script_b = parsed.script_b || parsed.scriptB;
      const script_c = parsed.script_c || parsed.scriptC;

      if (!script_a || typeof script_a !== "object" || typeof script_a.text !== "string" || script_a.text.trim() === "" ||
          !script_b || typeof script_b !== "object" || typeof script_b.text !== "string" || script_b.text.trim() === "" ||
          !script_c || typeof script_c !== "object" || typeof script_c.text !== "string" || script_c.text.trim() === "") {
        return res.status(422).json({
          error: "INVALID_STRUCTURE",
          message: "Model output is missing required script variants or text is empty.",
          parsed,
          scriptProcessRunCount: nextRunCount
        });
      }

      const latency_ms = Date.now() - startTime;
      const input_tokens = usageMetadata?.promptTokenCount || null;
      const output_tokens = usageMetadata?.candidatesTokenCount || null;
      const total_tokens = usageMetadata?.totalTokenCount || null;

      const cumulative_script_input_tokens = (req.body.cumulativeScriptInputTokens || 0) + (input_tokens || 0);
      const cumulative_script_output_tokens = (req.body.cumulativeScriptOutputTokens || 0) + (output_tokens || 0);
      const cumulative_script_total_tokens = (req.body.cumulativeScriptTotalTokens || 0) + (total_tokens || 0);

      res.json({
        script_a: {
          type: "DIRECT",
          text: script_a.text.trim()
        },
        script_b: {
          type: "HOOK_FIRST",
          text: script_b.text.trim()
        },
        script_c: {
          type: "PUNCHY",
          text: script_c.text.trim()
        },
        script_process_run_count: nextRunCount,
        last_script_process_at: new Date().toISOString(),
        last_script_input_tokens: input_tokens,
        last_script_output_tokens: output_tokens,
        last_script_total_tokens: total_tokens,
        last_script_latency_ms: latency_ms,
        cumulative_script_input_tokens,
        cumulative_script_output_tokens,
        cumulative_script_total_tokens,
        script_estimated_cost: null,
        provenance: {
          provider: "google-gemini-api",
          model: "gemma-4-26b-a4b-it",
          live_model_used: "gemma-4-26b-a4b-it",
          processed_at: new Date().toISOString(),
          latency_ms,
          input_tokens,
          output_tokens,
          total_tokens
        }
      });
    } catch (err: any) {
      console.error("[Script Generation Error]", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: err.message || "An unexpected error occurred during script generation.",
        status: 500
      });
    }
  });

  // Stage 5 Voice Generation using Gemini API
  app.post("/api/generate-voice", async (req, res) => {
    let providerAttemptRunCount: number | undefined;
    let providerAttemptStartedAt: string | undefined;
    let preservedCumulativeCharacters: number | undefined;
    let audioDiagnostic: Record<string, unknown> | undefined;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "NOT_CONFIGURED",
          message: "Gemini API Key is not configured in environment variables."
        });
      }

      const { text, language, slot, voiceId, voiceProcessRunCount, cumulativeVoiceCharacters } = req.body;
      if (!text || typeof text !== "string" || text.trim() === "") {
        return res.status(400).json({
          error: "INVALID_INPUT",
          message: "A non-empty string is required for the text parameter."
        });
      }

      if (slot !== "female" && slot !== "male") {
        return res.status(400).json({
          error: "INVALID_INPUT",
          message: "The slot parameter must be either 'female' or 'male'."
        });
      }

      if (voiceId !== "Sulafat" && voiceId !== "Charon") {
        return res.status(400).json({
          error: "INVALID_INPUT",
          message: "The voiceId parameter must be either 'Sulafat' or 'Charon'."
        });
      }

      // An attempt is counted only after validation, immediately before Gemini is invoked.
      providerAttemptRunCount = (voiceProcessRunCount || 0) + 1;
      providerAttemptStartedAt = new Date().toISOString();
      preservedCumulativeCharacters = cumulativeVoiceCharacters || 0;
      const startTime = Date.now();
      const ai = new GoogleGenAI({ apiKey });

      // Build the natural instruction based on language as requested
      let ttsPrompt = text;
      if (language === "th") {
        ttsPrompt = `Please read the following text naturally in native Thai. Ensure natural rhythm and native Thai narration: ${text}`;
      } else {
        ttsPrompt = `Narrate the following text naturally: ${text}`;
      }

      // Invoke gemini-2.5-flash-preview-tts
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: ttsPrompt,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceId }
            }
          }
        }
      });

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Data = inlineData?.data;
      if (!base64Data) {
        throw new Error("No inline audio data returned from the Gemini TTS provider.");
      }

      const providerMimeType = inlineData?.mimeType || null;
      const adapterFallbackMimeType = "audio/L16;codec=pcm;rate=24000";
      const returnedMime = providerMimeType || adapterFallbackMimeType;
      let audioBuffer = Buffer.from(base64Data, "base64");
      const normalizedMime = returnedMime.toLowerCase();
      const mimeType = normalizedMime.split(";", 1)[0].trim();
      const isL16 = mimeType === "audio/l16";
      const isPcm = isL16 || normalizedMime.includes("codec=pcm") || mimeType === "audio/pcm";
      const rateMatch = normalizedMime.match(/(?:^|;)\s*rate=(\d+)(?:;|$)/);
      const channelsMatch = normalizedMime.match(/(?:^|;)\s*channels=(\d+)(?:;|$)/);
      const codecMatch = normalizedMime.match(/(?:^|;)\s*codec=([^;\s]+)(?:;|$)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
      // Gemini's L16 TTS response is mono when channels is omitted.
      const channels = channelsMatch ? parseInt(channelsMatch[1], 10) : 1;
      const isWavContainer = audioBuffer.length >= 12 && audioBuffer.subarray(0, 4).equals(Buffer.from("RIFF")) && audioBuffer.subarray(8, 12).equals(Buffer.from("WAVE"));
      const detectedFormat = isWavContainer ? "wav" : isPcm ? "raw-pcm" : "unknown";

      audioDiagnostic = {
        model: "gemini-2.5-flash-preview-tts",
        slot,
        voiceId,
        providerMimeType,
        adapterFallbackMimeType,
        parsedRate: rateMatch ? sampleRate : null,
        parsedChannels: channelsMatch ? channels : null,
        parsedCodec: codecMatch ? codecMatch[1] : null,
        effectiveRate: sampleRate,
        effectiveChannels: channels,
        detectedFormat,
        decodedByteLength: audioBuffer.length
      };

      if (detectedFormat !== "raw-pcm") {
        throw Object.assign(new Error("Unsupported Gemini audio representation returned by provider."), {
          statusCode: 422,
          errorCode: "UNSUPPORTED_PROVIDER_AUDIO",
          providerMimeType,
          detectedFormat,
          audioDiagnostic
        });
      }

      let finalWavPayloadByteLength: number | null = null;

      if (isPcm) {
        if (!Number.isFinite(sampleRate) || sampleRate <= 0 || !Number.isInteger(channels) || channels <= 0) {
          throw new Error(`Unsupported PCM MIME parameters: ${returnedMime}`);
        }

        if (audioBuffer.length % 2 !== 0) {
          throw new Error("PCM audio data must contain complete 16-bit samples.");
        }

        finalWavPayloadByteLength = audioBuffer.length;

        const wrapPcmInWav = (pcmBuffer: Buffer, sRate: number, channelCount: number): Buffer => {
          const wavHeader = Buffer.alloc(44);
          const dataLength = pcmBuffer.length;
          const blockAlign = channelCount * 2;
          
          wavHeader.write("RIFF", 0);
          wavHeader.writeUInt32LE(36 + dataLength, 4);
          wavHeader.write("WAVE", 8);
          wavHeader.write("fmt ", 12);
          wavHeader.writeUInt32LE(16, 16);
          wavHeader.writeUInt16LE(1, 20); // 1 = PCM
          wavHeader.writeUInt16LE(channelCount, 22);
          wavHeader.writeUInt32LE(sRate, 24);
          wavHeader.writeUInt32LE(sRate * blockAlign, 28);
          wavHeader.writeUInt16LE(blockAlign, 32);
          wavHeader.writeUInt16LE(16, 34); // 16-bit
          wavHeader.write("data", 36);
          wavHeader.writeUInt32LE(dataLength, 40);

          return Buffer.concat([wavHeader, pcmBuffer]);
        };

        audioBuffer = wrapPcmInWav(audioBuffer, sampleRate, channels);
      }

      // Write unique file inside process.cwd()/audio
      const filename = `${slot}_voice_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.wav`;
      const filePath = path.join(audioDir, filename);
      fs.writeFileSync(filePath, audioBuffer);
      const audioUrl = `/audio/${filename}`;

      // Calculate playtime duration of WAV/PCM data exactly
      const rawPcmLength = isPcm ? audioBuffer.length - 44 : audioBuffer.length;
      const durationMs = Math.round((rawPcmLength / (sampleRate * channels * 2)) * 1000);
      const latencyMs = Date.now() - startTime;
      const characterCount = text.length;
      const cumulativeCharacters = preservedCumulativeCharacters + characterCount;

      Object.assign(audioDiagnostic, {
        outputFilename: filename,
        finalWavPayloadByteLength,
        calculatedDurationMs: durationMs
      });
      console.info("[TTS_AUDIO_DIAGNOSTIC]", audioDiagnostic);

      res.json({
        audioUrl,
        durationMs,
        latencyMs,
        characterCount,
        voiceProcessRunCount: providerAttemptRunCount,
        cumulativeVoiceCharacters: cumulativeCharacters,
        lastVoiceProcessAt: new Date().toISOString()
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const errorCode = err.errorCode || "Internal Server Error";
      const diagnostic = err.audioDiagnostic || audioDiagnostic;
      if (diagnostic) {
        console.error("[TTS_AUDIO_DIAGNOSTIC]", {
          ...diagnostic,
          outcome: "rejected",
          errorCode
        });
      }
      console.error("[Voice Generation Error]", err);
      res.status(statusCode).json({
        error: errorCode,
        message: err.message || "An unexpected error occurred during voice generation.",
        status: statusCode,
        providerMimeType: err.providerMimeType ?? diagnostic?.providerMimeType ?? null,
        detectedFormat: err.detectedFormat ?? diagnostic?.detectedFormat ?? null,
        voiceProcessRunCount: providerAttemptRunCount,
        cumulativeVoiceCharacters: preservedCumulativeCharacters,
        lastVoiceProcessAt: providerAttemptStartedAt
      });
    }
  });

  // Stage 6 provider-neutral boundary. A future adapter may read MANUS_API_KEY here on the server only.
  app.post("/api/generate-video", (req, res) => {
    const request = (req.body || {}) as VideoGenerationRequest;
    const entryErrors: string[] = [];
    if (request.jobStatus !== "AUDIO_READY") entryErrors.push("jobStatus must be AUDIO_READY");
    if (typeof request.contentId !== "string" || !request.contentId) entryErrors.push("contentId is required");
    if (typeof request.visualRef !== "string" || !request.visualRef.startsWith("/source/")) entryErrors.push("visualRef must be a server-owned /source/ reference");
    if (typeof request.voiceSourceTextSnapshot !== "string" || !request.voiceSourceTextSnapshot.trim()) entryErrors.push("voiceSourceTextSnapshot is required");
    if (typeof request.language !== "string" || !request.language) entryErrors.push("language is required");
    if (request.femaleAudioStatus !== "GENERATED") entryErrors.push("femaleAudioStatus must be GENERATED");
    if (request.maleAudioStatus !== "GENERATED") entryErrors.push("maleAudioStatus must be GENERATED");
    if (typeof request.femaleAudioRef !== "string" || !request.femaleAudioRef.startsWith("/audio/")) entryErrors.push("femaleAudioRef must be a server-owned /audio/ reference");
    if (typeof request.maleAudioRef !== "string" || !request.maleAudioRef.startsWith("/audio/")) entryErrors.push("maleAudioRef must be a server-owned /audio/ reference");

    if (entryErrors.length) {
      return res.status(400).json({ error: "INVALID_STAGE6_INPUT", message: "Stage 6 entry contract rejected.", details: entryErrors });
    }

    const result: VideoGenerationResult = {
      status: "FAILED",
      provider: "not-configured",
      engine: "not-configured",
      failureCode: "VIDEO_PROVIDER_NOT_CONFIGURED",
      failureMessage: "No Stage 6 video provider adapter is configured. No provider request or video artifact was created."
    };
    return res.status(501).json({ error: result.failureCode, message: result.failureMessage, result });
  });

  // Catch JSON syntax errors from body parser before they propagate to static fallback
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
      console.error("[Body Parser JSON Error]", err);
      return res.status(400).json({
        error: "Invalid JSON",
        message: "The request body could not be parsed as valid JSON."
      });
    }
    next(err);
  });

  // Strict fallback for any unhandled /api/* endpoints to prevent returning the SPA HTML file
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      error: "Not Found",
      message: `API endpoint ${req.method} ${req.path} is not registered.`
    });
  });

  // Mount Vite development middleware in non-production environments
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
