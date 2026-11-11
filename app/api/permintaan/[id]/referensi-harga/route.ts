
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/src/generated/prisma/client";
import prisma from "@/src/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ReferencePriceItem = {
  id: string;
  referencePrice: string | null;
};

type UpdateBody = {
  action: "draft" | "complete";
  items: ReferencePriceItem[];
};

// Status yang masih diperbolehkan untuk proses referensi harga.
const STATUS_REFERENSI_HARGA_VALID = [
  "Permintaan Diterima",
  "Permintaan Sudah Diinput",
  "Proses Referensi Harga",
];

// GET: Mengambil data permintaan dan item.
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID permintaan tidak valid.",
        },
        { status: 400 }
      );
    }

    const permintaan = await prisma.permintaan_pengadaan.findUnique({
      where: {
        id: BigInt(id),
      },
      include: {
        unit_pln: true,
        procurement_request_items: {
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (!permintaan) {
      return NextResponse.json(
        {
          success: false,
          message: "Data permintaan tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: permintaan.id.toString(),
          nomor_surat: permintaan.nomor_surat,
          nama_pengadaan: permintaan.nama_pengadaan,
          nama_unit: permintaan.unit_pln.nama_unit,
          status: permintaan.status,
          items: permintaan.procurement_request_items.map((item) => ({
            id: item.id.toString(),
            nama_item: item.nama_item,
            spesifikasi_item: item.spesifikasi_item,
            jumlah_permintaan: item.jumlah_permintaan,
            jenis_item: item.jenis_item,
            referencePrice: item.referencePrice?.toString() ?? null,
          })),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Gagal mengambil referensi harga:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data referensi harga.",
      },
      { status: 500 }
    );
  }
}

// PUT: Menyimpan draft atau menyelesaikan referensi harga.
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    // Validasi ID.
    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID permintaan tidak valid.",
        },
        { status: 400 }
      );
    }

    const requestId = BigInt(id);

    // Validasi body.
    const body = (await request.json()) as UpdateBody;

    if (
      !body ||
      !["draft", "complete"].includes(body.action) ||
      !Array.isArray(body.items)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Data referensi harga tidak valid.",
        },
        { status: 400 }
      );
    }

    // Ambil permintaan dan item yang sudah ada.
    const permintaan = await prisma.permintaan_pengadaan.findUnique({
      where: {
        id: requestId,
      },
      include: {
        procurement_request_items: true,
      },
    });

    if (!permintaan) {
      return NextResponse.json(
        {
          success: false,
          message: "Permintaan tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // PENTING:
    // Tolak penyimpanan jika permintaan sudah melewati tahap referensi harga.
    if (!STATUS_REFERENSI_HARGA_VALID.includes(permintaan.status)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Referensi harga tidak dapat diubah karena permintaan sudah berada pada tahap pengadaan berikutnya.",
          status: permintaan.status,
        },
        { status: 409 }
      );
    }

    const existingItems = permintaan.procurement_request_items;

    const existingItemIds = new Set(
      existingItems.map((item) => item.id.toString())
    );

    const submittedIds = new Set<string>();

    const updates: {
      id: bigint;
      referencePrice: Prisma.Decimal | null;
    }[] = [];

    // Validasi item yang dikirim dari frontend.
    for (const item of body.items) {
      if (
        !item ||
        typeof item.id !== "string" ||
        !existingItemIds.has(item.id) ||
        submittedIds.has(item.id)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Item permintaan tidak valid.",
          },
          { status: 400 }
        );
      }

      submittedIds.add(item.id);

      // Harga kosong diperbolehkan ketika menyimpan draft.
      if (item.referencePrice === null) {
        updates.push({
          id: BigInt(item.id),
          referencePrice: null,
        });

        continue;
      }

      // Validasi format harga.
      if (
        typeof item.referencePrice !== "string" ||
        !/^\d+(\.\d{1,2})?$/.test(item.referencePrice)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Harga harus berupa angka dengan maksimal dua angka desimal.",
          },
          { status: 400 }
        );
      }

      const price = new Prisma.Decimal(item.referencePrice);

      if (!price.isFinite() || price.lessThanOrEqualTo(0)) {
        return NextResponse.json(
          {
            success: false,
            message: "Referensi harga harus lebih besar dari nol.",
          },
          { status: 400 }
        );
      }

      updates.push({
        id: BigInt(item.id),
        referencePrice: price,
      });
    }

    // Pastikan semua item permintaan dikirim tepat satu kali.
    if (
      submittedIds.size !== existingItemIds.size ||
      [...existingItemIds].some((itemId) => !submittedIds.has(itemId))
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Semua item permintaan harus dikirim dalam penyimpanan referensi harga.",
        },
        { status: 400 }
      );
    }

    // Periksa seluruh harga setelah perubahan diterapkan.
    const updatedPrices = new Map(
      existingItems.map((item) => [
        item.id.toString(),
        item.referencePrice,
      ])
    );

    for (const item of updates) {
      updatedPrices.set(
        item.id.toString(),
        item.referencePrice
      );
    }

    // Validasi jika referensi harga akan diselesaikan.
    if (body.action === "complete") {
      if (existingItems.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Belum ada item dalam permintaan ini.",
          },
          { status: 400 }
        );
      }

      const allPricesFilled = existingItems.every((item) => {
        const price = updatedPrices.get(item.id.toString());

        return (
          price !== null &&
          price !== undefined &&
          price.greaterThan(0)
        );
      });

      if (!allPricesFilled) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Semua item harus memiliki referensi harga sebelum diselesaikan.",
          },
          { status: 400 }
        );
      }
    }

    const newStatus =
      body.action === "complete"
        ? "Referensi Harga Selesai"
        : "Proses Referensi Harga";

    // Simpan harga dan status dalam satu transaksi.
    const result = await prisma.$transaction(async (tx) => {
      // Pengamanan kedua:
      // Pastikan status belum berubah sejak pemeriksaan sebelumnya.
      const updateStatus = await tx.permintaan_pengadaan.updateMany({
        where: {
          id: requestId,
          status: {
            in: STATUS_REFERENSI_HARGA_VALID,
          },
        },
        data: {
          status: newStatus,
          updated_at: new Date(),
        },
      });

      if (updateStatus.count !== 1) {
        throw new Error(
          "STATUS_CONFLICT:Status permintaan sudah berubah. Muat ulang halaman."
        );
      }

      // Simpan harga setiap item.
      for (const item of updates) {
        const updateItem =
          await tx.procurement_request_items.updateMany({
            where: {
              id: item.id,
              requestId,
            },
            data: {
              referencePrice: item.referencePrice,
            },
          });

        if (updateItem.count !== 1) {
          throw new Error(
            "ITEM_CONFLICT:Item permintaan tidak ditemukan."
          );
        }
      }

      // Catat riwayat hanya jika status benar-benar berubah.
      if (permintaan.status !== newStatus) {
        await tx.procurementStatusHistory.create({
          data: {
            requestId,
            status: newStatus,
          },
        });
      }

      return {
        status: newStatus,
        updatedItems: updates.length,
      };
    });

    return NextResponse.json({
      success: true,
      message:
        body.action === "complete"
          ? "Referensi harga berhasil diselesaikan."
          : "Draft referensi harga berhasil disimpan.",
      data: result,
    });
  } catch (error) {
    console.error("Gagal menyimpan referensi harga:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan server.";

    if (message.startsWith("STATUS_CONFLICT:")) {
      return NextResponse.json(
        {
          success: false,
          message: message.replace("STATUS_CONFLICT:", ""),
        },
        { status: 409 }
      );
    }

    if (message.startsWith("ITEM_CONFLICT:")) {
      return NextResponse.json(
        {
          success: false,
          message: message.replace("ITEM_CONFLICT:", ""),
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Terjadi kesalahan saat menyimpan referensi harga.",
      },
      { status: 500 }
    );
  }
}
