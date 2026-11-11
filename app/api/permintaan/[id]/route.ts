
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { unlink, mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

type Props = {
  params: Promise<{ id: string }>;
};

type ItemPermintaan = {
  id?: string;
  nama_item: string;
  spesifikasi_item: string;
  jumlah_permintaan: number;
  jenis_item: "Barang" | "Jasa";
};

const folderUpload = path.resolve(
  process.cwd(),
  "uploads",
  "permintaan"
);

// ==========================================
// GET DETAIL PERMINTAAN BESERTA ITEM
// ==========================================
export async function GET(
  request: Request,
  { params }: Props
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
      include: {
        unit_pln: true,
        dokumen_permintaan: true,
        procurement_request_items: true,
      },
    });

    if (!permintaan) {
      return NextResponse.json(
        { success: false, message: "Data permintaan tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...permintaan,
        id: permintaan.id.toString(),
        unit_pln_id: permintaan.unit_pln_id.toString(),

        unit_pln: permintaan.unit_pln
          ? {
              ...permintaan.unit_pln,
              id: permintaan.unit_pln.id.toString(),
            }
          : null,

        dokumen_permintaan: permintaan.dokumen_permintaan
          ? {
              ...permintaan.dokumen_permintaan,
              id: permintaan.dokumen_permintaan.id.toString(),
              permintaan_id:
                permintaan.dokumen_permintaan.permintaan_id.toString(),
            }
          : null,

        procurement_request_items:
          permintaan.procurement_request_items.map((item) => ({
            ...item,
            id: item.id.toString(),
            requestId: item.requestId.toString(),
          })),
      },
    });
  } catch (error) {
    console.error("Gagal mengambil detail permintaan:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail permintaan." },
      { status: 500 }
    );
  }
}

