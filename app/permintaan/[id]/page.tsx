
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import prisma from "@/src/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DetailPermintaanPage({ params }: Props) {
  await connection();

  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const permintaan = await prisma.permintaan_pengadaan.findUnique({
    where: { id: BigInt(id) },
    include: {
      unit_pln: true,
      dokumen_permintaan: true,
      procurement_request_items: {
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  if (!permintaan) {
    notFound();
  }

  const formatTanggal = (tanggal: Date) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(tanggal);

  const informasi = [
    { label: "ID Permintaan", value: permintaan.id.toString() },
    { label: "Nomor Surat PLN", value: permintaan.nomor_surat },
    { label: "Tanggal Surat", value: formatTanggal(permintaan.tanggal_surat) },
    {
      label: "Tanggal Diterima Koperasi",
      value: formatTanggal(permintaan.tanggal_diterima),
    },
    { label: "Unit/Divisi PLN", value: permintaan.unit_pln.nama_unit },
    { label: "Nama PIC PLN", value: permintaan.nama_pic },
    { label: "Kontak PIC PLN", value: permintaan.kontak_pic },
    { label: "Jenis Pengadaan", value: permintaan.jenis_pengadaan },
    { label: "Nama/Perihal Pengadaan", value: permintaan.nama_pengadaan },
    {
      label: "Lokasi Pengiriman/Pekerjaan",
      value: permintaan.lokasi_pengiriman,
    },
    {
      label: "Tanggal Kebutuhan",
      value: formatTanggal(permintaan.tanggal_kebutuhan),
    },
  ];

  return (
    <main className="min-h-screen bg-[#f3f7fc] px-5 py-8 text-[#102b50] sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Navigasi dan tombol edit */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="font-semibold text-blue-600 hover:text-blue-800"
          >
            ← Kembali ke Dashboard
          </Link>

          <Link
            href={`/permintaan/${id}/edit`}
            className="rounded-lg bg-[#0754a5] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#064486]"
          >
            ✏️ Edit Permintaan
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-extrabold">
            Detail Permintaan Pengadaan
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Informasi lengkap permintaan pengadaan barang dan jasa.
          </p>
        </div>

        {/* INFORMASI PERMINTAAN */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-6 border-b border-slate-100 pb-4 font-bold">
            Informasi Permintaan
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {informasi.map((item) => (
              <div key={item.label}>
                <p className="mb-1 text-xs font-semibold uppercase text-slate-400">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-7 border-t border-slate-100 pt-6">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
              Deskripsi Kebutuhan
            </p>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {permintaan.deskripsi_kebutuhan}
            </p>
          </div>
        </section>

        {/* DETAIL ITEM PERMINTAAN */}
        <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Detail Item Permintaan</h2>
              <p className="mt-1 text-sm text-slate-500">
                Daftar barang atau jasa yang diminta oleh unit PLN.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              {permintaan.procurement_request_items.length} Item
            </span>
          </div>

          {permintaan.procurement_request_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="border-b border-slate-200 px-4 py-3">
                      No.
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3">
                      Nama Item
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3">
                      Spesifikasi Item
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center">
                      Jumlah
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3">
                      Jenis Item
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {permintaan.procurement_request_items.map(
                    (item, index) => (
                      <tr
                        key={item.id.toString()}
                        className="hover:bg-slate-50"
                      >
                        <td className="border-b border-slate-100 px-4 py-4">
                          {index + 1}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-800">
                          {item.nama_item}
                        </td>

                        <td className="whitespace-pre-wrap border-b border-slate-100 px-4 py-4 text-slate-600">
                          {item.spesifikasi_item}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 text-center font-semibold">
                          {item.jumlah_permintaan}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              item.jenis_item === "Barang"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {item.jenis_item}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 px-5 py-8 text-center">
              <p className="text-sm font-semibold text-slate-600">
                Belum ada item permintaan.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Silakan edit permintaan untuk menambahkan item.
              </p>
            </div>
          )}
        </section>

        {/* DOKUMEN SURAT PERMINTAAN */}
        <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold">
            Dokumen Surat Permintaan PLN
          </h2>

          {permintaan.dokumen_permintaan ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {permintaan.dokumen_permintaan.nama_file}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {(
                    Number(permintaan.dokumen_permintaan.ukuran_file) / 1024
                  ).toFixed(2)}{" "}
                  KB
                </p>
              </div>

              <div className="flex gap-3">
                <a
                  href={`/api/permintaan/${id}/dokumen`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Lihat PDF
                </a>

                <a
                  href={`/api/permintaan/${id}/dokumen?download=1`}
                  className="rounded-lg bg-[#0754a5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#064486]"
                >
                  Download
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Belum ada dokumen yang diunggah.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
