import { NextRequest, NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

type StatusTujuan = "Penawaran Dikirim" | "Penawaran Disetujui";

function tanggalJakartaHariIni() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day));
}

export async function POST(
  request: NextRequest,
  { params }: Context
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
    const body = await request.json();
    const statusTujuan = body.status as StatusTujuan;

    if (
      statusTujuan !== "Penawaran Dikirim" &&
      statusTujuan !== "Penawaran Disetujui"
    ) {
      return NextResponse.json(
        { success: false, message: "Status tujuan tidak valid." },
        { status: 400 }
      );
    }

    const hasil = await prisma.$transaction(async (tx) => {
      const permintaan = await tx.permintaan_pengadaan.findUnique({
        where: { id: requestId },
        include: {
          surat_penawaran: true,
        },
      });

      if (!permintaan) {
        throw new Error("NOT_FOUND:Data permintaan tidak ditemukan.");
      }

      const surat = permintaan.surat_penawaran;

      if (!surat) {
        throw new Error(
          "INVALID:Surat penawaran belum dibuat."
        );
      }

      if (statusTujuan === "Penawaran Dikirim") {
        const statusSebelumnyaValid = [
          "Penawaran Dibuat",
          "Penawaran Harga Dibuat",
        ].includes(permintaan.status);

        if (!statusSebelumnyaValid) {
          throw new Error(
            "INVALID:Status harus Penawaran Dibuat sebelum ditandai dikirim."
          );
        }

        if (surat.status !== "Draft") {
          throw new Error(
            "INVALID:Surat tidak lagi berstatus Draft. Periksa status pengiriman surat."
          );
        }

        const tanggalKirim = tanggalJakartaHariIni();

        await tx.surat_penawaran.update({
          where: { id: surat.id },
          data: {
            status: "Surat Terkirim",
            tanggal_dikirim: tanggalKirim,
          },
        });
      }

      if (statusTujuan === "Penawaran Disetujui") {
        const statusSebelumnyaValid = [
          "Surat Terkirim",
          "Penawaran Dikirim",
        ].includes(permintaan.status);

        if (!statusSebelumnyaValid) {
          throw new Error(
            "INVALID:Penawaran harus dikirim sebelum dapat disetujui."
          );
        }

        if (surat.status !== "Surat Terkirim") {
          throw new Error(
            "INVALID:Status surat belum menunjukkan bahwa surat telah dikirim."
          );
        }

        await tx.surat_penawaran.update({
          where: { id: surat.id },
          data: { status: "Penawaran Disetujui" },
        });
      }

      // Pastikan status belum berubah oleh proses lain.
      const updatePermintaan = await tx.permintaan_pengadaan.updateMany({
        where: {
          id: requestId,
          status: permintaan.status,
        },
        data: {
          status: statusTujuan,
        },
      });

      if (updatePermintaan.count !== 1) {
        throw new Error(
          "CONFLICT:Status permintaan baru saja berubah. Muat ulang Dashboard."
        );
      }

      // changedAt akan diisi otomatis oleh default pada model riwayat.
      await tx.procurementStatusHistory.create({
        data: {
          requestId,
          status: statusTujuan,
        },
      });

      return { status: statusTujuan };
    });

    return NextResponse.json({
      success: true,
      message:
        hasil.status === "Penawaran Dikirim"
          ? "Penawaran berhasil ditandai telah dikirim."
          : "Penawaran berhasil ditandai telah disetujui.",
      data: hasil,
    });
  } catch (error) {
    console.error("API perubahan status pengadaan:", error);

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server.";

    if (message.startsWith("NOT_FOUND:")) {
      return NextResponse.json(
        { success: false, message: message.replace("NOT_FOUND:", "") },
        { status: 404 }
      );
    }

    if (message.startsWith("INVALID:")) {
      return NextResponse.json(
        { success: false, message: message.replace("INVALID:", "") },
        { status: 400 }
      );
    }

    if (message.startsWith("CONFLICT:")) {
      return NextResponse.json(
        { success: false, message: message.replace("CONFLICT:", "") },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Gagal memperbarui status permintaan pengadaan.",
      },
      { status: 500 }
    );
  }
}