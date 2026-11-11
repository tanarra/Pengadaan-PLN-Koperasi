
import Link from "next/link";
import { connection } from "next/server";
import prisma from "@/src/lib/prisma";
import TombolHapus from "./TombolHapus";

export default async function PermintaanPage() {
  await connection();

  const permintaan = await prisma.permintaan_pengadaan.findMany({
    include: {
      unit_pln: true,
      dokumen_permintaan: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const formatTanggal = (tanggal: Date) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(tanggal);

  return (
    <main className="min-h-screen bg-[#f3f7fc] px-5 py-8 text-[#102b50] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              ← Kembali ke Dashboard
            </Link>

            <h1 className="mt-4 text-2xl font-extrabold">
              Data Permintaan Pengadaan
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Daftar seluruh permintaan pengadaan barang dan jasa dari PLN.
            </p>
          </div>

          <Link
            href="/permintaan/tambah"
            className="rounded-lg bg-[#0754a5] px-5 py-3 text-sm font-bold text-white hover:bg-[#064486]"
          >
            + Tambah Permintaan
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-bold">Daftar Permintaan</h2>
            <p className="mt-1 text-sm text-slate-500">
              Total {permintaan.length} data permintaan.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Nomor Surat</th>
                  <th className="px-5 py-4">Tanggal Surat</th>
                  <th className="px-5 py-4">Unit PLN</th>
                  <th className="px-5 py-4">Nama PIC</th>
                  <th className="px-5 py-4">Jenis Pengadaan</th>
                  <th className="px-5 py-4">Nama Pengadaan</th>
                  <th className="px-5 py-4">Dokumen</th>
                  <th className="px-5 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {permintaan.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Belum ada data permintaan pengadaan.
                    </td>
                  </tr>
                ) : (
                  permintaan.map((item) => {
                    const id = item.id.toString();

                    return (
                      <tr
                        key={id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold">{id}</td>

                        <td className="px-5 py-4">{item.nomor_surat}</td>

                        <td className="px-5 py-4">
                          {formatTanggal(item.tanggal_surat)}
                        </td>

                        <td className="px-5 py-4">
                          {item.unit_pln.nama_unit}
                        </td>

                        <td className="px-5 py-4">{item.nama_pic}</td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {item.jenis_pengadaan}
                          </span>
                        </td>

                        <td className="px-5 py-4">{item.nama_pengadaan}</td>

                        <td className="px-5 py-4">
                          {item.dokumen_permintaan ? (
                            <span className="font-semibold text-green-600">
                              Tersedia
                            </span>
                          ) : (
                            <span className="text-slate-400">Belum ada</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/permintaan/${id}`}
                              className="inline-flex rounded-lg bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                              Detail
                            </Link>

                            <Link
                              href={`/permintaan/${id}/edit`}
                              className="inline-flex rounded-lg bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                            >
                              Edit
                            </Link>

                            <TombolHapus id={id} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
