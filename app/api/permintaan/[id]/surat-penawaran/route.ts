
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const BULAN_ROMAWI = [
  "I", "II", "III", "IV", "V", "VI",
  "VII", "VIII", "IX", "X", "XI", "XII",
];

function tanggalJakarta() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return {
    year,
    month,
    date: new Date(Date.UTC(year, month - 1, day)),
  };
}

function rupiahDecimal(value: string, jumlah: number) {
  // Menghitung dalam satuan sen agar tidak terkena pembulatan float.
  const match = value.match(/^(\d+)(?:\.(\d{1,2}))?$/);

  if (!match) {
    throw new Error("Format harga tidak valid. Maksimal 2 angka desimal.");
  }

  const rupiah = BigInt(match[1]);
  const sen = BigInt((match[2] ?? "").padEnd(2, "0"));
  const totalSen = (rupiah * 100n + sen) * BigInt(jumlah);

  return {
    harga: `${rupiah}.${sen.toString().padStart(2, "0")}`,
    subtotal: `${totalSen / 100n}.${(totalSen % 100n)
      .toString()
      .padStart(2, "0")}`,
  };
}

function errorResponse(error: unknown) {
  console.error("API surat penawaran:", error);

  return NextResponse.json(
    {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan pada server.",
    },
    { status: 500 }
  );
}

