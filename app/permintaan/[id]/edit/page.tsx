
import { connection } from "next/server";
import { notFound } from "next/navigation";
import prisma from "@/src/lib/prisma";
import FormEdit from "./form-edit";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPermintaanPage({ params }: Props) {
  await connection();

  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const permintaan = await prisma.permintaan_pengadaan.findUnique({
    where: {
      id: BigInt(id),
    },
    include: {
      dokumen_permintaan: true,
      procurement_request_items: true,
    },
  });

  if (!permintaan) {
    notFound();
  }

  const formatTanggal = (tanggal: Date) => {
    const tahun = tanggal.getFullYear();
    const bulan = String(tanggal.getMonth() + 1).padStart(2, "0");
    const hari = String(tanggal.getDate()).padStart(2, "0");

    return `${tahun}-${bulan}-${hari}`;
  };

  const data = {
    id: permintaan.id.toString(),
    nomor_surat: permintaan.nomor_surat,
    tanggal_surat: formatTanggal(permintaan.tanggal_surat),
    unit_pln_id: permintaan.unit_pln_id.toString(),
    nama_pic: permintaan.nama_pic,
    kontak_pic: permintaan.kontak_pic,
    jenis_pengadaan: permintaan.jenis_pengadaan,
    nama_pengadaan: permintaan.nama_pengadaan,
    deskripsi_kebutuhan: permintaan.deskripsi_kebutuhan,
    lokasi_pengiriman: permintaan.lokasi_pengiriman,
    tanggal_kebutuhan: formatTanggal(permintaan.tanggal_kebutuhan),
    nama_file: permintaan.dokumen_permintaan?.nama_file ?? "",

    items: permintaan.procurement_request_items.map((item) => ({
      id: item.id.toString(),
      nama_item: item.nama_item,
      spesifikasi_item: item.spesifikasi_item,
      jumlah_permintaan: item.jumlah_permintaan,
      jenis_item: item.jenis_item,
    })),
  };

  return <FormEdit data={data} />;
}
