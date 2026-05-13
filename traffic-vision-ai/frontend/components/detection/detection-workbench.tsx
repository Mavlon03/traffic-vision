"use client";

import { ChangeEvent, useMemo, useState } from "react";

import { detectionApi } from "@/lib/api";
import type { DetectionResponse } from "@/types";

export function DetectionWorkbench() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bestSign = useMemo(() => result?.detectedSigns?.[0] ?? null, [result]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setResult(null);
    setError("");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : null);
  }

  async function handleDetect() {
    if (!file) {
      setError("Avval rasm tanlang.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await detectionApi.detect(file);
      setResult(response);
    } catch (detectError) {
      setError(
        detectError instanceof Error
          ? detectError.message
          : "Detection vaqtida xato yuz berdi.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[32px] border border-black/10 bg-white/85 p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-slate-500">
              Detection
            </p>
            <h2 className="mt-2 font-heading text-3xl font-semibold">
              YOLOv8 inferenceni tekshirish
            </h2>
          </div>
          <button
            type="button"
            onClick={handleDetect}
            disabled={!file || loading}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Analiz qilinmoqda..." : "Detect now"}
          </button>
        </div>

        <label className="mt-6 flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center">
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected preview"
              className="max-h-80 rounded-3xl object-contain shadow-lg"
            />
          ) : (
            <>
              <span className="font-heading text-2xl font-semibold">
                Rasm yuklang
              </span>
              <span className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
                JPG, PNG yoki WebP yuboring. Python servis 10MB gacha qabul qiladi.
              </span>
            </>
          )}
        </label>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </section>

      <section className="space-y-6">
        <div className="rounded-[32px] border border-black/10 bg-slate-950 p-6 text-white shadow-xl">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-amber-300">
            Best Match
          </p>
          {bestSign ? (
            <div className="mt-5 space-y-4">
              <div>
                  <div className="text-sm text-slate-400">Sign Type</div>
                  <div className="font-heading text-3xl font-bold">
                    {bestSign.signType}
                  </div>
                </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl bg-white/8 p-4">
                  <div className="text-slate-400">Confidence</div>
                  <div className="mt-2 font-mono text-xl">
                    {(bestSign.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-2xl bg-white/8 p-4">
                  <div className="text-slate-400">Box</div>
                  <div className="mt-2 font-mono text-xl">
                    {bestSign.width} x {bestSign.height}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-white/8 p-4 text-sm">
                <div className="text-slate-400">Location</div>
                <div className="mt-2 font-mono">
                  x: {bestSign.x}, y: {bestSign.y}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-slate-300">
              Natija shu yerda chiqadi. Hozircha rasm yuborilmagan yoki
              backenddan detection qaytmadi.
            </p>
          )}
        </div>

        <div className="rounded-[32px] border border-black/10 bg-white/85 p-6 shadow-xl backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-slate-500">
            Response Meta
          </p>
          {result ? (
            <div className="mt-4 grid gap-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-100 px-4 py-3">
                Total signs: <span className="font-mono">{result.totalSigns}</span>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3">
                Processing:{" "}
                <span className="font-mono">{result.processingTimeMs} ms</span>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3">
                Model: <span className="font-mono">{result.modelVersion ?? "-"}</span>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3">
                Image size:{" "}
                <span className="font-mono">
                  {result.imageSize
                    ? `${result.imageSize[0]} x ${result.imageSize[1]}`
                    : "-"}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              Detection javobidagi meta ma&apos;lumotlar shu bo&apos;limda
              ko&apos;rinadi.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
