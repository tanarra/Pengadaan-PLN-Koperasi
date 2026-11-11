
"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Unit = {
  id: string;
  nama_unit: string;
};

type ItemPermintaan = {
  id: string;
  nama_item: string;
  spesifikasi_item: string;
  jumlah_permintaan: number;
  jenis_item: string;
};

type FormDataPermintaan = {
  id: string;
  nomor_surat: string;
  tanggal_surat: string;
  unit_pln_id: string;
  nama_pic: string;
  kontak_pic: string;
  jenis_pengadaan: string;
  nama_pengadaan: string;
  deskripsi_kebutuhan: string;
  lokasi_pengiriman: string;
  tanggal_kebutuhan: string;
  nama_file: string;
  items: ItemPermintaan[];
};

type Props = {
  data: FormDataPermintaan;
};

const itemKosong = (): ItemPermintaan => ({
  id: "",
  nama_item: "",
  spesifikasi_item: "",
  jumlah_permintaan: 1,
  jenis_item: "Barang",
});

export default function FormEdit({ data }: Props) {
  const router = useRouter();

  const [units, setUnits] = useState<Unit[]>([]);
  const [form, setForm] = useState(data);
  const [items, setItems] = useState<ItemPermintaan[]>(
    data.items?.length ? data.items : [itemKosong()]
  );
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function ambilUnits() {
      try {
        const response = await fetch("/api/units");
        const result = await response.json();

        if (result.success) {
          setUnits(result.data);
        }
      } catch {
        setError("Gagal mengambil data unit PLN.");
      }
    }

    ambilUnits();
  }, []);

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleItemChange(
    index: number,
    field: keyof ItemPermintaan,
    value: string
  ) {
    setItems((previous) =>
      previous.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "jumlah_permintaan"
                  ? Number(value)
                  : value,
            }
          : item
      )
    );
  }

  function tambahItem() {
    setItems((previous) => [...previous, itemKosong()]);
  }

  function hapusItem(index: number) {
    if (items.length === 1) {
      setError("Minimal harus ada satu item permintaan.");
      return;
    }

    setItems((previous) => previous.filter((_, i) => i !== index));
    setError("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setError("File harus berformat PDF.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10 MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setFile(selectedFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (items.length === 0) {
      setError("Minimal harus ada satu item permintaan.");
      return;
    }

    const itemTidakValid = items.some(
      (item) =>
        !item.nama_item.trim() ||
        !item.spesifikasi_item.trim() ||
        !Number.isInteger(item.jumlah_permintaan) ||
        item.jumlah_permintaan < 1 ||
        !["Barang", "Jasa"].includes(item.jenis_item)
    );

    if (itemTidakValid) {
      setError(
        "Lengkapi seluruh data item. Jumlah minimal 1 dan jenis item harus Barang atau Jasa."
      );
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("nomor_surat", form.nomor_surat);
      formData.append("tanggal_surat", form.tanggal_surat);
      formData.append("unit_pln_id", form.unit_pln_id);
      formData.append("nama_pic", form.nama_pic);
      formData.append("kontak_pic", form.kontak_pic);
      formData.append("jenis_pengadaan", form.jenis_pengadaan);
      formData.append("nama_pengadaan", form.nama_pengadaan);
      formData.append("deskripsi_kebutuhan", form.deskripsi_kebutuhan);
      formData.append("lokasi_pengiriman", form.lokasi_pengiriman);
      formData.append("tanggal_kebutuhan", form.tanggal_kebutuhan);

      // Kirim seluruh item, termasuk ID item lama.
      formData.append("items", JSON.stringify(items));

      if (file) {
        formData.append("file", file);
      }

      const response = await fetch(`/api/permintaan/${data.id}`, {
        method: "PUT",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal memperbarui permintaan."
        );
      }

      alert("Permintaan pengadaan berhasil diperbarui.");
      router.push(`/permintaan/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memperbarui data."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-[#f3f7fc] px-5 py-8 text-[#102b50] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/permintaan/${data.id}`}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          ← Kembali ke Detail Permintaan
        </Link>

        <div className="mb-7 mt-5">
          <h1 className="text-2xl font-extrabold">
            Edit Permintaan Pengadaan
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Perbarui informasi permintaan pengadaan yang sudah tersimpan.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 className="mb-6 border-b border-slate-100 pb-4 font-extrabold">
            Informasi Permintaan
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">ID Permintaan</label>
              <input
                value={form.id}
                disabled
                className={`${inputClass} bg-slate-100`}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Nomor Surat PLN *
              </label>
              <input
                name="nomor_surat"
                value={form.nomor_surat}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Tanggal Surat *
              </label>
              <input
                type="date"
                name="tanggal_surat"
                value={form.tanggal_surat}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Unit/Divisi PLN *
              </label>
              <select
                name="unit_pln_id"
                value={form.unit_pln_id}
                onChange={handleChange}
                required
                className={inputClass}
              >
                <option value="">Pilih Unit PLN</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.nama_unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">Nama PIC PLN *</label>
              <input
                name="nama_pic"
                value={form.nama_pic}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Kontak PIC PLN *
              </label>
              <input
                name="kontak_pic"
                value={form.kontak_pic}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Jenis Pengadaan *
              </label>
              <select
                name="jenis_pengadaan"
                value={form.jenis_pengadaan}
                onChange={handleChange}
                required
                className={inputClass}
              >
                <option value="">Pilih Jenis Pengadaan</option>
                <option value="Barang">Barang</option>
                <option value="Jasa">Jasa</option>
                <option value="Campuran">Campuran</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">
                Nama Pengadaan *
              </label>
              <input
                name="nama_pengadaan"
                value={form.nama_pengadaan}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Lokasi Pengiriman/Pekerjaan *
              </label>
              <input
                name="lokasi_pengiriman"
                value={form.lokasi_pengiriman}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Tanggal Kebutuhan *
              </label>
              <input
                type="date"
                name="tanggal_kebutuhan"
                value={form.tanggal_kebutuhan}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-semibold">
              Deskripsi Kebutuhan *
            </label>
            <textarea
              name="deskripsi_kebutuhan"
              value={form.deskripsi_kebutuhan}
              onChange={handleChange}
              required
              rows={4}
              className={inputClass}
            />
          </div>

          {/* DETAIL ITEM PERMINTAAN */}
          <section className="mt-8 border-t border-slate-100 pt-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold">
                  Detail Item Permintaan
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Tambahkan atau ubah item yang diminta oleh unit PLN.
                </p>
              </div>

              <button
                type="button"
                onClick={tambahItem}
                className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700"
              >
                + Tambah Item
              </button>
            </div>

            <div className="space-y-5">
              {items.map((item, index) => (
                <div
                  key={item.id || `item-baru-${index}`}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">
                      Item {index + 1}
                    </h3>

                    <button
                      type="button"
                      onClick={() => hapusItem(index)}
                      className="text-sm font-semibold text-red-600 hover:text-red-800"
                    >
                      Hapus Item
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-sm font-semibold">
                        Nama Item *
                      </label>
                      <input
                        type="text"
                        value={item.nama_item}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "nama_item",
                            e.target.value
                          )
                        }
                        required
                        placeholder="Contoh: Laptop"
                        className={inputClass}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-sm font-semibold">
                        Spesifikasi Item *
                      </label>
                      <textarea
                        value={item.spesifikasi_item}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "spesifikasi_item",
                            e.target.value
                          )
                        }
                        required
                        rows={3}
                        placeholder="Masukkan spesifikasi atau detail item"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold">
                        Jumlah Permintaan *
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={item.jumlah_permintaan}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "jumlah_permintaan",
                            e.target.value
                          )
                        }
                        required
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold">
                        Jenis Item *
                      </label>
                      <select
                        value={item.jenis_item}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "jenis_item",
                            e.target.value
                          )
                        }
                        required
                        className={inputClass}
                      >
                        <option value="Barang">Barang</option>
                        <option value="Jasa">Jasa</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* DOKUMEN PDF */}
          <div className="mt-8 rounded-xl bg-slate-50 p-5">
            <label className="text-sm font-bold">
              Dokumen Surat Permintaan PLN
            </label>
            <p className="mt-2 text-sm text-slate-600">
              Dokumen saat ini: {form.nama_file || "Belum ada dokumen"}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Pilih PDF baru jika ingin mengganti dokumen lama. Maksimal 10 MB.
            </p>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="mt-3 block w-full text-sm"
            />
            {file && (
              <p className="mt-2 text-sm text-green-700">
                File baru: {file.name}
              </p>
            )}
          </div>

          {error && (
            <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-7 flex flex-wrap justify-end gap-3">
            <Link
              href={`/permintaan/${data.id}`}
              className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#0754a5] px-6 py-3 text-sm font-bold text-white hover:bg-[#064486] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
