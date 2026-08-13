import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Video,
  FileText,
  Volume2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Check,
  X,
  Sparkles,
  Layers,
  Flame,
  ChevronRight,
  Info,
  Sliders,
  Maximize2,
  UploadCloud,
  Activity
} from "lucide-react";
import { QuoteJob, JobStatus, ScriptVariants } from "./types";
import { initialMockJob } from "./mockData";
import { services } from "./services/pipeline";
import { supabaseService } from "./services/supabaseService";

export default function App() {
  // Main state holding the active job
  const [job, setJob] = useState<QuoteJob>({ ...initialMockJob });

  // Ref tracking the absolute freshest job state to prevent stale asynchronous closures
  const jobRef = useRef<QuoteJob>(job);
  useEffect(() => {
    jobRef.current = job;
  }, [job]);

  // Build 3 Local File Intake & Extraction States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [extractedFrameUrl, setExtractedFrameUrl] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<"IDLE" | "EXTRACTING" | "SUCCESS" | "FAILED">("IDLE");
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Build 4 OCR States
  const [ocrStatus, setOcrStatus] = useState<"IDLE" | "PROCESSING" | "SUCCESS" | "FAILED">("IDLE");
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isVisionConfigured, setIsVisionConfigured] = useState<boolean | null>(null);

  // Build 5 Text Processing States
  const [autoAcceptAiText, setAutoAcceptAiText] = useState<boolean>(false);
  const [textProcessingStatus, setTextProcessingStatus] = useState<"IDLE" | "PROCESSING" | "SUCCESS" | "FAILED">("IDLE");
  const [textProcessingError, setTextProcessingError] = useState<string | null>(null);
  const [aiCandidate, setAiCandidate] = useState<{
    cleanText: string;
    coreMeaning: string;
    language: string;
    provenance?: {
      provider: string;
      model: string;
      live_model_used: string;
      processed_at: string;
      latency_ms: number;
      input_tokens: number | null;
      output_tokens: number | null;
      total_tokens: number | null;
    };
  } | null>(null);

  // Build 6 Stage 4 Script Processing States
  const [autoAcceptAiScript, setAutoAcceptAiScript] = useState<boolean>(false);
  const [scriptProcessingStatus, setScriptProcessingStatus] = useState<"IDLE" | "PROCESSING" | "SUCCESS" | "FAILED">("IDLE");
  const [scriptProcessingError, setScriptProcessingError] = useState<string | null>(null);
  const [scriptCandidates, setScriptCandidates] = useState<{
    scriptA: string;
    scriptB: string;
    scriptC: string;
    provenance?: {
      provider: string;
      model: string;
      live_model_used: string;
      processed_at: string;
      latency_ms: number;
      input_tokens: number | null;
      output_tokens: number | null;
      total_tokens: number | null;
    };
  } | null>(null);

  // Custom simulation and error state variables
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedStageIndex, setSimulatedStageIndex] = useState<number>(-1);
  const [customErrorStage, setCustomErrorStage] = useState<string>("VIDEO_READY");
  const [customErrorMessage, setCustomErrorMessage] = useState<string>("FFmpeg composition failed: Memory allocation exceeded.");
  const [activeTab, setActiveTab] = useState<"workspace" | "pipeline-guide">("workspace");
  const [playingVoice, setPlayingVoice] = useState<"female" | "male" | null>(null);
  const [playingVideo, setPlayingVideo] = useState(false);
  const [videoRenderingProgress, setVideoRenderingProgress] = useState(0);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [showNotification, setShowNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Connection and saving states for Build 2
  const [dbStatus, setDbStatus] = useState<"LOADING" | "CONNECTED" | "ERROR" | "NOT_CONFIGURED">("LOADING");
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Audio simulation refs/state for visual feedback
  const animationFrameId = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [audioWaveform, setAudioWaveform] = useState<number[]>([12, 24, 8, 16, 40, 18, 30, 10]);

  // Auto-notification helper
  const notify = (message: string, type: "success" | "error" | "info" = "info") => {
    setShowNotification({ message, type });
    setTimeout(() => {
      setShowNotification(null);
    }, 4000);
  };

  // Load Q000001 from Supabase on startup
  useEffect(() => {
    async function loadInitialData() {
      // 1. Check Google Cloud Vision configuration status
      try {
        const configRes = await fetch("/api/config-status", {
          credentials: "include"
        });
        
        if (configRes.redirected || (configRes.url && (configRes.url.includes("cookie_check") || configRes.url.includes("aistudio.google.com")))) {
          throw new Error("AI Studio Preview authentication required");
        }

        if (configRes.ok) {
          const configData = await configRes.json();
          setIsVisionConfigured(configData.configured);
        } else {
          setIsVisionConfigured(false);
        }
      } catch (configErr) {
        console.warn("Failed to fetch Google Cloud Vision config status:", configErr);
        setIsVisionConfigured(false);
      }

      // 2. Load Supabase data
      setDbStatus("LOADING");
      try {
        if (!supabaseService.isConfigured()) {
          setDbStatus("NOT_CONFIGURED");
          console.log("Supabase is not configured yet. Operating in local mock offline fallback mode gracefully.");
          return;
        }
        const fetchedJob = await supabaseService.loadJob("Q000001");
        setJob(fetchedJob);
        setDbStatus("CONNECTED");
        setDbErrorMessage(null);
        notify("Job Q000001 successfully loaded from Supabase.", "success");
      } catch (err: any) {
        console.warn("Supabase load warning (graceful fallback):", err);
        setDbStatus("ERROR");
        setDbErrorMessage(err.message || "Could not fetch data from Supabase.");
        // Non-crashing fallback: job state remains initialized to initialMockJob.
        notify(`Operating in Offline/Local Mode: ${err.message || "Connection refused."}`, "error");
      }
    }
    loadInitialData();
  }, []);

  // Dedicated save handler
  const saveJobToDb = async (updatedJob: QuoteJob) => {
    if (!supabaseService.isConfigured()) {
      return; // Do nothing silently in offline mode
    }
    setIsSaving(true);
    try {
      await supabaseService.saveJob(updatedJob);
      setHasUnsavedChanges(false);
      setDbStatus("CONNECTED");
      setDbErrorMessage(null);
      notify("Changes saved to Supabase successfully.", "success");
    } catch (err: any) {
      console.warn("Supabase save warning (handled):", err);
      setDbStatus("ERROR");
      setDbErrorMessage(err.message || "Failed to write to Supabase database.");
      notify(`Database Sync Failed: ${err.message || "Connection lost"}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced auto-save effect for text field changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const delayDebounceFn = setTimeout(() => {
      saveJobToDb(job);
    }, 2000); // 2-second debounce for text edits

    return () => clearTimeout(delayDebounceFn);
  }, [job.cleanText, job.coreMeaning, job.scripts.scriptA, job.scripts.scriptB, job.scripts.scriptC]);

  // Simulated audio waveform movement when playing
  useEffect(() => {
    if (playingVoice) {
      const interval = setInterval(() => {
        setAudioWaveform(Array.from({ length: 12 }, () => Math.floor(Math.random() * 35) + 5));
      }, 120);
      return () => clearInterval(interval);
    } else {
      setAudioWaveform([12, 24, 8, 16, 40, 18, 30, 10, 22, 14, 28, 6]);
    }
  }, [playingVoice]);

  // The 8 visual stages in order as requested
  const pipelineStages = [
    { label: "Source", status: "NEW", desc: "Source Media Intake" },
    { label: "Extract", status: "EXTRACTED", desc: "Frame Extraction" },
    { label: "OCR", status: "OCR_READY", desc: "Text Extraction" },
    { label: "Text", status: "TEXT_READY", desc: "Copywriting & Clean Text" },
    { label: "Scripts", status: "SCRIPT_READY", desc: "3 Short-form Variants" },
    { label: "Voice", status: "AUDIO_READY", desc: "V1 Male & Female Slots" },
    { label: "Video", status: "VIDEO_READY", desc: "9:16 Video Synthesis" },
    { label: "Review", status: "REVIEW", desc: "Human Sign-off" }
  ];

  // Map state to the current step index (0-7)
  const getStageIndex = (status: JobStatus): number => {
    switch (status) {
      case "NEW": return 0;
      case "EXTRACTED": return 1;
      case "OCR_READY": return 2;
      case "TEXT_READY": return 3;
      case "SCRIPT_READY": return 4;
      case "AUDIO_READY": return 5;
      case "VIDEO_READY": return 6;
      case "REVIEW": return 7;
      case "COMPLETED": return 8; // fully completed
      case "FAILED": return -1; // special handling
      default: return 0;
    }
  };

  const currentStageIndex = getStageIndex(job.status);

  // Directly change state (for testing / manual state overrides)
  const setJobStatusDirectly = async (status: JobStatus, failedStage?: string, errorMsg?: string) => {
    let nextJob: QuoteJob | null = null;
    setJob((prev) => {
      const updated = { ...prev, status };
      if (status === "FAILED") {
        updated.failedStage = failedStage || customErrorStage;
        updated.errorMessage = errorMsg || customErrorMessage;
      } else {
        delete updated.failedStage;
        delete updated.errorMessage;
      }
      nextJob = updated;
      return updated;
    });
    notify(`Status switched to ${status}`, "info");

    if (nextJob) {
      await saveJobToDb(nextJob);
    }
  };

  // Interactive step-by-step pipeline execution simulator
  const runNextPipelineStep = async () => {
    if (isSimulating) return;
    setIsSimulating(true);

    try {
      let nextJob: QuoteJob | null = null;

      if (job.status === "NEW") {
        if (selectedFile) {
          setExtractionStatus("EXTRACTING");
          setExtractionError(null);
          try {
            const frameUrl = await extractFrame(selectedFile);
            setExtractedFrameUrl(frameUrl);
            setExtractionStatus("SUCCESS");
            
            setJob((prev) => {
              const next = { 
                ...prev, 
                status: "EXTRACTED" as JobStatus,
                sourceUrl: frameUrl
              };
              delete next.failedStage;
              delete next.errorMessage;
              nextJob = next;
              return next;
            });
            notify("Frame extraction completed successfully from local file.", "success");
          } catch (err: any) {
            const errMsg = err.message || "Extraction failed.";
            setExtractionStatus("FAILED");
            setExtractionError(errMsg);
            
            setJob((prev) => {
              const next = { 
                ...prev, 
                status: "FAILED" as JobStatus,
                failedStage: "Extract",
                errorMessage: errMsg
              };
              nextJob = next;
              return next;
            });
            notify(`Frame extraction failed: ${errMsg}`, "error");
          }
        } else {
          notify("Real source file required. Please select a local image or video file to execute frame extraction.", "error");
          setIsSimulating(false);
          return;
        }
      } else if (job.status === "EXTRACTED") {
        if (selectedFile && extractedFrameUrl) {
          setIsSimulating(false);
          await handleRunOcr();
          return;
        } else {
          notify("OCR requires a real extracted frame. Please select a local file and extract its frame first.", "error");
          setIsSimulating(false);
          return;
        }
      } else if (job.status === "OCR_READY") {
        // Simulating the OCR Clean Text generation
        const ocrData = await services.ocr.extractText(job.sourceUrl);
        setJob((prev) => {
          const next = {
            ...prev,
            rawOcr: ocrData.rawOcr,
            cleanText: ocrData.cleanText,
            status: "TEXT_READY" as JobStatus
          };
          nextJob = next;
          return next;
        });
        notify("Clean Text compiled and formatted.", "success");
      } else if (job.status === "TEXT_READY") {
        // Halt simulator for manual/real Gemma script generation
        setIsSimulating(false);
        notify("Script generation is a real Gemma action in Build 6. Please run Stage 4 Script Generation manually to continue.", "info");
        return;
      } else if (job.status === "SCRIPT_READY") {
        // Halt simulator for manual/real Voice generation foundation in Build 7
        setIsSimulating(false);
        notify("Voice synthesis is in Foundation phase. Please execute Stage 5 Voice generation manually to progress.", "info");
        return;
      } else if (job.status === "AUDIO_READY") {
        // Video ready step
        setJob((prev) => {
          const next = {
            ...prev,
            status: "VIDEO_READY" as JobStatus
          };
          nextJob = next;
          return next;
        });
        notify("Voices are ready. Proceeding to Video compilation.", "success");
      } else if (job.status === "VIDEO_READY") {
        // Video render step
        setIsRenderingVideo(true);
        let prog = 0;
        const interval = setInterval(async () => {
          prog += 10;
          setVideoRenderingProgress(prog);
          if (prog >= 100) {
            clearInterval(interval);
            setIsRenderingVideo(false);
            setVideoRenderingProgress(0);
            let finalJob: QuoteJob | null = null;
            setJob((prev) => {
              const next = {
                ...prev,
                videoStatus: "READY" as const,
                status: "REVIEW" as JobStatus
              };
              finalJob = next;
              return next;
            });
            notify("Vertical video compilation finished! Assigned to human review.", "success");
            if (finalJob) {
              await saveJobToDb(finalJob);
            }
          }
        }, 150);
        return;
      } else if (job.status === "REVIEW") {
        setJob((prev) => {
          const next = { ...prev, status: "COMPLETED" as JobStatus };
          nextJob = next;
          return next;
        });
        notify("Job approved & completed!", "success");
      } else {
        // If completed or failed, reset to beginning
        await resetToInitialMock();
      }

      if (nextJob) {
        await saveJobToDb(nextJob);
      }
    } catch (e: any) {
      const failedJob: QuoteJob = {
        ...job,
        status: "FAILED" as JobStatus,
        failedStage: "AUTOMATED_PIPELINE",
        errorMessage: e.message || "An unexpected pipeline stage failure occurred."
      };
      setJob(failedJob);
      await saveJobToDb(failedJob);
    } finally {
      setIsSimulating(false);
    }
  };

  // Simulate generating final video on the video panel directly
  const handleGenerateVideoDirectly = () => {
    if (isRenderingVideo) return;
    setIsRenderingVideo(true);
    setJob(prev => ({ ...prev, videoStatus: "RENDERING" }));
    let prog = 0;
    const interval = setInterval(async () => {
      prog += 20;
      setVideoRenderingProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        setIsRenderingVideo(false);
        setVideoRenderingProgress(0);
        let finalJob: QuoteJob | null = null;
        setJob((prev) => {
          const next = {
            ...prev,
            videoStatus: "READY" as const,
            status: "REVIEW" as JobStatus
          };
          finalJob = next;
          return next;
        });
        notify("Video composed at 1080x1920 MP4 resolution. Ready for Review.", "success");
        if (finalJob) {
          await saveJobToDb(finalJob);
        }
      }
    }, 200);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = async () => {
    // 1. Revoke active Object URLs when applicable
    if (sourcePreviewUrl) {
      try {
        URL.revokeObjectURL(sourcePreviewUrl);
      } catch (e) {}
    }
    if (extractedFrameUrl) {
      try {
        URL.revokeObjectURL(extractedFrameUrl);
      } catch (e) {}
    }

    // 2. Clear local file objects and preview states
    setSelectedFile(null);
    setSourcePreviewUrl(null);
    setExtractedFrameUrl(null);
    setExtractionStatus("IDLE");
    setExtractionError(null);
    setOcrStatus("IDLE");
    setOcrError(null);

    // 3. Reset job source fields to mock defaults, status to "NEW"
    const resetJob: QuoteJob = {
      ...job,
      sourceFilename: "Q000001_source.mp4",
      sourceType: "video",
      sourceUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
      status: "NEW",
      rawOcr: ""
    };

    delete resetJob.failedStage;
    delete resetJob.errorMessage;

    setJob(resetJob);
    notify("Source file cleared and intake reset to Drag & Drop.", "info");

    // 4. Update the Supabase database with reset metadata
    if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
      await saveJobToDb(resetJob);
    }
  };

  const getOptimizedBase64 = async (blobUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width > height) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            } else {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Could not get 2D canvas context.");
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        // Fallback to raw FileReader base64 reader if image rendering fails
        fetch(blobUrl)
          .then((res) => res.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
          .catch(reject);
      };
      img.src = blobUrl;
    });
  };

  const handleRunOcr = async () => {
    // 1. Verify if a real extracted frame exists
    if (!selectedFile || !extractedFrameUrl) {
      notify("OCR requires a real extracted frame. Please select a local file and extract its frame first.", "error");
      return;
    }

    setOcrStatus("PROCESSING");
    setOcrError(null);

    notify("Starting Google Cloud Vision managed OCR engine (Thai support)...", "info");
    try {
      // Convert Blob URL of extracted frame to optimized base64
      const base64Data = await getOptimizedBase64(extractedFrameUrl);

      const targetUrl = "/api/ocr-vision";
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageBase64: base64Data }),
        credentials: "include"
      });

      if (response.redirected || (response.url && (response.url.includes("cookie_check") || response.url.includes("aistudio.google.com")))) {
        throw new Error("AI Studio Preview authentication required. Please ensure cookies are allowed or reload the application.");
      }

      const contentType = response.headers.get("Content-Type") || "";

      if (!contentType.includes("application/json")) {
        const rawResponseText = await response.text();
        const snippet = rawResponseText.substring(0, 300);
        const diagMsg = `Integration Error: Received non-JSON response from ${targetUrl}.\n` +
                        `HTTP Status: ${response.status} (${response.statusText})\n` +
                        `Content-Type: ${contentType}\n` +
                        `Response Snippet: ${snippet}`;
        throw new Error(diagMsg);
      }

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.message || data.error || `Vision API request failed with status ${response.status}.`;
        throw new Error(errMsg);
      }

      const rawText = data.text || "";

      // Complete and update state
      setOcrStatus("SUCCESS");
      setTextProcessingStatus("IDLE");
      setTextProcessingError(null);
      setAiCandidate(null);

      const updatedJob: QuoteJob = {
        ...job,
        status: "OCR_READY",
        rawOcr: rawText,
        cleanText: "",
        coreMeaning: ""
      };

      // Clear any failed stage fields
      delete updatedJob.failedStage;
      delete updatedJob.errorMessage;

      setJob(updatedJob);
      notify("Google Cloud Vision OCR completed successfully!", "success");

      // Persist to Supabase
      if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
        await saveJobToDb(updatedJob);
      }
    } catch (err: any) {
      const errMsg = err.message || "Failed to parse text with Google Cloud Vision.";
      setOcrStatus("FAILED");
      setOcrError(errMsg);

      const failedJob: QuoteJob = {
        ...job,
        status: "FAILED",
        failedStage: "OCR",
        errorMessage: errMsg
      };
      setJob(failedJob);
      notify(`Google Cloud Vision OCR Failure: ${errMsg}`, "error");

      if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
        await saveJobToDb(failedJob);
      }
    }
  };

  const processSelectedFile = async (file: File) => {
    // 1. Validate file extension or mime type
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);

    if (!isImage && !isVideo) {
      notify("Unsupported file type! Please select an image (.jpg, .jpeg, .png, .webp) or video (.mp4, .mov, .webm).", "error");
      return;
    }

    // 2. Set local selection and preview URL
    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setSourcePreviewUrl(previewUrl);
    setExtractedFrameUrl(null);
    setExtractionStatus("IDLE");
    setExtractionError(null);
    setOcrStatus("IDLE");
    setOcrError(null);
    setTextProcessingStatus("IDLE");
    setTextProcessingError(null);
    setAiCandidate(null);

    const detectedType = isImage ? "image" : "video";

    // 3. Update the job metadata
    const updatedJob: QuoteJob = {
      ...job,
      sourceFilename: file.name,
      sourceType: detectedType,
      status: "NEW", // Reset status to NEW for frame extraction
      sourceUrl: previewUrl, // Temporarily use original preview until extracted
      rawOcr: "", // Clear downstream raw OCR
      cleanText: "", // Clear downstream clean text
      coreMeaning: "" // Clear downstream core meaning
    };
    
    // Clear failure details if resetting
    delete updatedJob.failedStage;
    delete updatedJob.errorMessage;

    setJob(updatedJob);
    notify(`Local ${detectedType} source selected: ${file.name}`, "success");

    // 4. Save metadata to Supabase (Build 2 spec)
    if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
      await saveJobToDb(updatedJob);
    }
  };

  const extractFrame = async (fileToExtract: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const isImage = fileToExtract.type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(fileToExtract.name);
      
      if (isImage) {
        // Image itself becomes the extracted source frame. No transformation.
        resolve(URL.createObjectURL(fileToExtract));
        return;
      }

      // Extract first usable frame of video natively in browser
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      
      const videoUrl = URL.createObjectURL(fileToExtract);
      video.src = videoUrl;

      const cleanUp = () => {
        video.removeAttribute("src");
        video.load();
      };

      video.onloadedmetadata = () => {
        // Seek to 0.0 seconds (use first usable video frame)
        video.currentTime = 0.0;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Could not get 2D canvas context.");
          }
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          
          cleanUp();
          resolve(dataUrl);
        } catch (err: any) {
          cleanUp();
          reject(err);
        }
      };

      video.onerror = () => {
        cleanUp();
        reject(new Error("Failed to load or parse video source file."));
      };

      // Fallback timeout
      setTimeout(() => {
        cleanUp();
        reject(new Error("Timeout during video frame extraction. Ensure the video format is supported."));
      }, 10000);
    });
  };

  const handleExtractFrame = async () => {
    if (!selectedFile) {
      notify("Please select a local source file first.", "error");
      return;
    }

    setExtractionStatus("EXTRACTING");
    setExtractionError(null);
    notify("Extracting representative keyframe...", "info");

    try {
      const frameUrl = await extractFrame(selectedFile);
      setExtractedFrameUrl(frameUrl);
      setExtractionStatus("SUCCESS");
      setOcrStatus("IDLE");
      setOcrError(null);
      setTextProcessingStatus("IDLE");
      setTextProcessingError(null);
      setAiCandidate(null);

      const updatedJob: QuoteJob = {
        ...job,
        status: "EXTRACTED",
        sourceUrl: frameUrl,
        rawOcr: "",
        cleanText: "",
        coreMeaning: ""
      };
      delete updatedJob.failedStage;
      delete updatedJob.errorMessage;

      setJob(updatedJob);
      notify("Keyframe extraction completed successfully!", "success");

      if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
        await saveJobToDb(updatedJob);
      }
    } catch (err: any) {
      const errMsg = err.message || "Failed to extract keyframe natively.";
      setExtractionStatus("FAILED");
      setExtractionError(errMsg);

      const failedJob: QuoteJob = {
        ...job,
        status: "FAILED",
        failedStage: "Extract",
        errorMessage: errMsg
      };
      setJob(failedJob);
      notify(`Extraction failure: ${errMsg}`, "error");

      if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
        await saveJobToDb(failedJob);
      }
    }
  };

  const resetToInitialMock = async () => {
    const defaultJob = { ...initialMockJob };
    setSelectedFile(null);
    setSourcePreviewUrl(null);
    setExtractedFrameUrl(null);
    setExtractionStatus("IDLE");
    setExtractionError(null);
    setOcrStatus("IDLE");
    setOcrError(null);
    setTextProcessingStatus("IDLE");
    setTextProcessingError(null);
    setAiCandidate(null);
    setJob(defaultJob);
    setPlayingVoice(null);
    setPlayingVideo(false);
    notify("Job Q000001 Workspace reset to default demo values.", "info");
    if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
      await saveJobToDb(defaultJob);
    }
  };

  // Helper to invalidate downstream scripts and voice slot states when upstream text changes
  const invalidateScriptsAndDownstream = (prevJob: QuoteJob): QuoteJob => {
    return {
      ...prevJob,
      scripts: {
        scriptA: "",
        scriptB: "",
        scriptC: ""
      },
      voiceSourceTextSnapshot: null,
      femaleVoice: {
        ...prevJob.femaleVoice,
        status: "PENDING",
        audioUrl: undefined,
        audioUrlOrRef: null,
        durationMs: null
      },
      maleVoice: {
        ...prevJob.maleVoice,
        status: "PENDING",
        audioUrl: undefined,
        audioUrlOrRef: null,
        durationMs: null
      },
      status: "TEXT_READY"
    };
  };

  // Update handlers for edited values
  const handleCleanTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScriptCandidates(null);
    setJob((prev) => {
      const invalidated = invalidateScriptsAndDownstream(prev);
      const next = { ...invalidated, cleanText: e.target.value };
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleCoreMeaningChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScriptCandidates(null);
    setJob((prev) => {
      const invalidated = invalidateScriptsAndDownstream(prev);
      const next = { ...invalidated, coreMeaning: e.target.value };
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleRunTextProcessing = async () => {
    // Access freshest state using jobRef to avoid stale closures
    const currentJob = jobRef.current;
    if (!currentJob.rawOcr || currentJob.rawOcr.trim() === "") {
      notify("Text Processing requires non-empty Raw OCR text. Please run OCR first.", "error");
      return;
    }

    setTextProcessingStatus("PROCESSING");
    setTextProcessingError(null);
    setAiCandidate(null);

    notify("Sending Raw OCR to server-side Gemma 4 26B A4B engine...", "info");

    try {
      // Set status to OCR_READY
      setJob((prev) => ({
        ...prev,
        status: "OCR_READY"
      }));

      const response = await fetch("/api/text-process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rawOcrText: currentJob.rawOcr,
          textProcessRunCount: currentJob.textProcessRunCount || 0,
          cumulativeInputTokens: currentJob.cumulativeInputTokens || 0,
          cumulativeOutputTokens: currentJob.cumulativeOutputTokens || 0,
          cumulativeTotalTokens: currentJob.cumulativeTotalTokens || 0
        }),
        credentials: "include"
      });

      if (response.redirected || (response.url && (response.url.includes("cookie_check") || response.url.includes("aistudio.google.com")))) {
        throw new Error("AI Studio Preview authentication required. Please ensure cookies are allowed or reload the application.");
      }

      const contentType = response.headers.get("Content-Type") || "";
      if (!contentType.includes("application/json")) {
        const rawResText = await response.text();
        const snippet = rawResText.substring(0, 300);
        throw new Error(`Received non-JSON response from server.\nHTTP Status: ${response.status}\nSnippet: ${snippet}`);
      }

      const data = await response.json();
      if (!response.ok) {
        // If there's an invocation run count in the error response, we must increment and save it!
        let finalRunCount = jobRef.current.textProcessRunCount;
        if (data && typeof data.textProcessRunCount === "number") {
          finalRunCount = data.textProcessRunCount;
        }

        const failedJob: QuoteJob = {
          ...jobRef.current,
          status: "FAILED",
          failedStage: "TEXT",
          errorMessage: data.message || data.error || `Server responded with status ${response.status}`,
          textProcessRunCount: finalRunCount
        };

        setJob(failedJob);
        if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
          await saveJobToDb(failedJob);
        }

        throw new Error(data.message || data.error || `Server responded with status ${response.status}`);
      }

      const { clean_text, core_meaning, language, provenance } = data;

      if (!clean_text || !core_meaning || !language) {
        throw new Error("Invalid structure returned from the Text Processing API.");
      }

      setTextProcessingStatus("SUCCESS");

      const candidateData = {
        cleanText: clean_text,
        coreMeaning: core_meaning,
        language,
        provenance
      };

      setAiCandidate(candidateData);

      // Fetch freshest current job reference before updating
      const freshJob = jobRef.current;

      if (autoAcceptAiText) {
        setScriptCandidates(null);
        const invalidatedJob = invalidateScriptsAndDownstream(freshJob);
        const updatedJob: QuoteJob = {
          ...invalidatedJob,
          status: "TEXT_READY",
          cleanText: clean_text,
          coreMeaning: core_meaning,
          language: language,
          textProcessRunCount: data.textProcessRunCount ?? ((freshJob.textProcessRunCount || 0) + 1),
          lastTextProcessAt: data.last_text_process_at || new Date().toISOString(),
          lastInputTokens: data.last_input_tokens,
          lastOutputTokens: data.last_output_tokens,
          lastTotalTokens: data.last_total_tokens,
          lastLatencyMs: data.last_latency_ms,
          cumulativeInputTokens: data.cumulative_input_tokens ?? (freshJob.cumulativeInputTokens || 0),
          cumulativeOutputTokens: data.cumulative_output_tokens ?? (freshJob.cumulativeOutputTokens || 0),
          cumulativeTotalTokens: data.cumulative_total_tokens ?? (freshJob.cumulativeTotalTokens || 0),
          estimatedCost: data.estimated_cost || null
        };
        delete updatedJob.failedStage;
        delete updatedJob.errorMessage;

        setJob(updatedJob);
        notify("Gemma Text Processing succeeded & auto-accepted!", "success");

        if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
          await saveJobToDb(updatedJob);
        }
      } else {
        const updatedJob: QuoteJob = {
          ...freshJob,
          status: "OCR_READY",
          textProcessRunCount: data.textProcessRunCount ?? ((freshJob.textProcessRunCount || 0) + 1),
          lastTextProcessAt: data.last_text_process_at || new Date().toISOString(),
          lastInputTokens: data.last_input_tokens,
          lastOutputTokens: data.last_output_tokens,
          lastTotalTokens: data.last_total_tokens,
          lastLatencyMs: data.last_latency_ms,
          cumulativeInputTokens: data.cumulative_input_tokens ?? (freshJob.cumulativeInputTokens || 0),
          cumulativeOutputTokens: data.cumulative_output_tokens ?? (freshJob.cumulativeOutputTokens || 0),
          cumulativeTotalTokens: data.cumulative_total_tokens ?? (freshJob.cumulativeTotalTokens || 0),
          estimatedCost: data.estimated_cost || null
        };
        setJob(updatedJob);
        notify("Gemma processed text successfully! Awaiting your manual approval.", "success");

        if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
          await saveJobToDb(updatedJob);
        }
      }

    } catch (err: any) {
      const errMsg = err.message || "Failed to process text using Gemma 4.";
      setTextProcessingStatus("FAILED");
      setTextProcessingError(errMsg);

      // Only set to FAILED if not already set by response.ok handler above
      const current = jobRef.current;
      if (current.status !== "FAILED") {
        const failedJob: QuoteJob = {
          ...current,
          status: "FAILED",
          failedStage: "TEXT",
          errorMessage: errMsg
        };
        setJob(failedJob);
        notify(`Text Processing Failure: ${errMsg}`, "error");

        if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
          await saveJobToDb(failedJob);
        }
      } else {
        notify(`Text Processing Failure: ${errMsg}`, "error");
      }
    }
  };

  const handleAcceptAiText = async () => {
    if (!aiCandidate) {
      notify("No AI text candidate to accept.", "error");
      return;
    }

    setScriptCandidates(null);
    const invalidatedJob = invalidateScriptsAndDownstream(jobRef.current);
    const updatedJob: QuoteJob = {
      ...invalidatedJob,
      status: "TEXT_READY",
      cleanText: aiCandidate.cleanText,
      coreMeaning: aiCandidate.coreMeaning,
      language: aiCandidate.language
    };
    delete updatedJob.failedStage;
    delete updatedJob.errorMessage;

    setJob(updatedJob);
    notify("AI Text Candidate accepted & synced to canonical fields successfully!", "success");

    if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
      await saveJobToDb(updatedJob);
    }
  };

  const handleRunScriptGeneration = async () => {
    const currentJob = jobRef.current;
    if (!currentJob.cleanText || currentJob.cleanText.trim() === "" ||
        !currentJob.coreMeaning || currentJob.coreMeaning.trim() === "") {
      notify("Script Generation requires non-empty accepted clean text and core meaning. Please complete text processing first.", "error");
      return;
    }

    setScriptProcessingStatus("PROCESSING");
    setScriptProcessingError(null);
    setScriptCandidates(null);

    notify("Sending accepted content to server-side Script Generation engine...", "info");

    try {
      const response = await fetch("/api/generate-scripts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cleanText: currentJob.cleanText,
          coreMeaning: currentJob.coreMeaning,
          language: currentJob.language || "en",
          scriptProcessRunCount: currentJob.scriptProcessRunCount || 0,
          cumulativeScriptInputTokens: currentJob.cumulativeScriptInputTokens || 0,
          cumulativeScriptOutputTokens: currentJob.cumulativeScriptOutputTokens || 0,
          cumulativeScriptTotalTokens: currentJob.cumulativeScriptTotalTokens || 0
        }),
        credentials: "include"
      });

      if (response.redirected || (response.url && (response.url.includes("cookie_check") || response.url.includes("aistudio.google.com")))) {
        throw new Error("AI Studio Preview authentication required. Please ensure cookies are allowed or reload the application.");
      }

      const contentType = response.headers.get("Content-Type") || "";
      if (!contentType.includes("application/json")) {
        const rawResText = await response.text();
        const snippet = rawResText.substring(0, 300);
        throw new Error(`Received non-JSON response from server.\nHTTP Status: ${response.status}\nSnippet: ${snippet}`);
      }

      const data = await response.json();
      if (!response.ok) {
        let finalRunCount = jobRef.current.scriptProcessRunCount;
        if (data && typeof data.scriptProcessRunCount === "number") {
          finalRunCount = data.scriptProcessRunCount;
        }

        const failedJob: QuoteJob = {
          ...jobRef.current,
          status: "FAILED",
          failedStage: "SCRIPT",
          errorMessage: data.message || data.error || `Server responded with status ${response.status}`,
          scriptProcessRunCount: finalRunCount
        };

        setJob(failedJob);
        if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
          await saveJobToDb(failedJob);
        }

        throw new Error(data.message || data.error || `Server responded with status ${response.status}`);
      }

      const { script_a, script_b, script_c } = data;

      if (!script_a || !script_b || !script_c) {
        throw new Error("Invalid structure returned from the Script Generation API.");
      }

      setScriptProcessingStatus("SUCCESS");

      const candidateData = {
        scriptA: script_a.text,
        scriptB: script_b.text,
        scriptC: script_c.text,
        provenance: data.provenance
      };

      const freshJob = jobRef.current;

      if (autoAcceptAiScript) {
        const updatedJob: QuoteJob = {
          ...freshJob,
          status: "SCRIPT_READY",
          scripts: {
            scriptA: script_a.text,
            scriptB: script_b.text,
            scriptC: script_c.text
          },
          femaleVoice: {
            ...freshJob.femaleVoice,
            status: "PENDING",
            audioUrl: undefined
          },
          maleVoice: {
            ...freshJob.maleVoice,
            status: "PENDING",
            audioUrl: undefined
          },
          scriptProcessRunCount: data.script_process_run_count ?? ((freshJob.scriptProcessRunCount || 0) + 1),
          lastScriptProcessAt: data.last_script_process_at || new Date().toISOString(),
          lastScriptInputTokens: data.last_script_input_tokens,
          lastScriptOutputTokens: data.last_script_output_tokens,
          lastScriptTotalTokens: data.last_script_total_tokens,
          lastScriptLatencyMs: data.last_script_latency_ms,
          cumulativeScriptInputTokens: data.cumulative_script_input_tokens ?? (freshJob.cumulativeScriptInputTokens || 0),
          cumulativeScriptOutputTokens: data.cumulative_script_output_tokens ?? (freshJob.cumulativeScriptOutputTokens || 0),
          cumulativeScriptTotalTokens: data.cumulative_script_total_tokens ?? (freshJob.cumulativeScriptTotalTokens || 0),
          scriptEstimatedCost: data.script_estimated_cost || null
        };
        delete updatedJob.failedStage;
        delete updatedJob.errorMessage;

        setJob(updatedJob);
        notify("Gemma Script Generation succeeded & auto-accepted!", "success");

        if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
          await saveJobToDb(updatedJob);
        }
      } else {
        setScriptCandidates(candidateData);
        const updatedJob: QuoteJob = {
          ...freshJob,
          scriptProcessRunCount: data.script_process_run_count ?? ((freshJob.scriptProcessRunCount || 0) + 1),
          lastScriptProcessAt: data.last_script_process_at || new Date().toISOString(),
          lastScriptInputTokens: data.last_script_input_tokens,
          lastScriptOutputTokens: data.last_script_output_tokens,
          lastScriptTotalTokens: data.last_script_total_tokens,
          lastScriptLatencyMs: data.last_script_latency_ms,
          cumulativeScriptInputTokens: data.cumulative_script_input_tokens ?? (freshJob.cumulativeScriptInputTokens || 0),
          cumulativeScriptOutputTokens: data.cumulative_script_output_tokens ?? (freshJob.cumulativeScriptOutputTokens || 0),
          cumulativeScriptTotalTokens: data.cumulative_script_total_tokens ?? (freshJob.cumulativeScriptTotalTokens || 0),
          scriptEstimatedCost: data.script_estimated_cost || null
        };
        setJob(updatedJob);
        notify("Gemma generated scripts successfully! Awaiting manual approval.", "success");

        if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
          await saveJobToDb(updatedJob);
        }
      }

    } catch (err: any) {
      const errMsg = err.message || "Failed to generate scripts.";
      setScriptProcessingStatus("FAILED");
      setScriptProcessingError(errMsg);

      const current = jobRef.current;
      if (current.status !== "FAILED") {
        const failedJob: QuoteJob = {
          ...current,
          status: "FAILED",
          failedStage: "SCRIPT",
          errorMessage: errMsg
        };
        setJob(failedJob);
        notify(`Script Generation Failure: ${errMsg}`, "error");

        if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
          await saveJobToDb(failedJob);
        }
      } else {
        notify(`Script Generation Failure: ${errMsg}`, "error");
      }
    }
  };

  const handleAcceptAiScripts = async () => {
    if (!scriptCandidates) {
      notify("No AI script candidates to accept.", "error");
      return;
    }

    const freshJob = jobRef.current;
    const updatedJob: QuoteJob = {
      ...freshJob,
      status: "SCRIPT_READY",
      scripts: {
        scriptA: scriptCandidates.scriptA,
        scriptB: scriptCandidates.scriptB,
        scriptC: scriptCandidates.scriptC
      },
      femaleVoice: {
        ...freshJob.femaleVoice,
        status: "PENDING",
        audioUrl: undefined
      },
      maleVoice: {
        ...freshJob.maleVoice,
        status: "PENDING",
        audioUrl: undefined
      }
    };
    delete updatedJob.failedStage;
    delete updatedJob.errorMessage;

    setJob(updatedJob);
    setScriptCandidates(null);
    notify("AI Script Candidates accepted & synced to canonical fields successfully!", "success");

    if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
      await saveJobToDb(updatedJob);
    }
  };

  const handleScriptChange = (variant: "scriptA" | "scriptB" | "scriptC", text: string) => {
    setJob((prev) => {
      const isCurrentlySelected = 
        (variant === "scriptA" && prev.voiceSourceType === "SCRIPT_A") ||
        (variant === "scriptB" && prev.voiceSourceType === "SCRIPT_B") ||
        (variant === "scriptC" && prev.voiceSourceType === "SCRIPT_C");

      const next = {
        ...prev,
        scripts: {
          ...prev.scripts,
          [variant]: text
        },
        voiceSourceTextSnapshot: isCurrentlySelected ? text : prev.voiceSourceTextSnapshot,
        femaleVoice: {
          ...prev.femaleVoice,
          status: "PENDING" as const,
          audioUrl: undefined,
          audioUrlOrRef: null,
          durationMs: null
        },
        maleVoice: {
          ...prev.maleVoice,
          status: "PENDING" as const,
          audioUrl: undefined,
          audioUrlOrRef: null,
          durationMs: null
        }
      };
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleVoiceSourceChange = async (sourceType: "SCRIPT_A" | "SCRIPT_B" | "SCRIPT_C" | "CLEAN_TEXT") => {
    setJob((prev) => {
      let sourceText = "";
      if (sourceType === "SCRIPT_A") sourceText = prev.scripts.scriptA;
      else if (sourceType === "SCRIPT_B") sourceText = prev.scripts.scriptB;
      else if (sourceType === "SCRIPT_C") sourceText = prev.scripts.scriptC;
      else if (sourceType === "CLEAN_TEXT") sourceText = prev.cleanText;

      const next: QuoteJob = {
        ...prev,
        voiceSourceType: sourceType,
        voiceSourceTextSnapshot: sourceText,
        femaleVoice: {
          ...prev.femaleVoice,
          status: "PENDING" as const,
          audioUrl: undefined,
          audioUrlOrRef: null,
          durationMs: null
        },
        maleVoice: {
          ...prev.maleVoice,
          status: "PENDING" as const,
          audioUrl: undefined,
          audioUrlOrRef: null,
          durationMs: null
        }
      };
      setHasUnsavedChanges(true);

      if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
        saveJobToDb(next);
      }

      return next;
    });
    notify(`Voice over source changed to ${sourceType.replace("_", " ")}. Generated voice tracks are reset.`, "info");
  };

  // Toggle voice audio simulator play
  const togglePlayVoice = (voice: "female" | "male") => {
    if (playingVoice === voice) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setPlayingVoice(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }

      const voiceData = voice === "female" ? job.femaleVoice : job.maleVoice;
      if (!voiceData.audioUrlOrRef) {
        notify("No generated audio track found for preview.", "error");
        return;
      }

      setPlayingVoice(voice);
      setPlayingVideo(false);

      const audio = new Audio(voiceData.audioUrlOrRef);
      audioPlayerRef.current = audio;
      audio.play().catch((err) => {
        console.error("Audio playback failed:", err);
        notify("Failed to play preview audio track.", "error");
        setPlayingVoice(null);
      });

      audio.onended = () => {
        setPlayingVoice(null);
        audioPlayerRef.current = null;
      };
    }
  };

  const handleSynthesize = async (slot: "female" | "male") => {
    const freshJob = jobRef.current;
    if (freshJob.status !== "SCRIPT_READY" && freshJob.status !== "AUDIO_READY") {
      notify("Synthesis requires the job status to be SCRIPT_READY.", "error");
      return;
    }

    // Keep provider IDs canonical even when a persisted legacy display ID is loaded.
    const voiceId = slot === "female" ? "Sulafat" : "Charon";
    
    let text = "";
    if (freshJob.voiceSourceType === "SCRIPT_A") text = freshJob.scripts.scriptA;
    else if (freshJob.voiceSourceType === "SCRIPT_B") text = freshJob.scripts.scriptB;
    else if (freshJob.voiceSourceType === "SCRIPT_C") text = freshJob.scripts.scriptC;
    else if (freshJob.voiceSourceType === "CLEAN_TEXT") text = freshJob.cleanText;

    if (!text || text.trim() === "") {
      notify(`Selected voice source text (${freshJob.voiceSourceType || "default"}) is empty. Cannot synthesize.`, "error");
      return;
    }

    const textSnapshot = text;

    setJob((prev) => {
      const updated = { ...prev };
      if (slot === "female") {
        updated.femaleVoice = { ...updated.femaleVoice, status: "PROCESSING" };
      } else {
        updated.maleVoice = { ...updated.maleVoice, status: "PROCESSING" };
      }
      return updated;
    });

    try {
      notify(`Synthesizing ${slot} voice with Gemini TTS...`, "info");
      
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          language: freshJob.language || "en",
          slot,
          voiceId,
          voiceProcessRunCount: freshJob.voiceProcessRunCount,
          cumulativeVoiceCharacters: freshJob.cumulativeVoiceCharacters
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const providerError = new Error(errorData.message || `Server returned status ${response.status}`) as Error & {
          voiceProcessRunCount?: number;
          cumulativeVoiceCharacters?: number;
          lastVoiceProcessAt?: string;
        };
        providerError.voiceProcessRunCount = errorData.voiceProcessRunCount;
        providerError.cumulativeVoiceCharacters = errorData.cumulativeVoiceCharacters;
        providerError.lastVoiceProcessAt = errorData.lastVoiceProcessAt;
        throw providerError;
      }

      const data = await response.json();

      setJob((prev) => {
        const nextJob = { ...prev };
        
        if (slot === "female") {
          nextJob.femaleVoice = {
            ...nextJob.femaleVoice,
            voiceId,
            status: "GENERATED",
            audioUrlOrRef: data.audioUrl,
            audioUrl: data.audioUrl,
            durationMs: data.durationMs,
            duration: `${Math.floor(data.durationMs / 1000)}s`
          };
        } else {
          nextJob.maleVoice = {
            ...nextJob.maleVoice,
            voiceId,
            status: "GENERATED",
            audioUrlOrRef: data.audioUrl,
            audioUrl: data.audioUrl,
            durationMs: data.durationMs,
            duration: `${Math.floor(data.durationMs / 1000)}s`
          };
        }

        nextJob.voiceSourceTextSnapshot = textSnapshot;
        nextJob.voiceSourceType = prev.voiceSourceType || "SCRIPT_A";
        nextJob.voiceProvider = "google-gemini-api";
        nextJob.voiceEngine = "gemini-2.5-flash-preview-tts";

        nextJob.voiceProcessRunCount = data.voiceProcessRunCount;
        nextJob.lastVoiceProcessAt = data.lastVoiceProcessAt;
        nextJob.lastVoiceLatencyMs = data.latencyMs;
        nextJob.cumulativeVoiceCharacters = data.cumulativeVoiceCharacters;
        
        nextJob.voiceEstimatedCost = null;

        if (nextJob.femaleVoice.status === "GENERATED" && nextJob.maleVoice.status === "GENERATED") {
          nextJob.status = "AUDIO_READY";
        } else {
          nextJob.status = "SCRIPT_READY";
        }

        notify(`Synthesized ${slot} track successfully!`, "success");

        if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
          saveJobToDb(nextJob);
        }

        return nextJob;
      });

    } catch (err: any) {
      const errMsg = err.message || `Failed to synthesize ${slot} voice track.`;
      notify(`Synthesis Error: ${errMsg}`, "error");

      setJob((prev) => {
        const nextJob = { ...prev };
        if (slot === "female") {
          nextJob.femaleVoice = { ...nextJob.femaleVoice, status: "FAILED" };
        } else {
          nextJob.maleVoice = { ...nextJob.maleVoice, status: "FAILED" };
        }

        if (typeof err.voiceProcessRunCount === "number") {
          nextJob.voiceProcessRunCount = err.voiceProcessRunCount;
          nextJob.lastVoiceProcessAt = err.lastVoiceProcessAt || nextJob.lastVoiceProcessAt;
        }
        if (typeof err.cumulativeVoiceCharacters === "number") {
          nextJob.cumulativeVoiceCharacters = err.cumulativeVoiceCharacters;
        }
        nextJob.voiceEstimatedCost = null;

        if (supabaseService.isConfigured() && dbStatus === "CONNECTED") {
          saveJobToDb(nextJob);
        }

        return nextJob;
      });
    }
  };

  // Review Actions
  const handleApprove = async () => {
    const updatedJob: QuoteJob = { ...job, status: "COMPLETED" };
    setJob(updatedJob);
    notify("Job Q000001 status set to COMPLETED. Ready for publication.", "success");
    await saveJobToDb(updatedJob);
  };

  const handleReject = async () => {
    const updatedJob: QuoteJob = {
      ...job,
      status: "FAILED",
      failedStage: "Human Review",
      errorMessage: "Content was rejected by the supervisor: Pronunciation or styling requires adjustments."
    };
    setJob(updatedJob);
    notify("Job Q000001 was rejected. Status changed to FAILED.", "error");
    await saveJobToDb(updatedJob);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Top Professional Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  V1.0 — Build 2
                </span>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                TomTomLife-Quote-Factory
              </h1>
            </div>
          </div>

          {/* Quick Actions, Database Status & Job Quick Stats */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            
            {/* Database Connection State Badge */}
            {dbStatus === "LOADING" && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 text-xs font-semibold animate-pulse" id="db-loading-badge">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                <span>Connecting DB...</span>
              </div>
            )}
            {dbStatus === "CONNECTED" && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 text-xs font-semibold" id="db-connected-badge">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>Supabase Connected</span>
                {hasUnsavedChanges && (
                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded animate-pulse ml-1 font-mono">
                    {isSaving ? "Saving..." : "Unsaved"}
                  </span>
                )}
              </div>
            )}
            {dbStatus === "ERROR" && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 text-xs font-semibold cursor-help" id="db-disconnected-badge" title={dbErrorMessage || "Could not connect to database"}>
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <span>DB Offline (Fallback)</span>
              </div>
            )}
            {dbStatus === "NOT_CONFIGURED" && (
              <div className="bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 text-xs font-semibold cursor-help" id="db-not-configured-badge" title="Supabase client is not configured. Connect your database to enable cloud persistence.">
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                <span>DB Offline (Demo)</span>
              </div>
            )}

            {/* Manual Save Button */}
            {dbStatus === "CONNECTED" && hasUnsavedChanges && (
              <button
                onClick={() => saveJobToDb(job)}
                disabled={isSaving}
                className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                id="btn-save-db"
              >
                <span>{isSaving ? "Saving..." : "Save Now"}</span>
              </button>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center space-x-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Active Job:</span>
              <span className="bg-white px-2 py-0.5 rounded font-mono text-xs border border-slate-200 text-blue-600">
                {job.contentId}
              </span>
            </div>

            <button
              onClick={resetToInitialMock}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              title="Reset workspace to default demo values"
              id="btn-reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Mock</span>
            </button>

            <button
              onClick={runNextPipelineStep}
              disabled={isSimulating || isRenderingVideo}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 text-white transition cursor-pointer ${
                isSimulating || isRenderingVideo
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
              }`}
              id="btn-simulate-pipeline"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isSimulating ? "animate-spin" : ""}`} />
              <span>
                {isSimulating
                  ? "Processing..."
                  : job.status === "COMPLETED" || job.status === "FAILED"
                  ? "Restart Simulator"
                  : "Simulate Next Stage"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Visual Pipeline Progress - Ordered Exactly: Source -> Extract -> OCR -> Text -> Scripts -> Voice -> Video -> Review */}
      <section className="bg-white border-b border-slate-200 py-5 px-4" id="pipeline-progress-section">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Production Pipeline Progress Indicator
              </h2>
            </div>
            <div className="text-[11px] text-slate-500">
              Pipeline Status:{" "}
              <span className="font-mono text-blue-600 font-bold">{job.status}</span>
            </div>
          </div>

          {/* Interactive Steps Visual Indicator */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {pipelineStages.map((stage, idx) => {
              const isCompleted = idx < currentStageIndex;
              const isActive = idx === currentStageIndex;
              const isFailed = job.status === "FAILED" && job.failedStage === stage.label;

              let bgClass = "bg-slate-50/50 border-slate-200 text-slate-400";
              let badgeClass = "bg-slate-100 text-slate-400";

              if (isFailed) {
                bgClass = "bg-rose-50 border-rose-200 text-rose-700";
                badgeClass = "bg-rose-600 text-white";
              } else if (isActive) {
                bgClass = "bg-blue-50 border-blue-200 text-blue-800 ring-1 ring-blue-500";
                badgeClass = "bg-blue-600 text-white";
              } else if (isCompleted) {
                bgClass = "bg-emerald-50/50 border-emerald-200 text-emerald-800";
                badgeClass = "bg-emerald-600 text-white";
              }

              return (
                <div
                  key={stage.label}
                  className={`border rounded-xl p-3 flex flex-col justify-between transition-all duration-200 ${bgClass}`}
                  id={`stage-card-${stage.label.toLowerCase()}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Stage {idx + 1}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${badgeClass}`}>
                      {isFailed ? "FAIL" : isActive ? "ACTIVE" : isCompleted ? "DONE" : "WAIT"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xs leading-tight text-slate-900 mb-0.5">{stage.label}</h3>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{stage.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status Details / Errors Display */}
          {job.status === "FAILED" && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 animate-fade-in" id="error-alert-banner">
              <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-rose-900 uppercase tracking-wider">Pipeline Execution Halted</h4>
                <p className="text-xs mt-0.5">
                  <span className="font-semibold text-rose-800">Failed Stage:</span> {job.failedStage || "Unknown"}
                </p>
                <p className="text-xs mt-1 bg-white p-2.5 rounded border border-rose-200/60 font-mono text-rose-700">
                  Error Message: {job.errorMessage || "No additional logs registered."}
                </p>
              </div>
            </div>
          )}

          {job.status === "COMPLETED" && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800 animate-fade-in" id="completion-banner">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-wider">Job Finished Successfully</h4>
                <p className="text-xs mt-0.5">Quote content package is ready for syndication to TikTok, Instagram Reels, and YouTube Shorts.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        
        {/* Database connection failure banner */}
        {dbStatus === "ERROR" && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 mb-6 flex items-start space-x-3.5 text-rose-900 animate-fade-in" id="db-error-alert-banner">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-2 w-full">
              <h4 className="font-bold text-xs text-rose-950 uppercase tracking-wider">Supabase Schema / Connection Setup Required</h4>
              <p className="text-xs text-rose-800 leading-relaxed">
                A database connection was successfully established, but a database schema or table missing error was detected. To enable cloud persistence, you must provision the target table in your Supabase project.
              </p>
              
              <div className="text-[11px] font-mono bg-white border border-rose-200/50 p-3 rounded-lg mt-2 text-slate-600 space-y-2">
                <div>
                  <p className="font-bold text-rose-700">Database Message Details:</p>
                  <p className="whitespace-pre-wrap">{dbErrorMessage || "Could not connect to database."}</p>
                </div>
                
                {dbErrorMessage && dbErrorMessage.includes("quote_jobs") && (
                  <div className="border-t border-slate-100 pt-2.5 mt-2 space-y-2">
                    <p className="font-bold text-blue-700 uppercase text-[10px] tracking-wider">Required Table Setup SQL Statement:</p>
                    <p className="text-slate-400 mb-1.5 text-[10px]">Copy and paste the statement below into your Supabase SQL Editor:</p>
                    <pre className="bg-slate-950 text-slate-200 p-3 rounded-md overflow-x-auto text-[10px] leading-normal whitespace-pre">
{`CREATE TABLE IF NOT EXISTS quote_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id VARCHAR(50) UNIQUE NOT NULL,
  source_filename TEXT NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  raw_ocr_text TEXT NOT NULL,
  clean_text TEXT NOT NULL,
  core_meaning TEXT NOT NULL,
  script_a TEXT NOT NULL,
  script_b TEXT NOT NULL,
  script_c TEXT NOT NULL,
  female_voice_id VARCHAR(100) NOT NULL,
  male_voice_id VARCHAR(100) NOT NULL,
  workflow_status VARCHAR(50) NOT NULL,
  failed_stage VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE quote_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read and write access for development" 
ON quote_jobs FOR ALL USING (true) WITH CHECK (true);`}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Warning Notification */}
        {showNotification && (
          <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg border flex items-center space-x-3 transition-all duration-300 transform translate-y-0 ${
            showNotification.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : showNotification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`} id="toast-notification">
            {showNotification.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
            {showNotification.type === "error" && <XCircle className="h-5 w-5 text-rose-500 shrink-0" />}
            {showNotification.type === "info" && <Info className="h-5 w-5 text-blue-500 shrink-0" />}
            <p className="text-sm font-medium">{showNotification.message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT 2 COLUMNS: Work Areas for Pipeline Sections */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Section 1: SOURCE */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" id="section-source">
              <div className="border-b border-slate-200/60 bg-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold">1</span>
                  <h3 className="font-black text-slate-400 tracking-widest text-[10px] uppercase">SOURCE MEDIA INTAKE</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">ID: {job.contentId}</span>
              </div>
              
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Local File Upload & Metadata */}
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Local Media Selection</span>
                      
                      {!selectedFile ? (
                        <div 
                          className="border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 bg-slate-50/40 hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center cursor-pointer relative group"
                          id="file-drop-area"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleFileDrop}
                          onClick={() => document.getElementById("file-input-id")?.click()}
                        >
                          <input 
                            type="file" 
                            id="file-input-id" 
                            className="hidden" 
                            accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm" 
                            onChange={handleFileSelect} 
                          />
                          <UploadCloud className="h-7 w-7 text-slate-400 group-hover:text-blue-500 transition mb-2" />
                          <p className="text-xs font-bold text-slate-700">Drag & drop or browse</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Images (.jpg, .png, .webp) or Videos (.mp4, .mov, .webm)</p>
                        </div>
                      ) : (
                        <div className="bg-slate-50/80 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono font-bold text-slate-800 truncate" title={selectedFile.name}>
                              {selectedFile.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {job.sourceType.toUpperCase()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => document.getElementById("file-input-id")?.click()}
                              className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2.5 py-1.5 transition cursor-pointer"
                            >
                              Change File
                            </button>
                            <button
                              onClick={handleClearFile}
                              className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded px-2.5 py-1.5 transition cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                          <input 
                            type="file" 
                            id="file-input-id" 
                            className="hidden" 
                            accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm" 
                            onChange={handleFileSelect} 
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Source Filename</span>
                        <p className="text-slate-800 font-mono text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80 break-all select-all font-bold">
                          {job.sourceFilename}
                        </p>
                      </div>

                      <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Source Type</span>
                        <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase font-mono tracking-wider">
                          {job.sourceType}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Current Workflow Status</span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                        job.status === "COMPLETED" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : job.status === "FAILED"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                      }`}>
                        {job.status}
                      </span>
                    </div>

                    <div className="pt-1">
                      <div className="p-3 bg-blue-50/40 border border-blue-100/60 rounded-xl text-xs text-blue-900 leading-relaxed">
                        <p className="font-bold flex items-center gap-1.5 text-blue-950 mb-0.5">
                          <Info className="h-3.5 w-3.5 shrink-0" />
                          About this Intake Media
                        </p>
                        Providing high-quality keynote clips or slides allows TomTomLife to extract perfect keyframes for short-form quote overlay compositions.
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Media Preview */}
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Local Media Source Preview</span>
                    <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
                      {selectedFile && sourcePreviewUrl ? (
                        job.sourceType === "image" ? (
                          <img 
                            src={sourcePreviewUrl} 
                            alt="Local image source preview" 
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <video 
                            src={sourcePreviewUrl} 
                            controls 
                            className="w-full h-full object-contain"
                          />
                        )
                      ) : (
                        /* Default mock fallback preview */
                        <>
                          <img 
                            src={job.sourceUrl} 
                            alt="Intake video frame thumbnail" 
                            className="absolute inset-0 w-full h-full object-cover opacity-70"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                          <div className="z-10 text-center p-4">
                            <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 mb-1.5">
                              <Video className="h-4 w-4" />
                            </div>
                            <p className="text-white font-bold text-xs tracking-wider">Default Intake Preview</p>
                            <p className="text-slate-300 text-[10px] mt-0.5 font-mono">{job.sourceFilename}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {selectedFile && (
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="bg-blue-50/45 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                          <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Next Step Recommendation</span>
                        </div>
                        <p className="text-xs text-blue-950 font-semibold leading-relaxed">
                          Review the selected source preview. When you are ready, trigger frame extraction to isolate a high-fidelity keyframe.
                        </p>
                      </div>
                      <button
                        onClick={handleExtractFrame}
                        disabled={extractionStatus === "EXTRACTING"}
                        className="shrink-0 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black px-4.5 py-2.5 rounded-lg text-[10px] uppercase tracking-widest transition cursor-pointer shadow-xs whitespace-nowrap"
                        id="btn-source-extract-action"
                      >
                        <Sparkles className={`h-3.5 w-3.5 shrink-0 ${extractionStatus === "EXTRACTING" ? "animate-spin" : ""}`} />
                        <span>{extractionStatus === "EXTRACTING" ? "Extracting..." : "Extract Frame →"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Section 1.5: FRAME EXTRACTION */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" id="section-extract">
              <div className="border-b border-slate-200/60 bg-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold">1.5</span>
                  <h3 className="font-black text-slate-400 tracking-widest text-[10px] uppercase">Stage 2: Frame Extraction</h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  extractionStatus === "SUCCESS" || job.status === "EXTRACTED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : extractionStatus === "EXTRACTING"
                    ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                    : extractionStatus === "FAILED" || (job.status === "FAILED" && job.failedStage === "Extract")
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-slate-50 text-slate-500 border border-slate-200"
                }`}>
                  {extractionStatus === "SUCCESS" || job.status === "EXTRACTED" ? "SUCCESS" : extractionStatus}
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Flow & Details */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Extraction Pipeline Flow</span>
                        <div className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200/60 p-3 rounded-lg text-xs font-mono text-slate-600">
                          <span className="font-bold text-slate-800">SOURCE ({job.sourceType.toUpperCase()})</span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                          <span className="font-bold text-blue-600">EXTRACTED FRAME</span>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Source Filename</span>
                        <p className="text-slate-800 font-mono text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 inline-block break-all">
                          {selectedFile ? selectedFile.name : job.sourceFilename}
                        </p>
                      </div>

                      <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Extraction Status Details</span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {extractionStatus === "SUCCESS" || job.status === "EXTRACTED" ? (
                            "Representative keyframe successfully extracted and verified. Ready for characters parsing (OCR)."
                          ) : extractionStatus === "EXTRACTING" ? (
                            "Processing stream using browser File and Canvas APIs. Seeking to first usable frame..."
                          ) : extractionStatus === "FAILED" || (job.status === "FAILED" && job.failedStage === "Extract") ? (
                            <span className="text-rose-600 font-bold">
                              Error: {extractionError || job.errorMessage || "Failed to extract keyframe."}
                            </span>
                          ) : (
                            "Idle. Initiate extraction from the panel above or step simulator."
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Visual Verification */}
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Extracted Frame Preview</span>
                    <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
                      {extractedFrameUrl || (job.status === "EXTRACTED" && job.sourceUrl) ? (
                        <img 
                          src={extractedFrameUrl || job.sourceUrl} 
                          alt="Extracted frame preview" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-slate-800 text-slate-500 mb-2">
                            <Video className="h-5 w-5" />
                          </div>
                          <p className="text-slate-400 font-bold text-xs tracking-wider">No Extracted Frame Yet</p>
                          <p className="text-slate-500 text-[10px] mt-1">Extract the keyframe first before visually verifying.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {extractedFrameUrl && (extractionStatus === "SUCCESS" || job.status === "EXTRACTED" || job.status === "OCR_READY") && (
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="bg-emerald-50/45 border border-emerald-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
                          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Next Step Recommendation</span>
                        </div>
                        <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                          Keyframe successfully verified in Stage 1.5. Proceed to Stage 2 (OCR) and click Run OCR to parse characters from this image.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          document.getElementById("section-ocr")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="shrink-0 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4.5 py-2.5 rounded-lg text-[10px] uppercase tracking-widest transition cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span>Go to OCR Stage →</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Section 2: OCR */}
            <section className="scroll-mt-24 bg-white border border-slate-200 rounded-xl overflow-hidden" id="section-ocr">
              <div className="border-b border-slate-200/60 bg-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold">2</span>
                  <h3 className="font-black text-slate-400 tracking-widest text-[10px] uppercase">OCR (OPTICAL CHARACTER RECOGNITION)</h3>
                </div>
                <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-200/60 font-bold uppercase tracking-wider">Google Cloud Vision OCR</span>
              </div>

              <div className="p-5 space-y-6">
                {/* Unified Production OCR Engine Panel */}
                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-blue-600" />
                        Production OCR Engine
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Powered by Google Cloud Vision neural networks. High-precision document text detection with native Thai language hint.
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isVisionConfigured === null ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                          Checking Credentials
                        </span>
                      ) : isVisionConfigured ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          Configured & Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                          Credentials Missing
                        </span>
                      )}
                    </div>
                  </div>

                  {isVisionConfigured === false && (
                    <div className="mt-2.5 bg-rose-50 border border-rose-100/60 rounded-lg p-2.5 text-[10px] text-rose-800 font-semibold leading-normal">
                      Google Cloud Vision API key is missing. Please add <strong>GOOGLE_CLOUD_VISION_API_KEY</strong> to your AI Studio secrets to enable real character recognition.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Field A: RAW OCR */}
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        RAW OCR Text
                      </label>
                      <span className="text-[9px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 font-bold uppercase tracking-wider">
                        Immutable
                      </span>
                    </div>
                    
                    <div className="relative flex-1">
                      <textarea
                        value={job.rawOcr}
                        readOnly
                        rows={5}
                        className="w-full h-full min-h-[140px] p-3 bg-slate-50 text-slate-800 font-mono text-xs rounded-lg border border-slate-200 cursor-not-allowed resize-none focus:outline-hidden font-bold"
                        id="textarea-raw-ocr"
                        title="Raw OCR text extracted from frame analysis. This is immutable to preserve historical source accuracy."
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      RAW OCR text preserves system-level extraction errors, missing capitalization, and noise.
                    </p>
                  </div>

                  {/* Field B: CLEAN TEXT */}
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        Clean Text <span className="text-blue-600 font-bold lowercase italic">(editable)</span>
                      </label>
                      <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-bold uppercase tracking-wider">
                        Production Input
                      </span>
                    </div>

                    <div className="relative flex-1">
                      <textarea
                        value={job.cleanText}
                        onChange={handleCleanTextChange}
                        rows={5}
                        className="w-full h-full min-h-[140px] p-3 bg-white text-slate-800 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-y"
                        id="textarea-clean-text"
                        placeholder="Paste or clean up the text representation here..."
                      />
                    </div>
                    <p className="text-[10px] text-blue-600 font-bold mt-1.5 flex items-center gap-1">
                      <Edit2 className="h-3 w-3" /> Edit clean text above. This directly guides core meaning and script generation.
                    </p>
                  </div>

                </div>

                {/* Build 4 Run OCR Action Button */}
                {selectedFile && extractedFrameUrl && (job.status === "EXTRACTED" || job.status === "FAILED") && (
                  <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                        <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Next Step Recommendation</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                        Review the extracted keyframe from Stage 1.5. Click below to trigger managed cloud character recognition.
                      </p>
                    </div>
                    <button
                      onClick={handleRunOcr}
                      disabled={ocrStatus === "PROCESSING" || isVisionConfigured === false}
                      className="shrink-0 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black px-4.5 py-2.5 rounded-lg text-[10px] uppercase tracking-widest transition cursor-pointer shadow-xs whitespace-nowrap"
                      id="btn-run-ocr-action"
                    >
                      <FileText className={`h-3.5 w-3.5 shrink-0 ${ocrStatus === "PROCESSING" ? "animate-spin" : ""}`} />
                      <span>
                        {ocrStatus === "PROCESSING"
                          ? "Processing OCR..."
                          : isVisionConfigured === false
                          ? "Vision Key Required"
                          : "Run Google Vision OCR"}
                      </span>
                    </button>
                  </div>
                )}

                {ocrStatus === "PROCESSING" && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3.5 flex items-center gap-2.5 animate-pulse">
                      <FileText className="h-5 w-5 text-blue-600 shrink-0 animate-spin" />
                      <p className="text-xs text-blue-950 font-semibold">
                        Sending base64 pixels to secure server-side proxy... Executing Google Cloud Vision API (DOCUMENT_TEXT_DETECTION with Thai hint)...
                      </p>
                    </div>
                  </div>
                )}

                {ocrStatus === "FAILED" && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-3.5 flex items-center gap-2.5">
                      <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                      <p className="text-xs text-rose-950 font-semibold">
                        OCR Engine failed (using Google Cloud Vision): <span className="font-bold">{ocrError || job.errorMessage}</span>
                      </p>
                    </div>
                  </div>
                )}

                {ocrStatus === "SUCCESS" && job.status === "OCR_READY" && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5 flex items-center gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <p className="text-xs text-emerald-950 font-semibold">
                        Real Thai OCR completed successfully using <span className="font-bold">Google Cloud Vision</span>! Machine extraction evidence loaded into Raw OCR.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Section 3: CORE MEANING & TEXT PROCESSING */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" id="section-core-meaning">
              <div className="border-b border-slate-200/60 bg-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold mr-2.5">3</span>
                  <h3 className="font-black text-slate-400 tracking-widest text-[10px] uppercase">TEXT PROCESSING & CORE MEANING</h3>
                </div>
                <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-200/60 font-bold uppercase tracking-wider">Gemma 4 26B A4B</span>
              </div>

              <div className="p-5 space-y-6">
                {/* R&D Auto Accept Config Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                  <div>
                    <span className="text-[11px] font-black text-slate-700 block uppercase tracking-wider">AI Auto-Accept Mode</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">When enabled, validated Gemma outputs automatically commit to clean text & core meaning fields.</span>
                  </div>
                  <button
                    onClick={() => setAutoAcceptAiText(!autoAcceptAiText)}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${autoAcceptAiText ? "bg-blue-600" : "bg-slate-300"}`}
                    type="button"
                    role="switch"
                    id="toggle-auto-accept-ai"
                    aria-label="AI Auto-Accept Mode toggle"
                  >
                    <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${autoAcceptAiText ? "translate-x-4.5" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* Main Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-blue-100 bg-blue-50/20 rounded-xl">
                  <div>
                    <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest block mb-1">Gemma Processing Pipeline</span>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                      Send raw character evidence to Gemma to normalize spacing, repair artifacts, and synthesize core semantic meaning.
                    </p>
                  </div>
                  <button
                    onClick={handleRunTextProcessing}
                    disabled={textProcessingStatus === "PROCESSING" || !job.rawOcr}
                    className="shrink-0 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black px-4.5 py-2.5 rounded-lg text-[10px] uppercase tracking-widest transition cursor-pointer shadow-xs whitespace-nowrap"
                    id="btn-run-text-processing"
                  >
                    <Sparkles className={`h-3.5 w-3.5 shrink-0 ${textProcessingStatus === "PROCESSING" ? "animate-spin" : ""}`} />
                    <span>
                      {textProcessingStatus === "PROCESSING"
                        ? "AI Processing..."
                        : !job.rawOcr
                        ? "Ocr Text Required"
                        : "Run Gemma Processing"}
                    </span>
                  </button>
                </div>

                {/* Build 5 Observability Accounting Patch UI */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Runs</span>
                    <span className="text-slate-800 font-bold mt-0.5">{job.textProcessRunCount || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Latency</span>
                    <span className="text-slate-800 font-bold mt-0.5">
                      {job.lastLatencyMs ? `${(job.lastLatencyMs / 1000).toFixed(1)} s` : "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Tokens</span>
                    <span className="text-slate-800 font-bold mt-0.5">
                      {job.lastTotalTokens ? job.lastTotalTokens.toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cumulative Tokens</span>
                    <span className="text-slate-800 font-bold mt-0.5">
                      {job.cumulativeTotalTokens ? job.cumulativeTotalTokens.toLocaleString() : 0}
                    </span>
                  </div>
                  <div className="flex flex-col col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost</span>
                    <span className="text-slate-500 font-bold mt-0.5">N/A</span>
                  </div>
                </div>

                {/* Processing State Loader */}
                {textProcessingStatus === "PROCESSING" && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3.5 flex items-center gap-2.5 animate-pulse">
                    <Sparkles className="h-5 w-5 text-blue-600 shrink-0 animate-spin" />
                    <p className="text-xs text-blue-950 font-semibold">
                      Invoking Gemma 4 26B A4B model... Normalizing raw characters and extracting core motivational essence...
                    </p>
                  </div>
                )}

                {/* Error Banner */}
                {textProcessingStatus === "FAILED" && (
                  <div className="bg-rose-50 border border-rose-100 rounded-lg p-3.5 flex items-center gap-2.5">
                    <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                    <p className="text-xs text-rose-950 font-semibold">
                      Text Processing Failed: <span className="font-bold">{textProcessingError || job.errorMessage}</span>
                    </p>
                  </div>
                )}

                {/* Success/Accept Status Banners */}
                {textProcessingStatus === "SUCCESS" && autoAcceptAiText && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5 flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs text-emerald-950 font-bold">Gemma processing succeeded & auto-accepted!</p>
                      {aiCandidate?.provenance && (
                        <p className="text-[10px] text-emerald-800 mt-0.5">
                          Latency: {aiCandidate.provenance.latency_ms} ms | Language: {aiCandidate.language} | Tokens: P:{aiCandidate.provenance.input_tokens || "N/A"} C:{aiCandidate.provenance.output_tokens || "N/A"}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Candidate Section (When review is needed) */}
                {!autoAcceptAiText && aiCandidate && (
                  <div className="border border-dashed border-blue-300 bg-blue-50/10 rounded-xl p-4.5 space-y-4" id="ai-candidate-card">
                    <div className="flex justify-between items-center pb-2 border-b border-blue-100/60">
                      <div>
                        <span className="text-[10px] font-black text-blue-700 block uppercase tracking-wider">Gemma AI Candidate</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Awaiting manual operator verification and acceptance.</span>
                      </div>
                      <span className="text-[9px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold uppercase tracking-wider">
                        Language: {aiCandidate.language.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Clean Text Candidate</span>
                        <textarea
                          value={aiCandidate.cleanText}
                          readOnly
                          rows={4}
                          className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs rounded-lg border border-slate-200 focus:outline-hidden font-medium cursor-default resize-none"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Core Meaning Candidate</span>
                        <textarea
                          value={aiCandidate.coreMeaning}
                          readOnly
                          rows={4}
                          className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs rounded-lg border border-slate-200 focus:outline-hidden font-medium cursor-default resize-none"
                        />
                      </div>
                    </div>

                    {/* Metadata & Accept button */}
                    <div className="pt-2 border-t border-blue-100/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      {aiCandidate.provenance && (
                        <div className="text-[9px] text-slate-500 space-y-0.5">
                          <div>
                            <strong>Provenance:</strong> {aiCandidate.provenance.provider} ({aiCandidate.provenance.model})
                          </div>
                          <div>
                            <strong>Metrics:</strong> Latency: {aiCandidate.provenance.latency_ms} ms | Tokens: Input {aiCandidate.provenance.input_tokens || "N/A"}, Output {aiCandidate.provenance.output_tokens || "N/A"}, Total {aiCandidate.provenance.total_tokens || "N/A"}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={handleAcceptAiText}
                        className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest transition cursor-pointer"
                        id="btn-accept-ai-text"
                      >
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        <span>Accept AI Text</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Canonical Text Editor Fields */}
                <div className="flex flex-col space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Production Core Meaning <span className="text-blue-600 font-bold lowercase italic">(editable)</span>
                      </label>
                      <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-bold uppercase tracking-wider">
                        Production Input
                      </span>
                    </div>

                    <textarea
                      value={job.coreMeaning}
                      onChange={handleCoreMeaningChange}
                      rows={2.5}
                      className="w-full p-3 bg-white text-slate-800 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                      id="textarea-core-meaning"
                      placeholder="Enter the central core message or quote summary..."
                    />
                    
                    <div className="pt-1.5 flex items-center space-x-2 text-[10px] text-slate-500">
                      <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>The Core Meaning acts as a semantic bridge, stripping out conversational filler to target the raw motivational core.</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: SCRIPT VARIANTS */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" id="section-script-variants">
              <div className="border-b border-slate-200/60 bg-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold">4</span>
                  <h3 className="font-black text-slate-400 tracking-widest text-[10px] uppercase">SCRIPT VARIANTS</h3>
                </div>
                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Exactly 3 V1.0 Variants</span>
              </div>

              <div className="p-5">
                <p className="text-[11px] text-slate-500 mb-4">
                  These 3 distinct short-form vertical video script structures are optimized for dynamic subtitles and hook-driven viewing behavior. Edit them independently.
                </p>

                {/* Stage 4 Gemma Processing Control Panel */}
                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80 mb-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/40">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-blue-600" />
                        Stage 4 Script Generation Engine
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Convert accepted core meaning and clean text into 3 production script candidates in target source language.
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border border-blue-200">
                        Target Language: {(job.language || "en").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Toggle for Auto-Accept */}
                  <div className="flex items-center justify-between p-3 bg-white border border-slate-200/60 rounded-xl">
                    <div>
                      <span className="text-[11px] font-black text-slate-700 block uppercase tracking-wider">AI Auto-Accept Scripts</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">When enabled, generated Gemma script candidates commit automatically to canonical production fields.</span>
                    </div>
                    <button
                      onClick={() => setAutoAcceptAiScript(!autoAcceptAiScript)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${autoAcceptAiScript ? "bg-blue-600" : "bg-slate-300"}`}
                      type="button"
                      role="switch"
                      id="toggle-auto-accept-script"
                      aria-label="AI Auto-Accept Scripts toggle"
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${autoAcceptAiScript ? "translate-x-4.5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Execution Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3.5 border border-blue-100 bg-blue-50/25 rounded-xl">
                    <div>
                      <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest block mb-1">Gemma Script Pipeline</span>
                      <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                        Trigger Gemma model gemma-4-26b-a4b-it to author three specific hook variants natively in the target language.
                      </p>
                    </div>
                    <button
                      onClick={handleRunScriptGeneration}
                      disabled={scriptProcessingStatus === "PROCESSING" || !job.cleanText || !job.coreMeaning}
                      className="shrink-0 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black px-4.5 py-2.5 rounded-lg text-[10px] uppercase tracking-widest transition cursor-pointer shadow-xs whitespace-nowrap"
                      id="btn-run-script-generation"
                    >
                      <Sparkles className={`h-3.5 w-3.5 shrink-0 ${scriptProcessingStatus === "PROCESSING" ? "animate-spin" : ""}`} />
                      <span>
                        {scriptProcessingStatus === "PROCESSING"
                          ? "Generating..."
                          : (!job.cleanText || !job.coreMeaning)
                          ? "Text Required"
                          : "Run Stage 4 Generation"}
                      </span>
                    </button>
                  </div>

                  {/* Stage 4 Observability Accounting Table */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 p-3.5 bg-white border border-slate-200 rounded-xl text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Runs</span>
                      <span className="text-slate-800 font-bold mt-0.5">{job.scriptProcessRunCount || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Latency</span>
                      <span className="text-slate-800 font-bold mt-0.5">
                        {job.lastScriptLatencyMs ? `${(job.lastScriptLatencyMs / 1000).toFixed(1)} s` : "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Tokens</span>
                      <span className="text-slate-800 font-bold mt-0.5">
                        {job.lastScriptTotalTokens ? job.lastScriptTotalTokens.toLocaleString() : "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cumulative Tokens</span>
                      <span className="text-slate-800 font-bold mt-0.5">
                        {job.cumulativeScriptTotalTokens ? job.cumulativeScriptTotalTokens.toLocaleString() : 0}
                      </span>
                    </div>
                    <div className="flex flex-col col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost</span>
                      <span className="text-slate-500 font-bold mt-0.5">N/A</span>
                    </div>
                  </div>

                  {/* Loading/Status banner */}
                  {scriptProcessingStatus === "PROCESSING" && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3.5 flex items-center gap-2.5 animate-pulse">
                      <Sparkles className="h-5 w-5 text-blue-600 shrink-0 animate-spin" />
                      <p className="text-xs text-blue-950 font-semibold">
                        Invoking Gemma 4 26B A4B model... Directing core semantic message into exactly three delivery variants...
                      </p>
                    </div>
                  )}

                  {/* Error Banner */}
                  {scriptProcessingStatus === "FAILED" && (
                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-3.5 flex items-center gap-2.5">
                      <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                      <p className="text-xs text-rose-950 font-semibold">
                        Script Generation Failed: <span className="font-bold">{scriptProcessingError || job.errorMessage}</span>
                      </p>
                    </div>
                  )}

                  {/* Auto-Accept Success Banner */}
                  {scriptProcessingStatus === "SUCCESS" && autoAcceptAiScript && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5 flex items-center gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs text-emerald-950 font-bold">Gemma script candidates succeeded and committed automatically!</p>
                        {scriptCandidates?.provenance && (
                          <p className="text-[10px] text-emerald-800 mt-0.5">
                            Latency: {scriptCandidates.provenance.latency_ms} ms | Language: {(job.language || "en").toUpperCase()} | Tokens: P:{scriptCandidates.provenance.input_tokens || "N/A"} C:{scriptCandidates.provenance.output_tokens || "N/A"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Candidates Review Card */}
                  {!autoAcceptAiScript && scriptCandidates && (
                    <div className="border border-dashed border-blue-300 bg-blue-50/10 rounded-xl p-4.5 space-y-4" id="ai-script-candidates-card">
                      <div className="flex justify-between items-center pb-2 border-b border-blue-100/60">
                        <div>
                          <span className="text-[10px] font-black text-blue-700 block uppercase tracking-wider">Gemma Script Candidates</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">Awaiting operator preview, comparison, and manual acceptance.</span>
                        </div>
                        <span className="text-[9px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold uppercase tracking-wider">
                          Language: {(job.language || "en").toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Candidate A (Direct)</span>
                          <textarea
                            value={scriptCandidates.scriptA}
                            readOnly
                            rows={4.5}
                            className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs rounded-lg border border-slate-200 font-medium cursor-default resize-none"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Candidate B (Hook First)</span>
                          <textarea
                            value={scriptCandidates.scriptB}
                            readOnly
                            rows={4.5}
                            className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs rounded-lg border border-slate-200 font-medium cursor-default resize-none"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Candidate C (Punchy)</span>
                          <textarea
                            value={scriptCandidates.scriptC}
                            readOnly
                            rows={4.5}
                            className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs rounded-lg border border-slate-200 font-medium cursor-default resize-none"
                          />
                        </div>
                      </div>

                      {scriptCandidates.provenance && (
                        <div className="text-[9px] text-slate-400 font-mono flex flex-wrap gap-x-4 gap-y-1 py-1 bg-slate-50 px-3 rounded-lg border border-slate-200/50">
                          <span>Model: {scriptCandidates.provenance.live_model_used}</span>
                          <span>Latency: {scriptCandidates.provenance.latency_ms} ms</span>
                          <span>Prompt Tokens: {scriptCandidates.provenance.input_tokens || "N/A"}</span>
                          <span>Completion Tokens: {scriptCandidates.provenance.output_tokens || "N/A"}</span>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={handleAcceptAiScripts}
                          className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest transition cursor-pointer"
                          id="btn-accept-ai-scripts"
                        >
                          <Check className="h-3.5 w-3.5 shrink-0" />
                          <span>Accept AI Scripts</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Script A */}
                  <div className="flex flex-col space-y-2.5 p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl" id="div-script-a">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                        Script A
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Direct Format</span>
                    </div>
                    
                    <textarea
                      value={job.scripts.scriptA}
                      onChange={(e) => handleScriptChange("scriptA", e.target.value)}
                      rows={5.5}
                      className="w-full p-2.5 bg-white text-slate-800 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-y"
                      id="textarea-script-a"
                      placeholder="Enter Script A content..."
                    />
                  </div>

                  {/* Script B */}
                  <div className="flex flex-col space-y-2.5 p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl" id="div-script-b">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                        Script B
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Hook First</span>
                    </div>
                    
                    <textarea
                      value={job.scripts.scriptB}
                      onChange={(e) => handleScriptChange("scriptB", e.target.value)}
                      rows={5.5}
                      className="w-full p-2.5 bg-white text-slate-800 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-y"
                      id="textarea-script-b"
                      placeholder="Enter Script B content..."
                    />
                  </div>

                  {/* Script C */}
                  <div className="flex flex-col space-y-2.5 p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl" id="div-script-c">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                        Script C
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Punchy Call-out</span>
                    </div>
                    
                    <textarea
                      value={job.scripts.scriptC}
                      onChange={(e) => handleScriptChange("scriptC", e.target.value)}
                      rows={5.5}
                      className="w-full p-2.5 bg-white text-slate-800 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-y"
                      id="textarea-script-c"
                      placeholder="Enter Script C content..."
                    />
                  </div>

                </div>
              </div>
            </section>

            {/* Section 5: VOICE */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" id="section-voice">
              <div className="border-b border-slate-200/60 bg-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold">5</span>
                  <h3 className="font-black text-slate-400 tracking-widest text-[10px] uppercase">VOICE GENERATION FOUNDATION</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">Provider-Neutral Contract</span>
              </div>

              <div className="p-5 space-y-6">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5">
                        Canonical Synthesis Source
                      </label>
                      <select
                        value={job.voiceSourceType || "SCRIPT_A"}
                        onChange={(e) => handleVoiceSourceChange(e.target.value as any)}
                        className="w-full p-2 bg-white text-slate-800 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition cursor-pointer"
                        id="select-voice-source"
                      >
                        <option value="SCRIPT_A">Script A (Modern Display / Core)</option>
                        <option value="SCRIPT_B">Script B (Hook First)</option>
                        <option value="SCRIPT_C">Script C (Short Attention)</option>
                        <option value="CLEAN_TEXT">Cleaned Up OCR Text</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5">
                        Active TTS Voice Provider
                      </label>
                      <div className="bg-white px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center space-x-2 font-mono" id="voice-provider-placeholder">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span>Neutral Foundation (Awaiting Integration Approval)</span>
                      </div>
                    </div>
                  </div>

                  {/* Provenance snapshot rendering */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
                      Synthesis Source Text Provenance Snapshot
                    </span>
                    <div className="p-3 bg-white border border-slate-200/60 rounded-lg max-h-24 overflow-y-auto text-xs text-slate-600 whitespace-pre-wrap italic font-sans" id="voice-snapshot-box">
                      {job.voiceSourceTextSnapshot || (job.voiceSourceType === "SCRIPT_A" ? job.scripts.scriptA : job.voiceSourceType === "SCRIPT_B" ? job.scripts.scriptB : job.voiceSourceType === "SCRIPT_C" ? job.scripts.scriptC : job.cleanText) || "No source text snapshot captured yet."}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Slot A: Female Voice */}
                  <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 relative flex flex-col justify-between space-y-3" id="voice-slot-female">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Slot F1 (Female)</span>
                        <h4 className="font-bold text-slate-900 text-xs mt-0.5">{job.femaleVoice.name}</h4>
                        <p className="text-slate-400 text-[10px] font-mono">Voice ID: {job.femaleVoice.voiceId}</p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        job.femaleVoice.status === "GENERATED" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : job.femaleVoice.status === "PROCESSING"
                          ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {job.femaleVoice.status}
                      </span>
                    </div>

                    {/* Audio Placeholder Visual Representation */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80 flex flex-col space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span className="font-semibold text-slate-600">Female Voice Track</span>
                        <span className="font-mono">{job.femaleVoice.duration || "0:00"}</span>
                      </div>
                      
                      {/* Fake Waveform or Track progress */}
                      <div className="flex items-center space-x-1 h-8 bg-slate-50/40 rounded-md border border-slate-200/40 px-3 overflow-hidden">
                        {audioWaveform.map((ht, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-xs transition-all duration-150 ${
                              playingVoice === "female" ? "bg-blue-600" : "bg-slate-200"
                            }`}
                            style={{ height: `${playingVoice === "female" ? ht : 10}%` }}
                          />
                        ))}
                      </div>

                      {/* Play Control Placeholder */}
                      <button
                        disabled={job.femaleVoice.status !== "GENERATED"}
                        onClick={() => togglePlayVoice("female")}
                        className={`mt-2 w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${
                          job.femaleVoice.status !== "GENERATED"
                            ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                            : playingVoice === "female"
                            ? "bg-blue-50 border-blue-200 text-blue-700 cursor-pointer"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                        }`}
                        id="btn-play-female"
                      >
                        {playingVoice === "female" ? (
                          <>
                            <Pause className="h-3.5 w-3.5 fill-current" />
                            <span>Pause Audio</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>Preview Female voice</span>
                          </>
                        )}
                      </button>

                      {/* Synthesize Button */}
                      <button
                        id="btn-synthesize-female"
                        disabled={job.femaleVoice.status === "PROCESSING" || (job.status !== "SCRIPT_READY" && job.status !== "AUDIO_READY")}
                        onClick={() => handleSynthesize("female")}
                        className={`mt-2 w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${
                          job.femaleVoice.status === "PROCESSING" || (job.status !== "SCRIPT_READY" && job.status !== "AUDIO_READY")
                            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                        }`}
                      >
                        {job.femaleVoice.status === "PROCESSING" ? (
                          <>
                            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Synthesizing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>SYNTHESIZE FEMALE</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Slot B: Male Voice */}
                  <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 relative flex flex-col justify-between space-y-3" id="voice-slot-male">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Slot M1 (Male)</span>
                        <h4 className="font-bold text-slate-900 text-xs mt-0.5">{job.maleVoice.name}</h4>
                        <p className="text-slate-400 text-[10px] font-mono">Voice ID: {job.maleVoice.voiceId}</p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        job.maleVoice.status === "GENERATED" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : job.maleVoice.status === "PROCESSING"
                          ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {job.maleVoice.status}
                      </span>
                    </div>

                    {/* Audio Placeholder Visual Representation */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80 flex flex-col space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span className="font-semibold text-slate-600">Male Voice Track</span>
                        <span className="font-mono">{job.maleVoice.duration || "0:00"}</span>
                      </div>
                      
                      {/* Fake Waveform or Track progress */}
                      <div className="flex items-center space-x-1 h-8 bg-slate-50/40 rounded-md border border-slate-200/40 px-3 overflow-hidden">
                        {audioWaveform.map((ht, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-xs transition-all duration-150 ${
                              playingVoice === "male" ? "bg-blue-600" : "bg-slate-200"
                            }`}
                            style={{ height: `${playingVoice === "male" ? ht : 10}%` }}
                          />
                        ))}
                      </div>

                      {/* Play Control Placeholder */}
                      <button
                        disabled={job.maleVoice.status !== "GENERATED"}
                        onClick={() => togglePlayVoice("male")}
                        className={`mt-2 w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${
                          job.maleVoice.status !== "GENERATED"
                            ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                            : playingVoice === "male"
                            ? "bg-blue-50 border-blue-200 text-blue-700 cursor-pointer"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                        }`}
                        id="btn-play-male"
                      >
                        {playingVoice === "male" ? (
                          <>
                            <Pause className="h-3.5 w-3.5 fill-current" />
                            <span>Pause Audio</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>Preview Male voice</span>
                          </>
                        )}
                      </button>

                      {/* Synthesize Button */}
                      <button
                        id="btn-synthesize-male"
                        disabled={job.maleVoice.status === "PROCESSING" || (job.status !== "SCRIPT_READY" && job.status !== "AUDIO_READY")}
                        onClick={() => handleSynthesize("male")}
                        className={`mt-2 w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${
                          job.maleVoice.status === "PROCESSING" || (job.status !== "SCRIPT_READY" && job.status !== "AUDIO_READY")
                            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                        }`}
                      >
                        {job.maleVoice.status === "PROCESSING" ? (
                          <>
                            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Synthesizing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>SYNTHESIZE MALE</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Stage 5 Observability Panel */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono text-[10px] text-slate-500" id="voice-observability-panel">
                  <div>
                    <span className="block text-[8px] font-black uppercase text-slate-400 mb-0.5">Synthesis Runs</span>
                    <span className="font-bold text-slate-700">{job.voiceProcessRunCount || 0}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black uppercase text-slate-400 mb-0.5">Last Synthesized At</span>
                    <span className="font-bold text-slate-700">{job.lastVoiceProcessAt ? new Date(job.lastVoiceProcessAt).toLocaleTimeString() : "Never"}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black uppercase text-slate-400 mb-0.5">Last Run Latency</span>
                    <span className="font-bold text-slate-700">{job.lastVoiceLatencyMs ? `${job.lastVoiceLatencyMs} ms` : "0 ms"}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black uppercase text-slate-400 mb-0.5">Est. Characters</span>
                    <span className="font-bold text-slate-700">{job.cumulativeVoiceCharacters || 0} chars</span>
                  </div>
                </div>
              </div>
            </section>            {/* Section 6: VIDEO COMPOSITION */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" id="section-video">
              <div className="border-b border-slate-200/60 bg-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold">6</span>
                  <h3 className="font-black text-slate-400 tracking-widest text-[10px] uppercase">VIDEO GENERATION WORKSPACE</h3>
                </div>
                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60 tracking-wider">
                  TARGET: 1080x1920 MP4
                </span>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  
                  {/* 9:16 Video Preview Canvas Container (5 columns) */}
                  <div className="md:col-span-5 flex flex-col items-center">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 self-start">
                      9:16 Vertical Video Preview Area
                    </span>
                    
                    {/* Aspect Ratio Box (9:16) */}
                    <div className="relative w-full max-w-[220px] aspect-[9/16] bg-slate-950 rounded-xl shadow-md border border-slate-200/80 overflow-hidden flex flex-col justify-between group animate-none" id="div-video-preview-canvas">
                      
                      {/* Target Aspect Label */}
                      <div className="absolute top-3 left-3 z-20 bg-black/60 text-white text-[9px] font-mono px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest">
                        1080 x 1920
                      </div>

                      {/* Mock Video Stream / Rendering State Overlay */}
                      {isRenderingVideo ? (
                        <div className="absolute inset-0 z-15 bg-slate-950/95 flex flex-col items-center justify-center text-center p-4">
                          <div className="relative h-10 w-10 flex items-center justify-center">
                            <span className="absolute animate-ping inline-flex h-6 w-6 rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-600"></span>
                          </div>
                          <p className="text-white text-[11px] font-bold mt-4 tracking-wider">Compiling Frame Layers...</p>
                          <div className="w-4/5 bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                            <div className="bg-blue-500 h-full transition-all duration-150" style={{ width: `${videoRenderingProgress}%` }} />
                          </div>
                          <span className="text-slate-400 text-[9px] mt-1 font-mono">{videoRenderingProgress}%</span>
                        </div>
                      ) : job.videoStatus === "READY" ? (
                        /* When composed and ready, display standard mockup stream */
                        <div className="absolute inset-0 z-10 overflow-hidden">
                          {playingVideo ? (
                            <video
                              src={job.videoUrl}
                              autoPlay
                              loop
                              muted
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <img
                              src={job.sourceUrl}
                              alt="Generated frame composite"
                              className="w-full h-full object-cover brightness-75"
                              referrerPolicy="no-referrer"
                            />
                          )}

                          {/* Dynamic Subtitles overlay on vertical mockup */}
                          <div className="absolute inset-x-4 bottom-1/3 text-center z-15">
                            <span className="bg-yellow-400 text-slate-950 font-black tracking-wide text-[10px] px-1.5 py-0.5 rounded shadow-sm uppercase font-sans border border-slate-950 inline-block rotate-[-1deg]">
                              THE BIGGEST RISK
                            </span>
                            <span className="block text-white font-extrabold text-[10px] mt-1.5 tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                              "is not taking any risk!"
                            </span>
                          </div>

                          {/* Player controller layout on preview */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/45 transition-colors duration-150">
                            <button
                              onClick={() => {
                                setPlayingVideo(!playingVideo);
                                setPlayingVoice(null);
                              }}
                              className="h-9 w-9 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-md hover:scale-105 transition cursor-pointer"
                              title={playingVideo ? "Pause Preview" : "Play Preview"}
                            >
                              {playingVideo ? <Pause className="h-3.5 w-3.5 fill-current text-slate-900" /> : <Play className="h-3.5 w-3.5 fill-current text-slate-900 translate-x-0.5" />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Unrendered initial state placeholder */
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-4 bg-slate-950">
                          <Video className="h-6 w-6 text-slate-600 mb-2" />
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Composition Pending</p>
                          <p className="text-[9px] text-slate-600 mt-1 leading-relaxed">Requires audio generated slots before assembly.</p>
                        </div>
                      )}

                      {/* Mock Device Footer details (just cosmetic vertical design) */}
                      <div className="z-20 bg-gradient-to-t from-black/95 to-transparent p-3 pt-8 text-white text-[9px] flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-200">TomTomLife Shorts</p>
                          <p className="text-slate-400 text-[8px]">Content package #Q000001</p>
                        </div>
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-blue-300 font-mono text-[8px]">V1-MP4</span>
                      </div>
                    </div>
                  </div>

                  {/* Settings & controls (7 columns) */}
                  <div className="md:col-span-7 space-y-5 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-2.5">
                        <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-blue-600" /> Output Specifications
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <div>
                            <span className="text-slate-400 block font-medium">Resolution Target:</span>
                            <span className="font-bold text-slate-700">1080 x 1920 (Vertical 9:16)</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Container Format:</span>
                            <span className="font-bold text-slate-700">MPEG-4 (.mp4)</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Audio Mix:</span>
                            <span className="font-bold text-slate-700">V1 Stereo Mix</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Subtitle Rendering:</span>
                            <span className="font-bold text-slate-700">Overlay Burn-in Subtitles</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Video Generation Status</span>
                        <div className="flex items-center space-x-2">
                          <span className={`h-2 w-2 rounded-full ${
                            job.videoStatus === "READY" 
                              ? "bg-emerald-500" 
                              : job.videoStatus === "RENDERING" 
                              ? "bg-amber-500 animate-pulse" 
                              : "bg-slate-400"
                          }`} />
                          <span className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
                            {job.videoStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Compiling builds a high-definition video using raw source video clips, layered voice outputs, and animated canvas subtitle scripts.
                        </p>
                      </div>

                      {/* MP4 Placeholder indicator */}
                      <div className="bg-slate-50/50 border border-dashed border-slate-200 p-3 rounded-xl">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Generated Output File Slot</span>
                        <div className="flex items-center space-x-2.5">
                          <div className="h-7 w-7 bg-blue-50 text-blue-600 rounded flex items-center justify-center font-bold text-[10px] shrink-0 border border-blue-100 uppercase">
                            MP4
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono text-slate-700 truncate font-bold">
                              {job.videoStatus === "READY" ? `output_q000001_v1_burn.mp4` : "Pending synthesis output..."}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {job.videoStatus === "READY" ? "Size: 4.8 MB — 1080x1920 MP4" : "0.00 MB"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Direct Compilation Action Controls */}
                    <div className="pt-2">
                      <button
                        onClick={handleGenerateVideoDirectly}
                        disabled={isRenderingVideo || job.videoStatus === "RENDERING"}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 px-4 rounded-lg text-[10px] uppercase tracking-widest transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                        id="btn-generate-final-video"
                      >
                        <Video className="h-4 w-4" />
                        <span>{isRenderingVideo ? "Compiling MP4 Layer..." : "Generate Final Video (Assemble)"}</span>
                      </button>
                    </div>

                  </div>

                </div>
              </div>
            </section>

            {/* Section 7: HUMAN REVIEW */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" id="section-review">
              <div className="border-b border-slate-200/60 bg-white px-5 py-3.5 flex items-center">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold mr-2.5">7</span>
                <h3 className="font-black text-slate-400 tracking-widest text-[10px] uppercase">HUMAN REVIEW & VERIFICATION</h3>
              </div>

              <div className="p-5">
                <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-xs">Review Panel Action Slots</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Sign off on the completed video output or reject it with error context details back to the workflow engine.</p>
                  </div>
                  
                  {/* Actions Approvals */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleReject}
                      disabled={job.status === "FAILED"}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition cursor-pointer border ${
                        job.status === "FAILED"
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-white border-rose-200 text-rose-600 hover:bg-rose-50/60"
                      }`}
                      id="btn-reject-job"
                    >
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                      <span>Reject Job</span>
                    </button>

                    <button
                      onClick={handleApprove}
                      disabled={job.status === "COMPLETED"}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center space-x-1.5 transition text-white cursor-pointer shadow-xs ${
                        job.status === "COMPLETED"
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                      }`}
                      id="btn-approve-job"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Approve & Finalize</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-slate-50/30">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Final Job Status Evaluation</span>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Review evaluation code status:</span>
                    <span className={`font-mono font-bold px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                      job.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : job.status === "FAILED"
                        ? "bg-rose-50 text-rose-700 border border-rose-100"
                        : "bg-blue-50 text-blue-700 border border-blue-100 animate-pulse"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* RIGHT SIDEBAR: Workspace Control Center & Interactive Status Simulator */}
          <div className="space-y-8">
            
            {/* Control Center & Mode Toggle */}
            <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
              <div className="p-5 border-b border-slate-200/60 bg-white">
                <div className="flex items-center space-x-2">
                  <Sliders className="h-4.5 w-4.5 text-blue-500" />
                  <h3 className="font-black text-slate-800 tracking-wider text-xs uppercase">STUDIO CONTROL CENTER</h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Simulate any phase of the V1.0 vertical video pipeline.</p>
              </div>

              <div className="p-5 space-y-5">
                
                {/* Manual Status Override buttons */}
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    1. Jump directly to state (Override State)
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <button
                      onClick={() => setJobStatusDirectly("NEW")}
                      className={`p-2 rounded-lg border text-left font-mono font-bold transition cursor-pointer ${
                        job.status === "NEW" 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-xs" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      id="btn-set-new"
                    >
                      NEW
                    </button>
                    <button
                      onClick={() => setJobStatusDirectly("EXTRACTED")}
                      className={`p-2 rounded-lg border text-left font-mono font-bold transition cursor-pointer ${
                        job.status === "EXTRACTED" 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-xs" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      id="btn-set-extracted"
                    >
                      EXTRACTED
                    </button>
                    <button
                      onClick={() => setJobStatusDirectly("OCR_READY")}
                      className={`p-2 rounded-lg border text-left font-mono font-bold transition cursor-pointer ${
                        job.status === "OCR_READY" 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-xs" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      id="btn-set-ocr-ready"
                    >
                      OCR_READY
                    </button>
                    <button
                      onClick={() => setJobStatusDirectly("TEXT_READY")}
                      className={`p-2 rounded-lg border text-left font-mono font-bold transition cursor-pointer ${
                        job.status === "TEXT_READY" 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-xs" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      id="btn-set-text-ready"
                    >
                      TEXT_READY
                    </button>
                    <button
                      onClick={() => setJobStatusDirectly("SCRIPT_READY")}
                      className={`p-2 rounded-lg border text-left font-mono font-bold transition cursor-pointer ${
                        job.status === "SCRIPT_READY" 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-xs" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      id="btn-set-script-ready"
                    >
                      SCRIPT_READY
                    </button>
                    <button
                      onClick={() => setJobStatusDirectly("AUDIO_READY")}
                      className={`p-2 rounded-lg border text-left font-mono font-bold transition cursor-pointer ${
                        job.status === "AUDIO_READY" 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-xs" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      id="btn-set-audio-ready"
                    >
                      AUDIO_READY
                    </button>
                    <button
                      onClick={() => setJobStatusDirectly("VIDEO_READY")}
                      className={`p-2 rounded-lg border text-left font-mono font-bold transition cursor-pointer ${
                        job.status === "VIDEO_READY" 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-xs" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      id="btn-set-video-ready"
                    >
                      VIDEO_READY
                    </button>
                    <button
                      onClick={() => setJobStatusDirectly("REVIEW")}
                      className={`p-2 rounded-lg border text-left font-mono font-bold transition cursor-pointer ${
                        job.status === "REVIEW" 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-xs" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      id="btn-set-review"
                    >
                      REVIEW
                    </button>
                    <button
                      onClick={() => setJobStatusDirectly("COMPLETED")}
                      className={`p-2 rounded-lg border text-left font-mono font-bold transition cursor-pointer ${
                        job.status === "COMPLETED" 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      id="btn-set-completed"
                    >
                      COMPLETED
                    </button>
                    <button
                      onClick={() => setJobStatusDirectly("FAILED")}
                      className={`p-2 rounded-lg border text-left font-mono font-bold transition cursor-pointer ${
                        job.status === "FAILED" 
                          ? "bg-rose-50 border-rose-200 text-rose-700 shadow-xs" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      id="btn-set-failed"
                    >
                      FAILED
                    </button>
                  </div>
                </div>

                {/* Simulate specific FAILED configuration */}
                <div className="pt-4 border-t border-slate-200/60 space-y-3">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    2. Customize Failure Simulation
                  </span>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Failed Stage Label</label>
                    <select
                      value={customErrorStage}
                      onChange={(e) => setCustomErrorStage(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      id="select-failed-stage"
                    >
                      <option value="Source">Source</option>
                      <option value="Extract">Extract</option>
                      <option value="OCR">OCR</option>
                      <option value="Text">Text</option>
                      <option value="Scripts">Scripts</option>
                      <option value="Voice">Voice</option>
                      <option value="Video">Video</option>
                      <option value="Review">Review</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Failure Error Message</label>
                    <input
                      type="text"
                      value={customErrorMessage}
                      onChange={(e) => setCustomErrorMessage(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter a realistic simulation error..."
                      id="input-failed-message"
                    />
                  </div>

                  <button
                    onClick={() => setJobStatusDirectly("FAILED", customErrorStage, customErrorMessage)}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest py-2.5 px-3 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1"
                    id="btn-simulate-fail"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Trigger Custom Failure</span>
                  </button>
                </div>

                {/* Architecture & Interface Clean Boundaries Guide */}
                <div className="pt-4 border-t border-slate-200/60 space-y-2">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    3. V1.0 Architecture Rules
                  </span>
                  <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                    <p className="font-bold text-blue-600">Decoupled Service Interfaces</p>
                    <p>The code is prepared for quick SDK integrations. In Build 1, mock service models have been established at:</p>
                    <p className="font-mono text-slate-500 bg-white border border-slate-200/60 p-1 rounded text-[9px] truncate">src/services/pipeline.ts</p>
                    <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[10px]">
                      <li>Google Cloud Vision OCR integrated, FFmpeg execution.</li>
                      <li>OmniVoice, Gemini API mocks ready.</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Helper Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Info className="h-4.5 w-4.5 text-blue-500" />
                V1.0 Pipeline Quick Reference
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                TomTomLife Quote Factory converts intake media (image/video) containing quotes into high-impact, polished vertical short video feeds. 
              </p>
              
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Production Sequence:</span>
                <div className="text-[11px] space-y-1.5 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                    <span><strong>1. Frame Extraction:</strong> Isolate high-quality keyframes.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                    <span><strong>2. Google Cloud Vision OCR:</strong> Extract characters directly.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                    <span><strong>3. Clean Text & Central Meaning:</strong> Synthesize raw text.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                    <span><strong>4. Voice Over Generation:</strong> Generate realistic male/female formats.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                    <span><strong>5. FFmpeg Synthesis:</strong> Deliver ready 9:16 vertical videos.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Workspace Footer details */}
      <footer className="bg-white border-t border-slate-200/60 py-5 text-center text-[10px] text-slate-400 mt-auto" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>TomTomLife-Quote-Factory V1.0 Internal Production Environment Tool • All Rights Reserved</p>
          <p className="mt-1 font-mono text-[9px] text-slate-400">Build 1 • Offline Mock Sandbox Integration Only</p>
        </div>
      </footer>

    </div>
  );
}
