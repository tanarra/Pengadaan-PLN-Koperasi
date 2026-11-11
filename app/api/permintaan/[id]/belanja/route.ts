
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

// Mengambil data checklist belanja
export async function GET(
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

    const permintaan = await prisma.permintaan_pengadaan.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        status: true,
        procurement_request_items: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            nama_item: true,
            spesifikasi_item: true,
            jumlah_permintaan: true,
            jenis_item: true,
            sudah_dibeli: true,
            tanggal_pembelian: true,
          },
        },
      },
    });

    if (!permintaan) {
      return NextResponse.json(
        { success: false, message: "Permintaan tidak ditemukan." },
        { status: 404 }
      );
    }

    const items = permintaan.procurement_request_items;
    const selesai = items.filter((item) => item.sudah_dibeli).length;

    return NextResponse.json({
      success: true,
      id: permintaan.id.toString(),
      status: permintaan.status,
      items: items.map((item) => ({
        ...item,
        id: item.id.toString(),
        tanggal_pembelian: item.tanggal_pembelian
          ? item.tanggal_pembelian.toISOString().slice(0, 10)
          : null,
      })),
      progress: {
        selesai,
        total: items.length,
      },
    });
  } catch (error) {
    console.error("GET checklist belanja:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil checklist belanja." },
      { status: 500 }
    );
  }
}

// Menyimpan checklist belanja
export async function PUT(
  request: NextRequest,
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
    const body = await request.json();

    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { success: false, message: "Format item tidak valid." },
        { status: 400 }
      );
    }

    const permintaan = await prisma.permintaan_pengadaan.findUnique({
      where: { id: requestId },
      include: {
        procurement_request_items: true,
      },
    });

    if (!permintaan) {
      return NextResponse.json(
        { success: false, message: "Permintaan tidak ditemukan." },
        { status: 404 }
      );
    }

    if (
      ![
        "Penawaran Disetujui",
        "Proses Belanja Barang/Jasa",
      ].includes(permintaan.status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Checklist tidak dapat diubah karena status saat ini: ${permintaan.status}.`,
        },
        { status: 400 }
      );
    }

    const itemDatabase = permintaan.procurement_request_items;

    const idDatabase = new Set(
      itemDatabase.map((item) => item.id.toString())
    );

    const idDikirim = body.items.map((item: any) => String(item.id));

    if (
      new Set(idDikirim).size !== idDikirim.length ||
      idDikirim.some((itemId: string) => !idDatabase.has(itemId))
    ) {
      return NextResponse.json(
        { success: false, message: "Terdapat ID item tidak valid atau duplikat." },
        { status: 400 }
      );
    }

    if (
      idDikirim.length !== itemDatabase.length ||
      itemDatabase.some(
        (item) => !idDikirim.includes(item.id.toString())
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Semua item harus disertakan saat menyimpan checklist.",
        },
        { status: 400 }
      );
    }

    const updates = body.items.map((item: any) => {
      if (typeof item.sudah_dibeli !== "boolean") {
        throw new Error("Status checklist harus berupa boolean.");
      }

      let tanggalPembelian: Date | null = null;

      if (item.sudah_dibeli) {
        if (
          typeof item.tanggal_pembelian !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(item.tanggal_pembelian)
        ) {
          throw new Error(
            "Tanggal wajib diisi untuk item yang sudah selesai."
          );
        }

        const [tahun, bulan, hari] = item.tanggal_pembelian
          .split("-")
          .map(Number);

        const tanggal = new Date(
          Date.UTC(tahun, bulan - 1, hari)
        );

        if (
          tanggal.getUTCFullYear() !== tahun ||
          tanggal.getUTCMonth() !== bulan - 1 ||
          tanggal.getUTCDate() !== hari
        ) {
          throw new Error("Tanggal pembelian tidak valid.");
        }

        tanggalPembelian = tanggal;
      }

      return {
        id: BigInt(item.id),
        sudah_dibeli: item.sudah_dibeli,
        tanggal_pembelian: tanggalPembelian,
      };
    });

    // Simpan item dan perubahan status dalam satu transaksi
    await prisma.$transaction(async (tx) => {
      for (const item of updates) {
        await tx.procurement_request_items.update({
          where: { id: item.id },
          data: {
            sudah_dibeli: item.sudah_dibeli,
            tanggal_pembelian: item.tanggal_pembelian,
          },
        });
      }

      if (permintaan.status === "Penawaran Disetujui") {
        await tx.permintaan_pengadaan.update({
          where: { id: requestId },
          data: {
            status: "Proses Belanja Barang/Jasa",
            updated_at: new Date(),
          },
        });

        await tx.procurementStatusHistory.create({
          data: {
            requestId: requestId,
            status: "Proses Belanja Barang/Jasa",
          },
        });
      }
    });

    // Ambil kembali status terbaru dari database
    const dataTerbaru = await prisma.permintaan_pengadaan.findUnique({
      where: { id: requestId },
      select: {
        status: true,
      },
    });

    const selesai = updates.filter(
      (item) => item.sudah_dibeli
    ).length;

    return NextResponse.json({
      success: true,
      message: "Checklist belanja berhasil disimpan.",
      status: dataTerbaru?.status,
      progress: {
        selesai,
        total: updates.length,
      },
    });
  } catch (error) {
    console.error("PUT checklist belanja:", error);

    const message =
      error instanceof Error ? error.message : "";

    if (
      message.includes("Tanggal") ||
      message.includes("checklist") ||
      message.includes("boolean")
    ) {
      return NextResponse.json(
        { success: false, message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Gagal menyimpan checklist belanja.",
      },
      { status: 500 }
    );
  }
}
