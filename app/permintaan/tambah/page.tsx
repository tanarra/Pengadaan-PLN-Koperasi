
"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Unit = {
  id: string;
  nama_unit: string;
};

type Item = {
  nama_item: string;
  spesifikasi_item: string;
  jumlah_permintaan: string;
  jenis_item: string;
};

export default function TambahPermintaanPage() {
  const router = useRouter();

  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nomor_surat: "",
    tanggal_surat: "",
    unit_pln_id: "",
    nama_pic: "",
    kontak_pic: "",
    jenis_pengadaan: "",
    nama_pengadaan: "",
    deskripsi_kebutuhan: "",
    lokasi_pengiriman: "",
    tanggal_kebutuhan: "",
  });

  const [file, setFile] = useState<File | null>(null);

  const [items, setItems] = useState<Item[]>([
  {
    nama_item: "",
    spesifikasi_item: "",
    jumlah_permintaan: "1",
    jenis_item: "Barang",
  },
  ]);

    function handleItemChange(
    index: number,
    field: keyof Item,
    value: string
  ) {
    setItems((previous) =>
      previous.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function handleAddItem() {
    setItems((previous) => [
      ...previous,
      {
        nama_item: "",
        spesifikasi_item: "",
        jumlah_permintaan: "1",
        jenis_item: "Barang",
      },
    ]);
  }

  function handleRemoveItem(index: number) {
    setItems((previous) => previous.filter((_, i) => i !== index));
  }


  useEffect(() => {
    async function loadUnits() {
      try {
        const response = await fetch("/api/units");
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error("Gagal mengambil data unit PLN.");
        }

        setUnits(result.data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil data unit PLN."
        );
      } finally {
        setLoadingUnits(false);
      }
    }

    loadUnits();
  }, []);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!file) {
      setError("Surat permintaan PLN wajib diunggah.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("File harus berformat PDF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10 MB.");
      return;
    }

    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, value);
    });

    formData.append("file", file);
    formData.append("items", JSON.stringify(items));

    try {
      setSaving(true);

      const response = await fetch("/api/permintaan", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menyimpan permintaan pengadaan."
        );
      }

      setMessage("Permintaan pengadaan berhasil disimpan.");

      router.push("/permintaan");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan data."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass = "text-sm font-semibold text-slate-700";

  return (
    <div className="min-h-screen bg-[#f3f7fc] px-5 py-8 text-[#102b50] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/permintaan"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          ← Kembali ke Daftar Permintaan
        </Link>

        <div className="mb-7">
          <h1 className="text-2xl font-extrabold">
            Tambah Permintaan Pengadaan
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Lengkapi formulir permintaan pengadaan barang dan jasa dari PLN.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="font-extrabold">Informasi Surat Permintaan</h2>
              <p className="mt-1 text-xs text-slate-500">
                Masukkan informasi surat resmi dari pihak PLN.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Nomor Surat Permintaan PLN *
                </label>
                <input
                  name="nomor_surat"
                  value={form.nomor_surat}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Contoh: 001/PLN/PGD/XI/2026"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Tanggal Surat *</label>
                <input
                  type="date"
                  name="tanggal_surat"
                  value={form.tanggal_surat}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  Tanggal Diterima Koperasi
                </label>
                <input
                  value="Otomatis saat data disimpan"
                  className={`${inputClass} bg-slate-50 text-slate-400`}
                  disabled
                />
              </div>

              <div>
                <label className={labelClass}>Unit/Divisi PLN *</label>
                <select
                  name="unit_pln_id"
                  value={form.unit_pln_id}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  disabled={loadingUnits}
                >
                  <option value="">
                    {loadingUnits ? "Memuat unit..." : "Pilih Unit/Divisi PLN"}
                  </option>

                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.nama_unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="font-extrabold">Informasi PIC PLN</h2>
              <p className="mt-1 text-xs text-slate-500">
                Masukkan informasi penanggung jawab dari pihak PLN.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Nama PIC PLN *</label>
                <input
                  name="nama_pic"
                  value={form.nama_pic}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Masukkan nama PIC"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Kontak PIC PLN *</label>
                <input
                  type="tel"
                  name="kontak_pic"
                  value={form.kontak_pic}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Contoh: 081234567890"
                  required
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="font-extrabold">Detail Pengadaan</h2>
              <p className="mt-1 text-xs text-slate-500">
                Lengkapi informasi kebutuhan barang atau jasa.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Jenis Pengadaan *</label>
                <select
                  name="jenis_pengadaan"
                  value={form.jenis_pengadaan}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="">Pilih Jenis Pengadaan</option>
                  <option value="Barang">Barang</option>
                  <option value="Jasa">Jasa</option>
                  <option value="Campuran">Campuran</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Nama/Perihal Pengadaan *
                </label>
                <input
                  name="nama_pengadaan"
                  value={form.nama_pengadaan}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Masukkan nama pengadaan"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Deskripsi Kebutuhan *</label>
                <textarea
                  name="deskripsi_kebutuhan"
                  value={form.deskripsi_kebutuhan}
                  onChange={handleChange}
                  className={inputClass}
                  rows={4}
                  placeholder="Jelaskan kebutuhan pengadaan secara lengkap..."
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  Lokasi Pengiriman/Pekerjaan *
                </label>
                <input
                  name="lokasi_pengiriman"
                  value={form.lokasi_pengiriman}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Masukkan lokasi"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Tanggal Kebutuhan *</label>
                <input
                  type="date"
                  name="tanggal_kebutuhan"
                  value={form.tanggal_kebutuhan}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
            </div>
          </section>
          
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-extrabold">Detail Item Permintaan</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Tambahkan daftar barang atau jasa yang dibutuhkan.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                + Tambah Item
              </button>
            </div>

            <div className="space-y-5">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-slate-700">
                      Item {index + 1}
                    </h3>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-sm font-semibold text-red-600 hover:text-red-800"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Nama Item *</label>
                      <input
                        value={item.nama_item}
                        onChange={(e) =>
                          handleItemChange(index, "nama_item", e.target.value)
                        }
                        className={inputClass}
                        placeholder="Masukkan nama item"
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Jumlah Permintaan *</label>
                      <input
                        type="number"
                        min="1"
                        value={item.jumlah_permintaan}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "jumlah_permintaan",
                            e.target.value
                          )
                        }
                        className={inputClass}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Jenis Item *</label>
                      <select
                        value={item.jenis_item}
                        onChange={(e) =>
                          handleItemChange(index, "jenis_item", e.target.value)
                        }
                        className={inputClass}
                        required
                      >
                        <option value="Barang">Barang</option>
                        <option value="Jasa">Jasa</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Spesifikasi Item</label>
                      <textarea
                        value={item.spesifikasi_item}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "spesifikasi_item",
                            e.target.value
                          )
                        }
                        className={inputClass}
                        rows={2}
                        placeholder="Masukkan spesifikasi item"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="font-extrabold">Dokumen Surat Permintaan</h2>
              <p className="mt-1 text-xs text-slate-500">
                Unggah surat permintaan resmi dari PLN dalam format PDF.
              </p>
            </div>

            <label className={labelClass}>
              Upload Surat Permintaan PLN *
            </label>

            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) =>
                setFile(event.target.files?.[0] || null)
              }
              className={`${inputClass} file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700`}
              required
            />

            <p className="mt-2 text-xs text-slate-400">
              Format PDF, ukuran maksimal 10 MB.
            </p>

            {file && (
              <p className="mt-3 text-sm font-medium text-green-600">
                File dipilih: {file.name}
              </p>
            )}
          </section>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
          )}

          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Link
              href="/permintaan"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-center text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </Link>

            <button
              type="submit"
              disabled={saving || loadingUnits}
              className="rounded-xl bg-[#0754a5] px-7 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#064486] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan Permintaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
