
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: "ID permintaan tidak valid." },
        { status: 400 }
      );
    }

    const requestId = BigInt(id);

    const hasil = await prisma.$transaction(async (tx) => {
      const permintaan =
        await tx.permintaan_pengadaan.findUnique({
          where: { id: requestId },
          include: {
            procurement_request_items: true,
          },
        });

      if (!permintaan) {
        throw new Error("Permintaan pengadaan tidak ditemukan.");
      }

      if (permintaan.status !== "Proses Belanja Barang/Jasa") {
        throw new Error(
          "Status permintaan belum berada pada proses belanja barang/jasa."
        );
      }

      const items = permintaan.procurement_request_items;

      if (items.length === 0) {
        throw new Error("Permintaan belum memiliki item pengadaan.");
      }

      const belumSelesai = items.filter(
        (item) =>
          !item.sudah_dibeli ||
          !item.tanggal_pembelian
      );

      if (belumSelesai.length > 0) {
        throw new Error(
          `${belumSelesai.length} item belum selesai atau belum memiliki tanggal pembelian.`
        );
      }

      await tx.permintaan_pengadaan.update({
        where: { id: requestId },
        data: {
          status: "Pengadaan Siap Dikirim",
          updated_at: new Date(),
        },
      });

      await tx.procurementStatusHistory.create({
        data: {
          requestId,
          status: "Pengadaan Siap Dikirim",
        },
      });

      return {
        status: "Pengadaan Siap Dikirim",
        total: items.length,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Pengadaan berhasil difinalisasi dan siap dikirim ke PLN.",
      ...hasil,
    });
  } catch (error) {
    console.error("POST finalisasi pengadaan:", error);

    const message =
      error instanceof Error ? error.message : "";

    const statusCode =
      message.includes("tidak ditemukan") ? 404 : 400;

    return NextResponse.json(
      {
        success: false,
        message: message || "Gagal memfinalisasi pengadaan.",
      },
      { status: statusCode }
    );
  }
}
