"use client";

import { ChangeEvent, useEffect, useState } from "react";

import { modelApi } from "@/lib/api";
import type { ManagedModel, ModelRegistryResponse } from "@/types";

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ModelManager() {
  const [registry, setRegistry] = useState<ModelRegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadModels() {
    setLoading(true);
    setError("");

    try {
      const response = await modelApi.getRegistry();
      setRegistry(response);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Model ro'yxatini olib bo'lmadi.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadModels();
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setMessage("");

    try {
      await modelApi.upload(file);
      setMessage("Model muvaffaqiyatli yuklandi.");
      await loadModels();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Modelni yuklab bo'lmadi.",
      );
    } finally {
      event.target.value = "";
      setUploading(false);
    }
  }

  async function handleSetPrimary(model: ManagedModel) {
    setError("");
    setMessage("");

    try {
      await modelApi.setPrimary(model.name);
      setMessage(`${model.name} asosiy model qilindi.`);
      await loadModels();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Asosiy modelni almashtirib bo'lmadi.",
      );
    }
  }

  async function handleToggleFallback(model: ManagedModel) {
    setError("");
    setMessage("");

    try {
      await modelApi.setFallback(model.name, !model.isFallback);
      setMessage(
        !model.isFallback
          ? `${model.name} qo'shimcha qidiruvga qo'shildi.`
          : `${model.name} qo'shimcha qidiruvdan olib tashlandi.`,
      );
      await loadModels();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Model sozlamasini yangilab bo'lmadi.",
      );
    }
  }

  async function handleDelete(model: ManagedModel) {
    setError("");
    setMessage("");

    try {
      await modelApi.remove(model.name);
      setMessage(`${model.name} o'chirildi.`);
      await loadModels();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Modelni o'chirib bo'lmadi.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/8 bg-[#111111] p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-amber-300">
              Model boshqaruvi
            </p>
            <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight">
              Asosiy va qo&apos;shimcha modellarning nazorati
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              Hozirgi model ishlashda davom etadi. Yangi model qo&apos;shsangiz, uni
              qo&apos;shimcha qidiruv uchun yoqishingiz mumkin. Tizim avval asosiy
              modeldan, natija topmasa keyin qo&apos;shimcha modeldan qidiradi.
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200">
            {uploading ? "Yuklanmoqda..." : "Yangi model yuklash"}
            <input
              type="file"
              accept=".pt"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}
      </section>

      {loading ? (
        <div className="rounded-[24px] border border-white/8 bg-[#111111] p-6 text-slate-300">
          Modellar yuklanmoqda...
        </div>
      ) : null}

      {!loading && registry ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-white/8 bg-[#111111] p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Hozirgi holat
            </div>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-white/8 bg-[#171717] px-4 py-4">
                <div className="text-sm text-slate-400">Asosiy model</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {registry.primaryModel || "-"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#171717] px-4 py-4">
                <div className="text-sm text-slate-400">Qo&apos;shimcha modellar</div>
                <div className="mt-2 text-base text-white">
                  {registry.fallbackModels.length > 0
                    ? registry.fallbackModels.join(", ")
                    : "Hozircha yo'q"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#171717] px-4 py-4">
                <div className="text-sm text-slate-400">Jami modellar</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {registry.models.length}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-[#111111] p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Model ro&apos;yxati
            </div>
            <div className="mt-5 space-y-4">
              {registry.models.map((model) => (
                <div
                  key={model.name}
                  className="rounded-2xl border border-white/8 bg-[#171717] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-white">
                          {model.name}
                        </div>
                        {model.isPrimary ? (
                          <span className="rounded-full bg-amber-300 px-2.5 py-1 text-xs font-semibold text-slate-950">
                            Asosiy
                          </span>
                        ) : null}
                        {model.isFallback ? (
                          <span className="rounded-full bg-blue-500 px-2.5 py-1 text-xs font-semibold text-white">
                            Qo&apos;shimcha qidiruv
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm text-slate-400">{model.path}</div>
                      <div className="mt-2 text-sm text-slate-500">
                        Hajmi: {formatBytes(model.sizeBytes)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!model.isPrimary ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(model)}
                          className="rounded-xl border border-amber-300/40 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-300/10"
                        >
                          Asosiy qilish
                        </button>
                      ) : null}

                      {!model.isPrimary ? (
                        <button
                          type="button"
                          onClick={() => handleToggleFallback(model)}
                          className="rounded-xl border border-blue-500/40 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/10"
                        >
                          {model.isFallback
                            ? "Qo'shimcha qidiruvdan olish"
                            : "Qo'shimcha qidiruvga qo'shish"}
                        </button>
                      ) : null}

                      {!model.isPrimary ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(model)}
                          className="rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
                        >
                          O&apos;chirish
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
