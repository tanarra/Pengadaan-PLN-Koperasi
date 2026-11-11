
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export async function GET() {
  try {
    const permintaan = await prisma.permintaan_pengadaan.findMany({
      include: {
        unit_pln: true,
        procurement_request_items: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const data = permintaan.map((item) => ({
      id: item.id.toString(),
      nomor_surat: item.nomor_surat,
      tanggal_surat: item.tanggal_surat,
      nama_unit: item.unit_pln.nama_unit,
      nama_pengadaan: item.nama_pengadaan,
      jumlah_item: item.procurement_request_items.length,
      status: item.status,

      // Waktu pengiriman barang/jasa
      tanggal_pengiriman: item.tanggal_pengiriman
        ? item.tanggal_pengiriman.toISOString()
        : null,

      // Daftar item pengadaan
      items: item.procurement_request_items.map((detail) => ({
        id: detail.id.toString(),
        nama_item: detail.nama_item,
        spesifikasi_item: detail.spesifikasi_item,
        jumlah_permintaan: detail.jumlah_permintaan,
        jenis_item: detail.jenis_item,
        sudah_dibeli: detail.sudah_dibeli,
        tanggal_pembelian: detail.tanggal_pembelian
          ? detail.tanggal_pembelian.toISOString()
          : null,
      })),
    }));

    const ringkasan = {
      total: data.length,

      permintaanDiterima: data.filter(
        (item) => item.status === "Permintaan Diterima"
      ).length,

      prosesReferensiHarga: data.filter(
        (item) => item.status === "Proses Referensi Harga"
      ).length,

      referensiHargaSelesai: data.filter(
        (item) => item.status === "Referensi Harga Selesai"
      ).length,

      penawaranDisetujui: data.filter(
        (item) => item.status === "Penawaran Disetujui"
      ).length,

      prosesBelanja: data.filter(
        (item) => item.status === "Proses Belanja Barang/Jasa"
      ).length,

      pengadaanSiapDikirim: data.filter(
        (item) => item.status === "Pengadaan Siap Dikirim"
      ).length,

      pengadaanTelahSelesai: data.filter(
        (item) => item.status === "Pengadaan Telah Selesai"
      ).length,
    };

    return NextResponse.json({
      success: true,
      ringkasan,
      data,
    });
  } catch (error) {
    console.error("Gagal mengambil monitoring pengadaan:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data monitoring pengadaan.",
      },
      { status: 500 }
    );
  }
}
