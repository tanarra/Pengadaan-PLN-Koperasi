
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { message: "ID permintaan tidak valid." },
        { status: 400 }
      );
    }

    const requestId = BigInt(id);

    const hasil = await prisma.$transaction(async (tx) => {
      const permintaan = await tx.permintaan_pengadaan.findUnique({
        where: { id: requestId },
        include: {
          procurement_request_items: true,
        },
      });

      if (!permintaan) {
        throw new Error("NOT_FOUND");
      }

      if (permintaan.status !== "Pengadaan Siap Dikirim") {
        throw new Error("INVALID_STATUS");
      }

      const items = permintaan.procurement_request_items;

      if (items.length === 0) {
        throw new Error("NO_ITEMS");
      }

      const semuaSelesai = items.every(
        (item) =>
          item.sudah_dibeli === true &&
          item.tanggal_pembelian !== null
      );

      if (!semuaSelesai) {
        throw new Error("ITEMS_NOT_COMPLETE");
      }

      const tanggalPengiriman = new Date();

      // Pastikan status belum berubah sebelum diproses.
      const update = await tx.permintaan_pengadaan.updateMany({
        where: {
          id: requestId,
          status: "Pengadaan Siap Dikirim",
        },
        data: {
          status: "Pengadaan Telah Selesai",
          tanggal_pengiriman: tanggalPengiriman,
          updated_at: tanggalPengiriman,
        },
      });

      if (update.count !== 1) {
        throw new Error("INVALID_STATUS");
      }

      await tx.procurementStatusHistory.create({
        data: {
          requestId,
          status: "Pengadaan Telah Selesai",
        },
      });

      return {
        status: "Pengadaan Telah Selesai",
        tanggal_pengiriman: tanggalPengiriman.toISOString(),
        jumlah_item: items.length,
        items: items.map((item) => ({
          nama_item: item.nama_item,
          spesifikasi_item: item.spesifikasi_item,
          jumlah_permintaan: item.jumlah_permintaan,
          jenis_item: item.jenis_item,
        })),
      };
    });

    return NextResponse.json({
    success: true,
    message: "Pengiriman berhasil dikonfirmasi.",
    data: hasil,
    });
  } catch (error) {
    console.error("Gagal mengonfirmasi pengiriman:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "NOT_FOUND":
          return NextResponse.json(
            { message: "Data permintaan tidak ditemukan." },
            { status: 404 }
          );

        case "INVALID_STATUS":
          return NextResponse.json(
            { message: "Status permintaan bukan Pengadaan Siap Dikirim atau sudah diproses." },
            { status: 409 }
          );

        case "NO_ITEMS":
          return NextResponse.json(
            { message: "Permintaan belum memiliki item pengadaan." },
            { status: 400 }
          );

        case "ITEMS_NOT_COMPLETE":
          return NextResponse.json(
            { message: "Semua item harus sudah dibeli dan memiliki tanggal pembelian." },
            { status: 400 }
          );
      }
    }

    return NextResponse.json(
      { message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
