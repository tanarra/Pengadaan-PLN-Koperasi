
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/src/generated/prisma/client";
import prisma from "@/src/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

type ItemInput = {
  request_item_id: string;
  harga_satuan: string;
};

type BodyInput = {
  action: "draft";
  tanggal_surat: string;
  catatan: string;
  items: ItemInput[];
};

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

// GET: Mengambil data untuk form surat penawaran
export async function GET(
  request: NextRequest,
  { params }: Context
) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: "ID tidak valid." },
        { status: 400 }
      );
    }

    const permintaan = await prisma.permintaan_pengadaan.findUnique({
      where: { id: BigInt(id) },
      include: {
        unit_pln: true,
        procurement_request_items: {
          orderBy: { id: "asc" },
        },
        surat_penawaran: {
          include: {
            item_surat_penawaran: true,
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

    if (permintaan.status === "Permintaan Diterima" ||
        permintaan.status === "Proses Referensi Harga") {
      return NextResponse.json(
        { success: false, message: "Referensi harga belum selesai." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: permintaan.id.toString(),
        nomor_surat_permintaan: permintaan.nomor_surat,
        nama_unit: permintaan.unit_pln.nama_unit,
        nama_pengadaan: permintaan.nama_pengadaan,
        status: permintaan.status,
        surat: permintaan.surat_penawaran
          ? {
              id: permintaan.surat_penawaran.id.toString(),
              nomor_surat: permintaan.surat_penawaran.nomor_surat,
              tanggal_surat: permintaan.surat_penawaran.tanggal_surat,
              catatan: permintaan.surat_penawaran.catatan,
              status: permintaan.surat_penawaran.status,
              items: permintaan.surat_penawaran.item_surat_penawaran.map(
                item => ({
                  id: item.id.toString(),
                  nama_item: item.nama_item,
                  spesifikasi_item: item.spesifikasi_item,
                  jumlah_penawaran: item.jumlah_penawaran,
                  jenis_item: item.jenis_item,
                  harga_satuan: item.harga_satuan?.toString() ?? null,
                  subtotal: item.subtotal?.toString() ?? null,
                })
              ),
            }
          : null,
        items: permintaan.procurement_request_items.map(item => ({
          id: item.id.toString(),
          nama_item: item.nama_item,
          spesifikasi_item: item.spesifikasi_item,
          jumlah_permintaan: item.jumlah_permintaan,
          jenis_item: item.jenis_item,
          referencePrice: item.referencePrice?.toString() ?? null,
        })),
      },
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET surat penawaran:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data surat penawaran." },
      { status: 500 }
    );
  }
}

// POST: Menyimpan draft surat penawaran
export async function POST(
  request: NextRequest,
  { params }: Context
) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: "ID tidak valid." },
        { status: 400 }
      );
    }

    const requestId = BigInt(id);
    const body = await request.json() as BodyInput;

    if (
      body.action !== "draft" ||
      !validDate(body.tanggal_surat) ||
      !Array.isArray(body.items)
    ) {
      return NextResponse.json(
        { success: false, message: "Data surat tidak valid." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const permintaan = await tx.permintaan_pengadaan.findUnique({
        where: { id: requestId },
        include: {
          procurement_request_items: true,
          surat_penawaran: {
            include: {
              item_surat_penawaran: true,
            },
          },
        },
      });

      if (!permintaan) {
        throw new Error("PERMINTAAN_NOT_FOUND");
      }

      if (
        permintaan.status !== "Referensi Harga Selesai" &&
        permintaan.status !== "Penawaran Dibuat"
      ) {
        throw new Error("STATUS_INVALID");
      }

      const existing = permintaan.surat_penawaran;

      if (
        existing &&
        existing.status !== "Draft"
      ) {
        throw new Error("SURAT_ALREADY_PUBLISHED");
      }

      const sourceItems = permintaan.procurement_request_items;
      const sourceMap = new Map(
        sourceItems.map(item => [item.id.toString(), item])
      );

      const submittedIds = new Set<string>();

      const preparedItems = body.items.map(item => {
        if (
          !item ||
          typeof item.request_item_id !== "string" ||
          !sourceMap.has(item.request_item_id) ||
          submittedIds.has(item.request_item_id)
        ) {
          throw new Error("ITEM_INVALID");
        }

        submittedIds.add(item.request_item_id);

        const source = sourceMap.get(item.request_item_id)!;

        if (
          typeof item.harga_satuan !== "string" ||
          !/^\d+(\.\d{1,2})?$/.test(item.harga_satuan)
        ) {
          throw new Error("PRICE_INVALID");
        }

        const price = new Prisma.Decimal(item.harga_satuan);

        if (!price.isFinite() || price.lessThanOrEqualTo(0)) {
          throw new Error("PRICE_INVALID");
        }

        if (
          source.referencePrice === null ||
          price.lessThan(source.referencePrice)
        ) {
          throw new Error("PRICE_BELOW_REFERENCE");
        }

        const subtotal = price.mul(source.jumlah_permintaan);

        return {
          request_item_id: source.id,
          nama_item: source.nama_item,
          spesifikasi_item: source.spesifikasi_item,
          jumlah_penawaran: source.jumlah_permintaan,
          jenis_item: source.jenis_item,
          harga_satuan: price,
          subtotal,
        };
      });

      if (
        preparedItems.length !== sourceItems.length ||
        sourceItems.some(item => !submittedIds.has(item.id.toString()))
      ) {
        throw new Error("ITEM_INCOMPLETE");
      }

      let surat;

      if (existing) {
        surat = await tx.surat_penawaran.update({
          where: { id: existing.id },
          data: {
            tanggal_surat: new Date(`${body.tanggal_surat}T00:00:00`),
            catatan: body.catatan || null,
            item_surat_penawaran: {
              deleteMany: {},
              create: preparedItems.map(item => ({
                request_item_id: item.request_item_id,
                nama_item: item.nama_item,
                spesifikasi_item: item.spesifikasi_item,
                jumlah_penawaran: item.jumlah_penawaran,
                jenis_item: item.jenis_item,
                harga_satuan: item.harga_satuan,
                subtotal: item.subtotal,
              })),
            },
          },
        });
      } else {
        // Nomor surat dibuat setelah mekanisme penomoran
        // koperasi dikonfigurasi. Tidak menggunakan nomor acak.
        throw new Error("NUMBERING_NOT_CONFIGURED");
      }

      if (permintaan.status !== "Penawaran Dibuat") {
        await tx.permintaan_pengadaan.update({
          where: { id: requestId },
          data: {
            status: "Penawaran Dibuat",
            updated_at: new Date(),
          },
        });

        await tx.ProcurementStatusHistory.create({
          data: {
            requestId,
            status: "Penawaran Dibuat",
          },
        });
      }

      return surat;
    });

    return NextResponse.json({
      success: true,
      message: "Draft surat penawaran berhasil disimpan.",
      data: {
        id: result.id.toString(),
        nomor_surat: result.nomor_surat,
      },
    });
  } catch (error) {
    console.error("POST surat penawaran:", error);

    const messages: Record<string, string> = {
      PERMINTAAN_NOT_FOUND: "Permintaan tidak ditemukan.",
      STATUS_INVALID: "Status permintaan belum memungkinkan membuat penawaran.",
      SURAT_ALREADY_PUBLISHED: "Surat sudah diterbitkan dan tidak dapat diedit.",
      ITEM_INVALID: "Item penawaran tidak valid.",
      ITEM_INCOMPLETE: "Semua item permintaan harus dimasukkan.",
      PRICE_INVALID: "Harga penawaran tidak valid.",
      PRICE_BELOW_REFERENCE: "Harga penawaran tidak boleh di bawah referensi harga.",
      NUMBERING_NOT_CONFIGURED: "Penomoran surat otomatis belum dikonfigurasi.",
    };

    const message =
      error instanceof Error
        ? messages[error.message]
        : undefined;

    return NextResponse.json(
      {
        success: false,
        message: message ?? "Gagal menyimpan surat penawaran.",
      },
      {
        status: message ? 400 : 500,
      }
    );
  }
}
