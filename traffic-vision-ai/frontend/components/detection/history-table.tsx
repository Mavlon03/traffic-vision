"use client";

import { useEffect, useState } from "react";

import { detectionApi } from "@/lib/api";
import type { DetectionResponse } from "@/types";

const PAGE_SIZE = 10;

export function HistoryTable() {
  const [rows, setRows] = useState<DetectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      setError("");

      try {
        const response = await detectionApi.getHistory(page, PAGE_SIZE);
        setRows(response.content ?? []);
        setTotalPages(response.totalPages ?? 0);
        setTotalElements(response.totalElements ?? 0);
      } catch (historyError) {
        setError(
          historyError instanceof Error
            ? historyError.message
            : "History so'rovini o'qib bo'lmadi.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadHistory();
  }, [page]);

  if (loading) {
    return (
      <div className="rounded-[32px] border border-black/10 bg-white/85 p-6 shadow-xl backdrop-blur">
        History yuklanmoqda...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-xl">
        {error}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-black/10 bg-white/85 shadow-xl backdrop-blur">
      <div className="border-b border-black/10 px-6 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-slate-500">
          Aniqlashlar tarixi
        </p>
        <h2 className="mt-2 font-heading text-3xl font-semibold">
          Saqlangan natijalar
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span>Jami yozuvlar: {totalElements}</span>
          <span>
            Sahifa: {totalPages === 0 ? 0 : page + 1} / {Math.max(totalPages, 1)}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-10 text-sm text-slate-600">
          Backend `/api/history` hozircha bo&apos;sh yoki boshqa format qaytaryapti.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-medium">ID</th>
                <th className="px-6 py-4 font-medium">Belgi</th>
                <th className="px-6 py-4 font-medium">Soni</th>
                <th className="px-6 py-4 font-medium">Ishonchlilik</th>
                <th className="px-6 py-4 font-medium">Vaqt</th>
                <th className="px-6 py-4 font-medium">Model</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const topSign = row.detectedSigns[0];
                return (
                  <tr key={row.id ?? index} className="border-t border-black/5">
                    <td className="px-6 py-4 font-mono">{row.id ?? "-"}</td>
                    <td className="px-6 py-4">
                      {topSign?.signType ?? "Belgi topilmadi"}
                    </td>
                    <td className="px-6 py-4">{row.totalSigns}</td>
                    <td className="px-6 py-4 font-mono">
                      {topSign ? `${(topSign.confidence * 100).toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {row.processingTimeMs} ms
                    </td>
                    <td className="px-6 py-4 font-mono">{row.modelVersion ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 px-6 py-4">
          <div className="text-sm text-slate-600">
            {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalElements)} /{" "}
            {totalElements} yozuv
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
              disabled={page === 0}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Oldingi
            </button>

            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              {page + 1}
            </div>

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(current + 1, totalPages - 1))
              }
              disabled={page >= totalPages - 1}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Keyingi
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
