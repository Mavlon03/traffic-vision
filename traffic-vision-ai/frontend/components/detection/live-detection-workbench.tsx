"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import {
  detectionApi,
  getLiveWebSocketUrl,
  normalizeLiveDetectionResponse,
} from "@/lib/api";
import type { DetectedSign, LiveDetectionResponse } from "@/types";

const CAPTURE_INTERVAL_MS = 350;
const MAX_FRAME_WIDTH = 720;
const CONFIDENCE_THRESHOLD = 0.68;
const STABLE_HITS_REQUIRED = 2;
const STABLE_WINDOW_MS = 2200;
const ALERT_COOLDOWN_MS = 5500;
const MAX_ALERT_HISTORY = 4;

type AlertPriority = "high" | "medium" | "low";
type TransportMode = "websocket" | "http";

type LiveAlert = {
  signType: string;
  confidence: number;
  priority: AlertPriority;
  message: string;
  at: number;
};

type DetectionMemory = {
  hits: number;
  lastSeenAt: number;
  lastAnnouncedAt: number;
};

const priorityMap: Record<string, AlertPriority> = {
  stop: "high",
  no_entry: "high",
  pedestrian_crossing: "high",
  school_zone: "high",
  speed_limit_20: "medium",
  speed_limit_30: "medium",
  speed_limit_40: "medium",
  speed_limit_50: "medium",
  speed_limit_60: "medium",
  turn_left: "medium",
  turn_right: "medium",
};

const speechMap: Record<string, string> = {
  stop: "Diqqat. Stop belgisi oldinda.",
  no_entry: "Diqqat. Kirish taqiqlangan belgisi aniqlandi.",
  pedestrian_crossing: "Diqqat. Piyodalar utish joyi oldinda.",
  school_zone: "Diqqat. Maktab hududi belgisi aniqlandi.",
  speed_limit_20: "Tezlik cheklovi yigirma.",
  speed_limit_30: "Tezlik cheklovi uttiz.",
  speed_limit_40: "Tezlik cheklovi qirq.",
  speed_limit_50: "Tezlik cheklovi ellik.",
  speed_limit_60: "Tezlik cheklovi oltmish.",
  turn_left: "Chapga burilish belgisi aniqlandi.",
  turn_right: "Ungga burilish belgisi aniqlandi.",
};

function normalizeSignKey(signType: string) {
  return signType.trim().toLowerCase().replaceAll(" ", "_");
}

function getPriority(signType: string): AlertPriority {
  return priorityMap[normalizeSignKey(signType)] ?? "low";
}

function getSpeechMessage(signType: string) {
  return speechMap[normalizeSignKey(signType)] ?? `${signType} belgisi aniqlandi.`;
}