// ==========================================
// UPDATE PERMINTAAN BESERTA ITEM
// ==========================================
export async function PUT(
  request: Request,
  { params }: Props
) {
  let filePathBaru = "";
  let filePathLama = "";

  try {
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: "ID permintaan tidak valid." },
        { status: 400 }
      );
    }

    const permintaanId = BigInt(id);
    const formData = await request.formData();

    // Ambil data utama
    const nomor_surat = String(
      formData.get("nomor_surat") ?? ""
    ).trim();

    const tanggal_surat = String(
      formData.get("tanggal_surat") ?? ""
    );

    const unit_pln_id = String(
      formData.get("unit_pln_id") ?? ""
    );

    const nama_pic = String(
      formData.get("nama_pic") ?? ""
    ).trim();

    const kontak_pic = String(
      formData.get("kontak_pic") ?? ""
    ).trim();

    const jenis_pengadaan = String(
      formData.get("jenis_pengadaan") ?? ""
    );

    const nama_pengadaan = String(
      formData.get("nama_pengadaan") ?? ""
    ).trim();

    const deskripsi_kebutuhan = String(
      formData.get("deskripsi_kebutuhan") ?? ""
    ).trim();

    const lokasi_pengiriman = String(
      formData.get("lokasi_pengiriman") ?? ""
    ).trim();

    const tanggal_kebutuhan = String(
      formData.get("tanggal_kebutuhan") ?? ""
    );

    // Validasi data utama
    if (
      !nomor_surat ||
      !tanggal_surat ||
      !unit_pln_id ||
      !nama_pic ||
      !kontak_pic ||
      !jenis_pengadaan ||
      !nama_pengadaan ||
      !deskripsi_kebutuhan ||
      !lokasi_pengiriman ||
      !tanggal_kebutuhan
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Semua data permintaan wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (!["Barang", "Jasa", "Campuran"].includes(jenis_pengadaan)) {
      return NextResponse.json(
        {
          success: false,
          message: "Jenis pengadaan tidak valid.",
        },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(unit_pln_id)) {
      return NextResponse.json(
        { success: false, message: "Unit PLN tidak valid." },
        { status: 400 }
      );
    }

    const tanggalSurat = new Date(
      `${tanggal_surat}T00:00:00`
    );

    const tanggalKebutuhan = new Date(
      `${tanggal_kebutuhan}T00:00:00`
    );

    if (
      Number.isNaN(tanggalSurat.getTime()) ||
      Number.isNaN(tanggalKebutuhan.getTime())
    ) {
      return NextResponse.json(
        { success: false, message: "Format tanggal tidak valid." },
        { status: 400 }
      );
    }

    // ==========================================
    // VALIDASI ITEM PERMINTAAN
    // ==========================================
    const itemsRaw = formData.get("items");

    if (typeof itemsRaw !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Data item permintaan wajib dikirim.",
        },
        { status: 400 }
      );
    }

    let items: ItemPermintaan[];

    try {
      items = JSON.parse(itemsRaw);
    } catch {
      return NextResponse.json(
        { success: false, message: "Format data item tidak valid." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Minimal harus ada satu item permintaan.",
        },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (
        !item ||
        typeof item.nama_item !== "string" ||
        !item.nama_item.trim() ||
        typeof item.spesifikasi_item !== "string" ||
        !item.spesifikasi_item.trim() ||
        !Number.isInteger(item.jumlah_permintaan) ||
        item.jumlah_permintaan < 1 ||
        !["Barang", "Jasa"].includes(item.jenis_item)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Data salah satu item tidak valid.",
          },
          { status: 400 }
        );
      }

      // ID kosong diperbolehkan untuk item baru.
      // ID angka digunakan untuk item yang sudah tersimpan.
      if (
        item.id !== undefined &&
        item.id !== "" &&
        (typeof item.id !== "string" || !/^\d+$/.test(item.id))
      ) {
        return NextResponse.json(
          { success: false, message: "ID item tidak valid." },
          { status: 400 }
        );
      }
    }

    // Ambil ID item lama yang dikirim dari formulir
    const itemIds = items
      .filter(
        (item) =>
          typeof item.id === "string" &&
          item.id.trim() !== ""
      )
      .map((item) => item.id!);

    // Pastikan tidak ada ID duplikat
    if (new Set(itemIds).size !== itemIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Terdapat ID item yang duplikat.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // CEK DATA PERMINTAAN
    // ==========================================
    const permintaanLama =
      await prisma.permintaan_pengadaan.findUnique({
        where: { id: permintaanId },
        include: { dokumen_permintaan: true },
      });

    if (!permintaanLama) {
      return NextResponse.json(
        {
          success: false,
          message: "Data permintaan tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    filePathLama =
      permintaanLama.dokumen_permintaan?.path_file ?? "";

    const unit = await prisma.unit_pln.findUnique({
      where: { id: BigInt(unit_pln_id) },
    });

    if (!unit) {
      return NextResponse.json(
        { success: false, message: "Unit PLN tidak ditemukan." },
        { status: 400 }
      );
    }

    // ==========================================
    // VALIDASI FILE PDF BARU
    // ==========================================
    const file = formData.get("file");

    let fileBaru:
      | {
          nama_file: string;
          nama_file_simpan: string;
          path_file: string;
          mime_type: string;
          ukuran_file: number;
        }
      | null = null;

    if (file instanceof File && file.size > 0) {
      if (
        file.type !== "application/pdf" ||
        file.size > 10 * 1024 * 1024
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "File harus PDF dengan ukuran maksimal 10 MB.",
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(
        await file.arrayBuffer()
      );

      if (buffer.subarray(0, 5).toString() !== "%PDF-") {
        return NextResponse.json(
          {
            success: false,
            message: "Isi file bukan dokumen PDF yang valid.",
          },
          { status: 400 }
        );
      }

      const namaFileSimpan = `${randomUUID()}.pdf`;

      await mkdir(folderUpload, { recursive: true });

      filePathBaru = path.join(
        folderUpload,
        namaFileSimpan
      );

      await writeFile(filePathBaru, buffer);

      fileBaru = {
        nama_file: file.name,
        nama_file_simpan: namaFileSimpan,
        path_file: path.relative(
          process.cwd(),
          filePathBaru
        ),
        mime_type: "application/pdf",
        ukuran_file: file.size,
      };
    }

    // ==========================================
    // SIMPAN DATA DENGAN TRANSAKSI PRISMA
    // ==========================================
    const hasil = await prisma.$transaction(async (tx) => {
      const itemLama =
        await tx.procurement_request_items.findMany({
          where: { requestId: permintaanId },
          select: { id: true },
        });

      const idItemLama = new Set(
        itemLama.map((item) => item.id.toString())
      );

      // Pastikan ID item yang dikirim milik permintaan ini
      for (const itemId of itemIds) {
        if (!idItemLama.has(itemId)) {
          throw new Error(
            "Salah satu item tidak ditemukan atau bukan milik permintaan ini."
          );
        }
      }

      // Update data utama
      const dataPermintaan =
        await tx.permintaan_pengadaan.update({
          where: { id: permintaanId },
          data: {
            nomor_surat,
            tanggal_surat: tanggalSurat,
            unit_pln_id: BigInt(unit_pln_id),
            nama_pic,
            kontak_pic,
            jenis_pengadaan,
            nama_pengadaan,
            deskripsi_kebutuhan,
            lokasi_pengiriman,
            tanggal_kebutuhan: tanggalKebutuhan,
          },
        });

      // Hapus item lama yang sudah dihapus dari formulir
      await tx.procurement_request_items.deleteMany({
        where: {
          requestId: permintaanId,
          ...(itemIds.length > 0
            ? {
                id: {
                  notIn: itemIds.map((itemId) =>
                    BigInt(itemId)
                  ),
                },
              }
            : {}),
        },
      });

      // Update item lama atau buat item baru
      for (const item of items) {
        const dataItem = {
          nama_item: item.nama_item.trim(),
          spesifikasi_item: item.spesifikasi_item.trim(),
          jumlah_permintaan: item.jumlah_permintaan,
          jenis_item: item.jenis_item,
        };

        if (item.id && item.id.trim() !== "") {
          await tx.procurement_request_items.update({
            where: { id: BigInt(item.id) },
            data: dataItem,
          });
        } else {
          await tx.procurement_request_items.create({
            data: {
              ...dataItem,
              requestId: permintaanId,
            },
          });
        }
      }

      // Ganti metadata PDF hanya jika ada file baru
      if (fileBaru) {
        await tx.dokumen_permintaan.upsert({
          where: { permintaan_id: permintaanId },
          create: {
            permintaan_id: permintaanId,
            ...fileBaru,
          },
          update: fileBaru,
        });
      }

      return dataPermintaan;
    });

    // ==========================================
    // HAPUS PDF LAMA SETELAH TRANSAKSI BERHASIL
    // ==========================================
    if (fileBaru && filePathLama) {
      const pathLama = path.resolve(
        process.cwd(),
        filePathLama
      );

      const relativePath = path.relative(
        folderUpload,
        pathLama
      );

      const aman =
        relativePath !== "" &&
        relativePath !== ".." &&
        !relativePath.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relativePath);

      if (aman) {
        try {
          await unlink(pathLama);
        } catch (error) {
          const err = error as NodeJS.ErrnoException;

          if (err.code !== "ENOENT") {
            console.error(
              "Gagal menghapus PDF lama:",
              error
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Permintaan dan item berhasil diperbarui.",
      data: {
        id: hasil.id.toString(),
        jumlah_item: items.length,
      },
    });
  } catch (error) {
    // Jika transaksi gagal, hapus file baru yang telanjur disimpan
    if (filePathBaru) {
      try {
        await unlink(filePathBaru);
      } catch {
        // Abaikan jika file sudah tidak ada
      }
    }

    console.error(
      "Gagal memperbarui permintaan:",
      error
    );

    const pesan =
      error instanceof Error ? error.message : "";

    if (
      pesan.includes("Salah satu item tidak ditemukan") ||
      pesan.includes("bukan milik permintaan")
    ) {
      return NextResponse.json(
        { success: false, message: pesan },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat memperbarui permintaan.",
      },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE PERMINTAAN
// ==========================================
export async function DELETE(
  request: Request,
  { params }: Props
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

    const permintaanId = BigInt(id);

    const permintaan =
      await prisma.permintaan_pengadaan.findUnique({
        where: {
          id: permintaanId,
        },
        include: {
          dokumen_permintaan: true,
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

    const pathDokumen =
      permintaan.dokumen_permintaan?.path_file;

    await prisma.$transaction(async (tx) => {
      await tx.dokumen_permintaan.deleteMany({
        where: {
          permintaan_id: permintaanId,
        },
      });

      // Item ikut terhapus melalui onDelete: Cascade
      await tx.permintaan_pengadaan.delete({
        where: {
          id: permintaanId,
        },
      });
    });

    // Hapus file PDF dari folder uploads
    if (pathDokumen) {
      const filePath = path.resolve(
        process.cwd(),
        pathDokumen
      );

      const relativePath = path.relative(
        folderUpload,
        filePath
      );

      const aman =
        relativePath !== "" &&
        relativePath !== ".." &&
        !relativePath.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relativePath);

      if (aman) {
        try {
          await unlink(filePath);
        } catch (error) {
          const err = error as NodeJS.ErrnoException;

          if (err.code !== "ENOENT") {
            console.error(
              "Gagal menghapus file PDF:",
              error
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Permintaan pengadaan berhasil dihapus.",
    });
  } catch (error) {
    console.error(
      "Gagal menghapus permintaan:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat menghapus permintaan.",
      },
      { status: 500 }
    );
  }
}