// GET: Mengambil data permintaan dan surat penawaran.
export async function GET(
  _request: NextRequest,
  { params }: Context
) {
  try {
    const { id } = await params;
    const requestId = BigInt(id);

    const permintaan = await prisma.permintaan_pengadaan.findUnique({
      where: { id: requestId },
      include: {
        unit_pln: true,
        procurement_request_items: true,
        surat_penawaran: {
          include: {
            item_surat_penawaran: true,
          },
        },
      },
    });

    if (!permintaan) {
      return NextResponse.json(
        { success: false, message: "Data permintaan tidak ditemukan." },
        { status: 404 }
      );
    }

    const surat = permintaan.surat_penawaran;

    const data = {
      id: permintaan.id.toString(),
      nomor_surat_pln: permintaan.nomor_surat,
      nama_unit: permintaan.unit_pln.nama_unit,
      nama_pengadaan: permintaan.nama_pengadaan,
      status_permintaan: permintaan.status,

      items_permintaan: permintaan.procurement_request_items.map((item) => ({
        id: item.id.toString(),
        nama_item: item.nama_item,
        spesifikasi_item: item.spesifikasi_item,
        jumlah_permintaan: item.jumlah_permintaan,
        jenis_item: item.jenis_item,
        referencePrice: item.referencePrice?.toString() ?? null,
      })),

      surat_penawaran: surat
        ? {
            id: surat.id.toString(),
            nomor_surat: surat.nomor_surat,
            tanggal_surat: surat.tanggal_surat.toISOString(),
            catatan: surat.catatan,
            status: surat.status,
            tanggal_dikirim: surat.tanggal_dikirim?.toISOString() ?? null,
            tanggal_diterima: surat.tanggal_diterima?.toISOString() ?? null,

            items: surat.item_surat_penawaran.map((item) => ({
              id: item.id.toString(),
              request_item_id: item.request_item_id?.toString() ?? null,
              nama_item: item.nama_item,
              spesifikasi_item: item.spesifikasi_item,
              jumlah_penawaran: item.jumlah_penawaran,
              jenis_item: item.jenis_item,
              harga_satuan: item.harga_satuan?.toString() ?? null,
              subtotal: item.subtotal?.toString() ?? null,
            })),
          }
        : null,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST: Membuat draft dan nomor surat otomatis.
export async function POST(
  _request: NextRequest,
  { params }: Context
) {
  try {
    const { id } = await params;
    const requestId = BigInt(id);
    const { year, month, date } = tanggalJakarta();

    const result = await prisma.$transaction(async (tx) => {
      const permintaan = await tx.permintaan_pengadaan.findUnique({
        where: { id: requestId },
        include: {
          procurement_request_items: true,
          surat_penawaran: true,
        },
      });

      if (!permintaan) {
        throw new Error("Data permintaan tidak ditemukan.");
      }

      if (permintaan.surat_penawaran) {
        throw new Error("Surat penawaran untuk permintaan ini sudah dibuat.");
      }

      if (permintaan.status !== "Referensi Harga Selesai") {
        throw new Error("Referensi harga harus diselesaikan terlebih dahulu.");
      }

      if (permintaan.procurement_request_items.length === 0) {
        throw new Error("Permintaan belum memiliki item.");
      }

      // Increment nomor secara atomik untuk mencegah nomor ganda.
      const sequence = await tx.$queryRaw<
        { nomor_terakhir: number }[]
      >`
        INSERT INTO nomor_surat_penawaran_sequence
          (tahun, nomor_terakhir, updated_at)
        VALUES
          (${year}, 1, NOW())
        ON CONFLICT (tahun)
        DO UPDATE SET
          nomor_terakhir =
            nomor_surat_penawaran_sequence.nomor_terakhir + 1,
          updated_at = NOW()
        RETURNING nomor_terakhir
      `;

      const nomorUrut = String(sequence[0].nomor_terakhir).padStart(3, "0");
      const nomorSurat =
        `${nomorUrut}/KOP-PLN-PELITA/${BULAN_ROMAWI[month - 1]}/${year}`;

      const surat = await tx.surat_penawaran.create({
        data: {
          permintaan_id: requestId,
          nomor_surat: nomorSurat,
          tanggal_surat: date,
          status: "Draft",

          item_surat_penawaran: {
            create: permintaan.procurement_request_items.map((item) => ({
              request_item_id: item.id,
              nama_item: item.nama_item,
              spesifikasi_item: item.spesifikasi_item,
              jumlah_penawaran: item.jumlah_permintaan,
              jenis_item: item.jenis_item,
              harga_satuan: null,
              subtotal: null,
            })),
          },
        },
        include: {
          item_surat_penawaran: true,
        },
      });

      await tx.permintaan_pengadaan.update({
        where: { id: requestId },
        data: { status: "Penawaran Dibuat" },
      });

      await tx.procurementStatusHistory.create({
        data: {
          requestId,
          status: "Penawaran Dibuat",
        },
      });

      return surat;
    });

    return NextResponse.json({
      success: true,
      message: "Draft surat penawaran berhasil dibuat.",
      data: {
        id: result.id.toString(),
        nomor_surat: result.nomor_surat,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}


// PATCH: Menandai surat penawaran sudah dikirim.
export async function PATCH(
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
    const { tanggal_dikirim } = body;

    if (
      typeof tanggal_dikirim !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(tanggal_dikirim)
    ) {
      return NextResponse.json(
        { success: false, message: "Tanggal pengiriman tidak valid." },
        { status: 400 }
      );
    }

    const tanggal = new Date(`${tanggal_dikirim}T00:00:00.000Z`);

    if (Number.isNaN(tanggal.getTime())) {
      return NextResponse.json(
        { success: false, message: "Tanggal pengiriman tidak valid." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const surat = await tx.surat_penawaran.findUnique({
        where: { permintaan_id: requestId },
      });

      if (!surat) {
        throw new Error("Draft surat penawaran tidak ditemukan.");
      }

      if (surat.status !== "Draft") {
        throw new Error("Surat sudah dikirim atau tidak lagi berstatus Draft.");
      }

      const permintaan = await tx.permintaan_pengadaan.findUnique({
        where: { id: requestId },
      });

      if (!permintaan) {
        throw new Error("Data permintaan tidak ditemukan.");
      }

      await tx.surat_penawaran.update({
        where: { id: surat.id },
        data: {
          status: "Surat Terkirim",
          tanggal_dikirim: tanggal,
        },
      });

      await tx.permintaan_pengadaan.update({
        where: { id: requestId },
        data: { status: "Surat Terkirim" },
      });

      await tx.procurementStatusHistory.create({
        data: {
          requestId,
          status: "Surat Terkirim",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Surat penawaran berhasil ditandai terkirim.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}




// PUT: Menyimpan tanggal surat, tanggal pengiriman, catatan, dan harga pada draft.
export async function PUT(
  request: NextRequest,
  { params }: Context
) {
  try {
    const { id } = await params;
    const requestId = BigInt(id);
    const body = await request.json();

    const {
      tanggal_surat,
      tanggal_dikirim,
      catatan,
      items,
    } = body;

    // Validasi data utama
    if (
      typeof tanggal_surat !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(tanggal_surat) ||
      !Array.isArray(items)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Data yang dikirim tidak valid.",
        },
        { status: 400 }
      );
    }

    // Validasi tanggal surat
    const tanggal = new Date(
      `${tanggal_surat}T00:00:00.000Z`
    );

    if (
      Number.isNaN(tanggal.getTime()) ||
      tanggal.toISOString().slice(0, 10) !== tanggal_surat
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Tanggal surat tidak valid.",
        },
        { status: 400 }
      );
    }

    // Validasi tanggal pengiriman
    // Boleh kosong selama surat masih berstatus Draft.
    let tanggalDikirim: Date | null = null;

    if (tanggal_dikirim != null && tanggal_dikirim !== "") {
      if (
        typeof tanggal_dikirim !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(tanggal_dikirim)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Tanggal pengiriman tidak valid.",
          },
          { status: 400 }
        );
      }

      tanggalDikirim = new Date(
        `${tanggal_dikirim}T00:00:00.000Z`
      );

      if (
        Number.isNaN(tanggalDikirim.getTime()) ||
        tanggalDikirim.toISOString().slice(0, 10) !== tanggal_dikirim
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Tanggal pengiriman tidak valid.",
          },
          { status: 400 }
        );
      }
    }

    // Simpan perubahan dalam transaksi database
    await prisma.$transaction(async (tx) => {
      const surat = await tx.surat_penawaran.findUnique({
        where: { permintaan_id: requestId },
        include: {
          item_surat_penawaran: true,
        },
      });

      if (!surat) {
        throw new Error("Draft surat penawaran tidak ditemukan.");
      }

      if (surat.status !== "Draft") {
        throw new Error(
          "Surat tidak dapat diubah karena bukan berstatus Draft."
        );
      }

      if (items.length !== surat.item_surat_penawaran.length) {
        throw new Error(
          "Daftar item tidak sesuai dengan draft."
        );
      }

      const itemTersimpan = new Map(
        surat.item_surat_penawaran.map((item) => [
          item.id.toString(),
          item,
        ])
      );

      for (const input of items) {
        const item = itemTersimpan.get(String(input.id));

        if (!item) {
          throw new Error("Item penawaran tidak ditemukan.");
        }

        const nilaiHarga =
          input.harga_satuan === null ||
          input.harga_satuan === ""
            ? null
            : String(input.harga_satuan).trim();

        let hargaSatuan: string | null = null;
        let subtotal: string | null = null;

        if (nilaiHarga !== null) {
          if (!/^\d+(?:\.\d{1,2})?$/.test(nilaiHarga)) {
            throw new Error(
              `Harga untuk ${item.nama_item} tidak valid.`
            );
          }

          if (Number(nilaiHarga) <= 0) {
            throw new Error(
              `Harga untuk ${item.nama_item} harus lebih dari 0.`
            );
          }

          const hasil = rupiahDecimal(
            nilaiHarga,
            item.jumlah_penawaran
          );

          hargaSatuan = hasil.harga;
          subtotal = hasil.subtotal;
        }

        await tx.item_surat_penawaran.update({
          where: { id: item.id },
          data: {
            harga_satuan: hargaSatuan,
            subtotal,
          },
        });
      }

      // Simpan tanggal dan catatan tanpa mengubah status Draft.
      await tx.surat_penawaran.update({
        where: { id: surat.id },
        data: {
          tanggal_surat: tanggal,
          tanggal_dikirim: tanggalDikirim,
          catatan:
            typeof catatan === "string" ? catatan : null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Draft surat penawaran berhasil disimpan.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}


