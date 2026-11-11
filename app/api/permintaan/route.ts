
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

type ItemPengadaan = {
  nama_item: string;
  spesifikasi_item?: string;
  jumlah_permintaan: number;
  jenis_item: string;
};

export async function POST(request: Request) {
  let filePath = "";

  try {
    const formData = await request.formData();

    // Data utama permintaan
    const nomorSurat = formData.get("nomor_surat");
    const tanggalSurat = formData.get("tanggal_surat");
    const unitPlnId = formData.get("unit_pln_id");
    const namaPic = formData.get("nama_pic");
    const kontakPic = formData.get("kontak_pic");
    const jenisPengadaan = formData.get("jenis_pengadaan");
    const namaPengadaan = formData.get("nama_pengadaan");
    const deskripsi = formData.get("deskripsi_kebutuhan");
    const lokasi = formData.get("lokasi_pengiriman");
    const tanggalKebutuhan = formData.get("tanggal_kebutuhan");

    // Data item pengadaan
    const itemsRaw = formData.get("items");

    let items: ItemPengadaan[];

    try {
      const parsedItems = JSON.parse(String(itemsRaw ?? "[]"));

      if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Minimal harus ada satu item pengadaan.",
          },
          { status: 400 }
        );
      }

      items = parsedItems.map((item: any) => ({
        nama_item: item.nama_item,
        spesifikasi_item: item.spesifikasi_item ?? "",
        jumlah_permintaan: Number(item.jumlah_permintaan),
        jenis_item: item.jenis_item,
      }));
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Format data item pengadaan tidak valid.",
        },
        { status: 400 }
      );
    }

    // Validasi kolom utama
    const requiredFields = [
      nomorSurat,
      tanggalSurat,
      unitPlnId,
      namaPic,
      kontakPic,
      jenisPengadaan,
      namaPengadaan,
      deskripsi,
      lokasi,
      tanggalKebutuhan,
    ];

    if (
      requiredFields.some(
        (value) => typeof value !== "string" || !value.trim()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Semua kolom wajib diisi.",
        },
        { status: 400 }
      );
    }

    // Validasi jenis pengadaan utama
    if (
      !["Barang", "Jasa", "Campuran"].includes(
        jenisPengadaan as string
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Jenis pengadaan tidak valid.",
        },
        { status: 400 }
      );
    }

    // Validasi setiap item
    for (const item of items) {
      if (
        typeof item.nama_item !== "string" ||
        !item.nama_item.trim() ||
        !Number.isInteger(item.jumlah_permintaan) ||
        item.jumlah_permintaan <= 0 ||
        !["Barang", "Jasa"].includes(item.jenis_item)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Data item pengadaan tidak valid.",
          },
          { status: 400 }
        );
      }
    }

    // Validasi file PDF
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "File PDF wajib diunggah.",
        },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          message: "Ukuran PDF maksimal 10 MB.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (
      file.type !== "application/pdf" ||
      buffer.subarray(0, 5).toString() !== "%PDF-"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "File harus berupa PDF yang valid.",
        },
        { status: 400 }
      );
    }

    // Periksa unit PLN
    const unit = await prisma.unit_pln.findUnique({
      where: {
        id: BigInt(unitPlnId as string),
      },
    });

    if (!unit) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit PLN tidak ditemukan.",
        },
        { status: 400 }
      );
    }

    // Simpan file PDF
    const folderUpload = path.join(
      process.cwd(),
      "uploads",
      "permintaan"
    );

    await mkdir(folderUpload, { recursive: true });

    const namaSimpan = `${randomUUID()}.pdf`;

    filePath = path.join(folderUpload, namaSimpan);

    await writeFile(filePath, buffer);

    // Simpan permintaan, dokumen, dan item sekaligus
    const hasil = await prisma.permintaan_pengadaan.create({
      data: {
        nomor_surat: (nomorSurat as string).trim(),

        tanggal_surat: new Date(
          `${tanggalSurat}T00:00:00`
        ),

        unit_pln_id: BigInt(unitPlnId as string),

        nama_pic: (namaPic as string).trim(),

        kontak_pic: (kontakPic as string).trim(),

        jenis_pengadaan: jenisPengadaan as string,

        nama_pengadaan: (namaPengadaan as string).trim(),

        deskripsi_kebutuhan: (deskripsi as string).trim(),

        lokasi_pengiriman: (lokasi as string).trim(),

        tanggal_kebutuhan: new Date(
          `${tanggalKebutuhan}T00:00:00`
        ),

        // Simpan dokumen PDF
        dokumen_permintaan: {
          create: {
            nama_file: path.basename(file.name),
            nama_file_simpan: namaSimpan,
            path_file: path.join(
              "uploads",
              "permintaan",
              namaSimpan
            ),
            mime_type: "application/pdf",
            ukuran_file: BigInt(file.size),
          },
        },

        // Simpan daftar item pengadaan
        procurement_request_items: {
          create: items.map((item) => ({
            nama_item: item.nama_item.trim(),
            spesifikasi_item:
              item.spesifikasi_item?.trim() || "",
            jumlah_permintaan: item.jumlah_permintaan,
            jenis_item: item.jenis_item,
          })),
        },
      },

      select: {
        id: true,
        nomor_surat: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Permintaan pengadaan berhasil disimpan.",
        data: {
          id: hasil.id.toString(),
          nomor_surat: hasil.nomor_surat,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Hapus file jika penyimpanan database gagal
    if (filePath) {
      await unlink(filePath).catch(() => {});
    }

    console.error("Gagal menyimpan permintaan:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat menyimpan permintaan.",
      },
      { status: 500 }
    );
  }
}