function getAlertTone(priority: AlertPriority) {
  switch (priority) {
    case "high":
      return "border-rose-300 bg-rose-50 text-rose-800";
    case "medium":
      return "border-amber-300 bg-amber-50 text-amber-900";
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

function isSecureCameraContext() {
  if (typeof window === "undefined") return true;

  return (
    window.isSecureContext ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

export function LiveDetectionWorkbench() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const loopTimeoutRef = useRef<number | null>(null);
  const requestInFlightRef = useRef(false);
  const frameIdRef = useRef(0);
  const memoryRef = useRef<Map<string, DetectionMemory>>(new Map());
  const overlaySizeRef = useRef<{ width: number; height: number } | null>(null);
  const speechVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const [cameraState, setCameraState] = useState<
    "idle" | "ready" | "connecting" | "detecting" | "stopped"
  >("idle");
  const [transport, setTransport] = useState<TransportMode>("websocket");
  const [processing, setProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [lastMeta, setLastMeta] = useState(
    "Camera HTTPS yoki localhost rejimida ochilgach live detection ishlaydi.",
  );
  const [result, setResult] = useState<LiveDetectionResponse | null>(null);
  const [overlaySize, setOverlaySize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [activeAlert, setActiveAlert] = useState<LiveAlert | null>(null);
  const [alertHistory, setAlertHistory] = useState<LiveAlert[]>([]);

  const isCameraOn =
    cameraState === "ready" ||
    cameraState === "connecting" ||
    cameraState === "detecting";
  const isDetecting = cameraState === "detecting";

  const sortedSigns = useMemo(() => {
    if (!result) return [];
    return [...result.detectedSigns].sort((a, b) => b.confidence - a.confidence);
  }, [result]);

  function syncOverlaySize(nextSize: { width: number; height: number } | null) {
    overlaySizeRef.current = nextSize;
    setOverlaySize(nextSize);
  }

  function stopLoop() {
    if (loopTimeoutRef.current !== null) {
      window.clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }
  }

  function stopSocket() {
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onmessage = null;
      socketRef.current.onerror = null;
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
    }
  }

  function stopCamera() {
    stopLoop();
    stopSocket();
    requestInFlightRef.current = false;
    setProcessing(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    memoryRef.current.clear();
    syncOverlaySize(null);
    setCameraState("stopped");
    setLastMeta("Camera toxtatildi.");
  }

  function pickSpeechVoice(voices: SpeechSynthesisVoice[]) {
    const normalizedVoices = voices.filter((voice) => voice.lang);

    return (
      normalizedVoices.find((voice) => voice.lang.toLowerCase() === "uz-uz") ??
      normalizedVoices.find((voice) => voice.lang.toLowerCase().startsWith("uz")) ??
      normalizedVoices.find((voice) => voice.lang.toLowerCase().startsWith("tr")) ??
      normalizedVoices.find((voice) => voice.lang.toLowerCase().startsWith("ru")) ??
      normalizedVoices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
      normalizedVoices[0] ??
      null
    );
  }

  function prepareSpeechVoice() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = pickSpeechVoice(voices);
    speechVoiceRef.current = selectedVoice;
    return selectedVoice;
  }

  function pushAlert(sign: DetectedSign) {
    const priority = getPriority(sign.signType);
    const alert: LiveAlert = {
      signType: sign.signType,
      confidence: sign.confidence,
      priority,
      message: getSpeechMessage(sign.signType),
      at: Date.now(),
    };

    setActiveAlert(alert);
    setAlertHistory((current) => [alert, ...current].slice(0, MAX_ALERT_HISTORY));
    setLastMeta(`${sign.signType} boyicha ogohlantirish chiqarildi.`);

    if (soundEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
      const selectedVoice = speechVoiceRef.current ?? prepareSpeechVoice();
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      const utterance = new SpeechSynthesisUtterance(alert.message);
      utterance.lang = selectedVoice?.lang ?? "uz-UZ";
      utterance.voice = selectedVoice;
      utterance.rate = priority === "high" ? 1 : 1.05;
      utterance.pitch = priority === "high" ? 0.9 : 1;
      window.speechSynthesis.speak(utterance);
    }
  }

  function processStableDetections(nextResult: LiveDetectionResponse) {
    const now = Date.now();
    const eligibleSigns = [...nextResult.detectedSigns]
      .filter((sign) => sign.confidence >= CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.confidence - a.confidence);

    for (const [signType, memory] of memoryRef.current.entries()) {
      if (now - memory.lastSeenAt > STABLE_WINDOW_MS * 2) {
        memoryRef.current.delete(signType);
      }
    }

    let announced = false;

    eligibleSigns.forEach((sign) => {
      const key = normalizeSignKey(sign.signType);
      const previous = memoryRef.current.get(key);
      const isStillFresh =
        previous !== undefined && now - previous.lastSeenAt <= STABLE_WINDOW_MS;
      const nextMemory: DetectionMemory = {
        hits: isStillFresh ? previous.hits + 1 : 1,
        lastSeenAt: now,
        lastAnnouncedAt: previous?.lastAnnouncedAt ?? 0,
      };

      if (
        !announced &&
        nextMemory.hits >= STABLE_HITS_REQUIRED &&
        now - nextMemory.lastAnnouncedAt >= ALERT_COOLDOWN_MS
      ) {
        nextMemory.lastAnnouncedAt = now;
        announced = true;
        pushAlert(sign);
      }

      memoryRef.current.set(key, nextMemory);
    });
  }

  function applyDetection(nextResult: LiveDetectionResponse) {
    setResult(nextResult);

    if (nextResult.detectedSigns.length > 0) {
      setLastMeta(
        `${nextResult.detectedSigns.length} ta belgi topildi. ${nextResult.processingTimeMs} ms`,
      );
    } else {
      setLastMeta("Hozircha ishonchli belgi aniqlanmadi.");
    }

    processStableDetections(nextResult);
  }

  const readFrame = useEffectEvent(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      throw new Error("Camera elementi topilmadi.");
    }

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      throw new Error("Camera stream hali tayyor emas.");
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    if (!sourceWidth || !sourceHeight) {
      throw new Error("Camera frame o'lchami olinmadi.");
    }

    const targetWidth = Math.min(sourceWidth, MAX_FRAME_WIDTH);
    const targetHeight = Math.round((sourceHeight / sourceWidth) * targetWidth);

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    syncOverlaySize({ width: targetWidth, height: targetHeight });

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context ochilmadi.");
    }

    context.drawImage(video, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.72);
    });

    if (!blob) {
      throw new Error("Frame tayyorlab bo'lmadi.");
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const content = typeof reader.result === "string" ? reader.result : "";
        const encoded = content.split(",")[1];

        if (!encoded) {
          reject(new Error("Frame base64 formatga o'tmadi."));
          return;
        }

        resolve(encoded);
      };

      reader.onerror = () => reject(new Error("Frame o'qilmadi."));
      reader.readAsDataURL(blob);
    });

    return {
      base64,
      file: new File([blob], `live-frame-${frameIdRef.current}.jpg`, {
        type: "image/jpeg",
      }),
    };
  });

  const captureFrame = useEffectEvent(async () => {
    if (requestInFlightRef.current) {
      return;
    }

    requestInFlightRef.current = true;
    setProcessing(true);
    setCameraError("");

    try {
      const { base64, file } = await readFrame();
      const frameId = frameIdRef.current++;

      if (transport === "websocket" && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            frame: base64,
            frame_id: frameId,
          }),
        );
        return;
      }

      const nextResult = await detectionApi.detectLiveFrame(file, frameId);
      applyDetection(nextResult);
      requestInFlightRef.current = false;
      setProcessing(false);
    } catch (error) {
      requestInFlightRef.current = false;
      setProcessing(false);
      setCameraError(
        error instanceof Error ? error.message : "Live detection vaqtida xato yuz berdi.",
      );
    }
  });

  async function connectWebSocket() {
    const wsUrl = getLiveWebSocketUrl();

    if (!wsUrl) {
      setTransport("http");
      setCameraState("detecting");
      setLastMeta("WebSocket sozlanmagan. HTTP frame mode ishga tushdi.");
      return;
    }

    setCameraState("connecting");
    setTransport("websocket");
    setLastMeta("Python WebSocket serveriga ulanmoqda...");

    await new Promise<void>((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          setCameraState("detecting");
          setLastMeta("WebSocket ulandi. Live detection boshlandi.");
          finish();
        };

        socket.onmessage = (event) => {
          const payload = JSON.parse(event.data) as
            | { error?: string }
            | Record<string, unknown>;

          if ("error" in payload && typeof payload.error === "string" && payload.error) {
            setCameraError(payload.error);
            requestInFlightRef.current = false;
            setProcessing(false);
            return;
          }

          const nextResult = normalizeLiveDetectionResponse(
            payload as Parameters<typeof normalizeLiveDetectionResponse>[0],
          );
          applyDetection(nextResult);
          requestInFlightRef.current = false;
          setProcessing(false);
        };

        socket.onerror = () => {
          stopSocket();
          setTransport("http");
          setCameraState("detecting");
          setLastMeta("WebSocket ulanmadi. HTTP frame mode ishga tushdi.");
          finish();
        };

        socket.onclose = () => {
          requestInFlightRef.current = false;
          setProcessing(false);

          if (!settled) {
            setTransport("http");
            setCameraState("detecting");
            setLastMeta("WebSocket uzildi. HTTP frame mode ishga tushdi.");
            finish();
            return;
          }

          if (cameraState === "detecting") {
            setTransport("http");
            setLastMeta("WebSocket uzildi. HTTP frame mode davom etadi.");
          }
        };
      } catch {
        setTransport("http");
        setCameraState("detecting");
        setLastMeta("WebSocket ochilmadi. HTTP frame mode ishga tushdi.");
        finish();
      }
    });
  }

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    prepareSpeechVoice();

    const handleVoicesChanged = () => {
      prepareSpeechVoice();
    };

    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, []);

  useEffect(() => {
    const mountedVideo = videoRef.current;

    return () => {
      stopLoop();
      stopSocket();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (mountedVideo) {
        mountedVideo.srcObject = null;
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!isDetecting) {
      stopLoop();
      return;
    }

    let cancelled = false;

    const tick = async () => {
      await captureFrame();

      if (!cancelled) {
        loopTimeoutRef.current = window.setTimeout(tick, CAPTURE_INTERVAL_MS);
      }
    };

    void tick();

    return () => {
      cancelled = true;
      stopLoop();
    };
  }, [isDetecting]);

  async function handleStartCamera() {
    if (!isSecureCameraContext()) {
      setCameraError(
        "Telefon kamerasi uchun sayt HTTPS yoki localhost orqali ochilishi shart.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Brauzer getUserMedia API ni qo'llab-quvvatlamaydi.");
      return;
    }

    if (isCameraOn) {
      setCameraState("ready");
      setLastMeta("Camera allaqachon tayyor.");
      return;
    }

    setCameraError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
          syncOverlaySize({
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
          });
        }
      }

      setCameraState("ready");
      setLastMeta("Camera tayyor. Endi live detectionni yoqing.");
    } catch (error) {
      setCameraError(
        error instanceof Error
          ? error.message
          : "Kameraga ruxsat berilmadi yoki qurilma topilmadi.",
      );
    }
  }

  async function handleToggleDetection() {
    if (!isCameraOn) {
      setCameraError("Avval camerani ishga tushiring.");
      return;
    }

    if (isDetecting) {
      stopLoop();
      stopSocket();
      requestInFlightRef.current = false;
      setProcessing(false);
      setCameraState("ready");
      setLastMeta("Jonli detection to'xtatildi.");
      return;
    }

    frameIdRef.current = 0;
    setCameraError("");
    await connectWebSocket();
  }

  const topSign = sortedSigns[0] ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[32px] border border-black/10 bg-white/85 p-5 shadow-xl backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-slate-500">
              Mobile Live
            </p>
            <h2 className="mt-2 font-heading text-3xl font-semibold">
              Camera orqali real-time detection
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleStartCamera}
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              {isCameraOn ? "Camera Ready" : "Start Camera"}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleToggleDetection();
              }}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              {isDetecting ? "Pause Live" : "Start Live"}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Stop
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            onClick={() => setSoundEnabled((current) => !current)}
            className={`rounded-full px-4 py-2 font-medium ${
              soundEnabled
                ? "bg-amber-300 text-slate-950"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {soundEnabled ? "Sound On" : "Sound Off"}
          </button>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
            Transport: {transport === "websocket" ? "WebSocket" : "HTTP frame"}
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
            Interval: {CAPTURE_INTERVAL_MS} ms
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
            Cooldown: {ALERT_COOLDOWN_MS / 1000} s
          </div>
        </div>

        {!isSecureCameraContext() ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Telefon kamerasi brauzerda faqat `https://` yoki `localhost` orqali ishlaydi.
          </div>
        ) : null}

        <div className="relative mt-6 overflow-hidden rounded-[28px] bg-slate-950">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-[9/16] w-full bg-slate-950 object-cover sm:aspect-[4/3]"
          />
          <canvas ref={canvasRef} className="hidden" />

          {overlaySize ? (
            <div className="pointer-events-none absolute inset-0">
              {sortedSigns.map((sign, index) => {
                const tone = getPriority(sign.signType);
                const borderClass =
                  tone === "high"
                    ? "border-rose-400 bg-rose-500/15"
                    : tone === "medium"
                      ? "border-amber-300 bg-amber-400/15"
                      : "border-sky-300 bg-sky-400/10";

                return (
                  <div
                    key={`${sign.signType}-${index}`}
                    className={`absolute rounded-2xl border-2 ${borderClass}`}
                    style={{
                      left: `${(sign.x / overlaySize.width) * 100}%`,
                      top: `${(sign.y / overlaySize.height) * 100}%`,
                      width: `${(sign.width / overlaySize.width) * 100}%`,
                      height: `${(sign.height / overlaySize.height) * 100}%`,
                    }}
                  >
                    <div className="absolute -top-9 left-0 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-medium text-white">
                      {sign.signType} {(sign.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-4">
            {activeAlert ? (
              <div
                className={`max-w-md rounded-2xl border px-4 py-3 text-sm shadow-lg ${getAlertTone(
                  activeAlert.priority,
                )}`}
              >
                <div className="font-medium">{activeAlert.signType}</div>
                <div className="mt-1">{activeAlert.message}</div>
              </div>
            ) : (
              <div className="rounded-full bg-black/45 px-4 py-2 text-xs font-medium text-white">
                Live alert shu yerda chiqadi
              </div>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-white/65">
                Status
              </div>
              <div className="mt-1 text-sm">{lastMeta}</div>
            </div>
            <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium">
              {processing
                ? "Analyzing..."
                : isDetecting
                  ? "Live"
                  : cameraState === "connecting"
                    ? "Connecting"
                    : "Standby"}
            </div>
          </div>
        </div>

        {cameraError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {cameraError}
          </div>
        ) : null}
      </section>

      <section className="space-y-6">
        <div className="rounded-[32px] bg-slate-950 p-6 text-white shadow-xl">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-amber-300">
            Live Engine
          </p>
          <div className="mt-5 grid gap-3 text-sm">
            <div className="rounded-2xl bg-white/8 p-4">
              Priority path: <span className="font-mono">WebSocket /ws/detect</span>
            </div>
            <div className="rounded-2xl bg-white/8 p-4">
              Fallback path: <span className="font-mono">POST /detect/frame</span>
            </div>
            <div className="rounded-2xl bg-white/8 p-4">
              Stable rule: <span className="font-mono">{STABLE_HITS_REQUIRED} ta frame</span>
            </div>
            <div className="rounded-2xl bg-white/8 p-4">
              Confidence:{" "}
              <span className="font-mono">
                {(CONFIDENCE_THRESHOLD * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-black/10 bg-white/85 p-6 shadow-xl backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-slate-500">
            Latest Detection
          </p>
          {topSign ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-100 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Top Sign
                </div>
                <div className="mt-2 font-heading text-3xl font-semibold">
                  {topSign.signType}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-100 px-4 py-3">
                  Confidence
                  <div className="mt-2 font-mono text-lg">
                    {(topSign.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-100 px-4 py-3">
                  Processing
                  <div className="mt-2 font-mono text-lg">
                    {result?.processingTimeMs ?? 0} ms
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm">
                Critical signs:{" "}
                <span className="font-mono">
                  {result?.criticalSignTypes?.join(", ") || "-"}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              Camera ishga tushgach oxirgi detection shu bo&apos;limda ko&apos;rinadi.
            </p>
          )}
        </div>

        <div className="rounded-[32px] border border-black/10 bg-white/85 p-6 shadow-xl backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-slate-500">
            Alert History
          </p>
          {alertHistory.length > 0 ? (
            <div className="mt-4 space-y-3">
              {alertHistory.map((alert) => (
                <div
                  key={`${alert.signType}-${alert.at}`}
                  className={`rounded-2xl border px-4 py-3 text-sm ${getAlertTone(
                    alert.priority,
                  )}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{alert.signType}</span>
                    <span className="font-mono text-xs">
                      {(alert.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1">{alert.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              Stable detection chiqqanda ogohlantirishlar shu yerda jamlanadi.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
