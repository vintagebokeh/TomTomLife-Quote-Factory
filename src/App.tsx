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
  Maximize2
} from "lucide-react";
import { QuoteJob, JobStatus, ScriptVariants } from "./types";
import { initialMockJob } from "./mockData";
import { services } from "./services/pipeline";

export default function App() {
  // Main state holding the active job
  const [job, setJob] = useState<QuoteJob>({ ...initialMockJob });

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

  // Audio simulation refs/state for visual feedback
  const animationFrameId = useRef<number | null>(null);
  const [audioWaveform, setAudioWaveform] = useState<number[]>([12, 24, 8, 16, 40, 18, 30, 10]);

  // Auto-notification helper
  const notify = (message: string, type: "success" | "error" | "info" = "info") => {
    setShowNotification({ message, type });
    setTimeout(() => {
      setShowNotification(null);
    }, 4000);
  };

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
  const setJobStatusDirectly = (status: JobStatus, failedStage?: string, errorMsg?: string) => {
    setJob((prev) => {
      const updated = { ...prev, status };
      if (status === "FAILED") {
        updated.failedStage = failedStage || customErrorStage;
        updated.errorMessage = errorMsg || customErrorMessage;
      } else {
        delete updated.failedStage;
        delete updated.errorMessage;
      }
      return updated;
    });
    notify(`Status switched to ${status}`, "info");
  };

  // Interactive step-by-step pipeline execution simulator
  const runNextPipelineStep = async () => {
    if (isSimulating) return;
    setIsSimulating(true);

    try {
      if (job.status === "NEW") {
        setJob((prev) => ({ ...prev, status: "EXTRACTED" }));
        notify("Frame extraction completed successfully.", "success");
      } else if (job.status === "EXTRACTED") {
        setJob((prev) => ({ ...prev, status: "OCR_READY" }));
        notify("OCR extraction succeeded. RAW text loaded.", "success");
      } else if (job.status === "OCR_READY") {
        // Simulating the OCR Clean Text generation
        const ocrData = await services.ocr.extractText(job.sourceUrl);
        setJob((prev) => ({
          ...prev,
          rawOcr: ocrData.rawOcr,
          cleanText: ocrData.cleanText,
          status: "TEXT_READY"
        }));
        notify("Clean Text compiled and formatted.", "success");
      } else if (job.status === "TEXT_READY") {
        // Extract meaning
        const coreMeaning = await services.meaning.extractCoreMeaning(job.cleanText);
        setJob((prev) => ({
          ...prev,
          coreMeaning,
          status: "SCRIPT_READY"
        }));
        notify("Core Meaning synthesized.", "success");
      } else if (job.status === "SCRIPT_READY") {
        // Generate scripts
        const scripts = await services.script.generateScripts(job.coreMeaning);
        setJob((prev) => ({
          ...prev,
          scripts,
          status: "AUDIO_READY"
        }));
        notify("Three creative scripts drafted.", "success");
      } else if (job.status === "AUDIO_READY") {
        // Voice Slot synthesis
        setJob((prev) => ({
          ...prev,
          femaleVoice: { ...prev.femaleVoice, status: "GENERATED" },
          maleVoice: { ...prev.maleVoice, status: "GENERATED" },
          status: "VIDEO_READY"
        }));
        notify("V1 Voice slots generated successfully.", "success");
      } else if (job.status === "VIDEO_READY") {
        // Video render step
        setIsRenderingVideo(true);
        let prog = 0;
        const interval = setInterval(() => {
          prog += 10;
          setVideoRenderingProgress(prog);
          if (prog >= 100) {
            clearInterval(interval);
            setIsRenderingVideo(false);
            setVideoRenderingProgress(0);
            setJob((prev) => ({
              ...prev,
              videoStatus: "READY",
              status: "REVIEW"
            }));
            notify("Vertical video compilation finished! Assigned to human review.", "success");
          }
        }, 150);
        return;
      } else if (job.status === "REVIEW") {
        setJob((prev) => ({ ...prev, status: "COMPLETED" }));
        notify("Job approved & completed!", "success");
      } else {
        // If completed or failed, reset to beginning
        resetToInitialMock();
        notify("Workflow reset to default mock state.", "info");
      }
    } catch (e: any) {
      setJob((prev) => ({
        ...prev,
        status: "FAILED",
        failedStage: "AUTOMATED_PIPELINE",
        errorMessage: e.message || "An unexpected pipeline stage failure occurred."
      }));
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
    const interval = setInterval(() => {
      prog += 20;
      setVideoRenderingProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        setIsRenderingVideo(false);
        setVideoRenderingProgress(0);
        setJob((prev) => ({
          ...prev,
          videoStatus: "READY",
          status: "REVIEW"
        }));
        notify("Video composed at 1080x1920 MP4 resolution. Ready for Review.", "success");
      }
    }, 200);
  };

  const resetToInitialMock = () => {
    setJob({ ...initialMockJob });
    setPlayingVoice(null);
    setPlayingVideo(false);
    notify("Job loaded: Q000001 Workspace reset.", "info");
  };

  // Update handlers for edited values
  const handleCleanTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJob((prev) => ({ ...prev, cleanText: e.target.value }));
  };

  const handleCoreMeaningChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJob((prev) => ({ ...prev, coreMeaning: e.target.value }));
  };

  const handleScriptChange = (variant: "scriptA" | "scriptB" | "scriptC", text: string) => {
    setJob((prev) => ({
      ...prev,
      scripts: {
        ...prev.scripts,
        [variant]: text
      }
    }));
  };

  // Toggle voice audio simulator play
  const togglePlayVoice = (voice: "female" | "male") => {
    if (playingVoice === voice) {
      setPlayingVoice(null);
    } else {
      setPlayingVoice(voice);
      setPlayingVideo(false);
    }
  };

  // Review Actions
  const handleApprove = () => {
    setJob((prev) => ({ ...prev, status: "COMPLETED" }));
    notify("Job Q000001 status set to COMPLETED. Ready for publication.", "success");
  };

  const handleReject = () => {
    setJob((prev) => ({
      ...prev,
      status: "FAILED",
      failedStage: "Human Review",
      errorMessage: "Content was rejected by the supervisor: Pronunciation or styling requires adjustments."
    }));
    notify("Job Q000001 was rejected. Status changed to FAILED.", "error");
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
                  V1.0 — Build 1
                </span>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                TomTomLife-Quote-Factory
              </h1>
            </div>
          </div>

          {/* Quick Actions & Job Quick Stats */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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
                  <h3 className="font-black text-slate-400 tracking-widest text-[10px] uppercase">SOURCE MEDIA</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">ID: {job.contentId}</span>
              </div>
              
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Media Details */}
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Source Filename</span>
                      <p className="text-slate-800 font-mono text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 inline-block break-all select-all">
                        {job.sourceFilename}
                      </p>
                    </div>

                    <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Source Type</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase font-mono">
                        {job.sourceType}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Current Workflow Status</span>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          job.status === "COMPLETED" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : job.status === "FAILED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                        }`}>
                          {job.status}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="p-3.5 bg-blue-50/40 border border-blue-100/60 rounded-xl text-xs text-blue-900">
                        <p className="font-bold flex items-center gap-1.5 text-blue-950 mb-1">
                          <Info className="h-3.5 w-3.5 shrink-0" />
                          About this Intake Media
                        </p>
                        This video clip is a high-quality keynote recording. Extracting frames will provide key slides and presenter close-ups for generating beautiful overlay quote designs.
                      </div>
                    </div>
                  </div>

                  {/* Media Preview Placeholder */}
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Media Preview Placeholder</span>
                    <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-200/80 shadow-inner group flex items-center justify-center">
                      <img 
                        src={job.sourceUrl} 
                        alt="Intake video frame thumbnail" 
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-all duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                      
                      {/* Play/Overlay element to represent video */}
                      <div className="z-10 text-center p-4">
                        <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 mb-2">
                          <Video className="h-4.5 w-4.5" />
                        </div>
                        <p className="text-white font-bold text-xs tracking-wider">Source Intake Preview</p>
                        <p className="text-slate-300 text-[10px] mt-1 font-mono">{job.sourceFilename}</p>
                      </div>

                      <span className="absolute bottom-3 right-3 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-white">
                        0:15 Secs
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: OCR */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" id="section-ocr">
              <div className="border-b border-slate-200/60 bg-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold">2</span>
                  <h3 className="font-black text-slate-400 tracking-widest text-[10px] uppercase">OCR (OPTICAL CHARACTER RECOGNITION)</h3>
                </div>
                <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-200/60 font-bold uppercase tracking-wider">PaddleOCR V1</span>
              </div>

              <div className="p-5 space-y-6">
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
                        className="w-full h-full min-h-[140px] p-3 bg-slate-50 text-slate-400 font-mono text-xs rounded-lg border border-slate-200 cursor-not-allowed resize-none focus:outline-hidden"
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
              </div>
            </section>

            {/* Section 3: CORE MEANING */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" id="section-core-meaning">
              <div className="border-b border-slate-200/60 bg-white px-5 py-3.5 flex items-center">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold mr-2.5">3</span>
                <h3 className="font-black text-slate-400 tracking-widest text-[10px] uppercase">CORE MEANING</h3>
              </div>

              <div className="p-5">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Central Message Synthesis
                    </label>
                    <span className="text-[10px] text-slate-400 tracking-wide">Guides script-variant generators</span>
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
                  <h3 className="font-black text-slate-400 tracking-widest text-[10px] uppercase">VOICE GENERATION</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">Fixed V1 Voice Slots</span>
              </div>

              <div className="p-5">
                <p className="text-[11px] text-slate-500 mb-4">
                  Generate high-fidelity audio versions of the selected script variants using fixed voice profiles. Select a track to preview voice output.
                </p>

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
                        onClick={() => togglePlayVoice("female")}
                        className={`mt-2 w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          playingVoice === "female"
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
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
                        onClick={() => togglePlayVoice("male")}
                        className={`mt-2 w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          playingVoice === "male"
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
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
                    </div>
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
                      <li>PaddleOCR, FFmpeg execution omitted.</li>
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
                    <span><strong>2. PaddleOCR:</strong> Extract characters directly.</span>
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
