
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TombolHapusProps = {
  id: string;
};

export default function TombolHapus({ id }: TombolHapusProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleHapus() {
    const yakin = window.confirm(
      "Apakah Anda yakin ingin menghapus permintaan ini beserta dokumennya?"
    );

    if (!yakin) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/permintaan/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const hasil = await response.json().catch(() => null);
        throw new Error(hasil?.message || "Gagal menghapus data permintaan.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleHapus}
        disabled={loading}
        className="inline-flex rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Menghapus..." : "Hapus"}
      </button>

      {error && (
        <p className="mt-1 max-w-40 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
