"use client";

import { useEffect, useState } from "react";

import { detectionApi } from "@/lib/api";
import type { DetectionResponse } from "@/types";

export function HistoryTable() {
  const [rows, setRows] = useState<DetectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await detectionApi.getHistory();
        setRows(response.content ?? []);
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
  }, []);

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
          Detection History
        </p>
        <h2 className="mt-2 font-heading text-3xl font-semibold">
          Saqlangan natijalar
        </h2>
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
                <th className="px-6 py-4 font-medium">Sign</th>
                <th className="px-6 py-4 font-medium">Count</th>
                <th className="px-6 py-4 font-medium">Confidence</th>
                <th className="px-6 py-4 font-medium">Time</th>
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
                      {topSign?.signType ?? "No sign"}
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
    </div>
  );
}
