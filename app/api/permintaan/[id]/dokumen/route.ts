
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: "ID permintaan tidak valid." },
        { status: 400 }
      );
    }

    const dokumen = await prisma.dokumen_permintaan.findUnique({
      where: {
        permintaan_id: BigInt(id),
      },
    });

    if (!dokumen) {
      return NextResponse.json(
        { success: false, message: "Dokumen tidak ditemukan." },
        { status: 404 }
      );
    }

    const folderUpload = path.resolve(
      process.cwd(),
      "uploads",
      "permintaan"
    );

    const filePath = path.resolve(process.cwd(), dokumen.path_file);

    if (!filePath.startsWith(folderUpload + path.sep)) {
      return NextResponse.json(
        { success: false, message: "Lokasi dokumen tidak valid." },
        { status: 400 }
      );
    }

    const fileBuffer = await readFile(filePath);

    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";

    const safeFileName = dokumen.nama_file.replace(/["\r\n]/g, "_");

    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeFileName}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Gagal mengambil dokumen:", error);

    return NextResponse.json(
      { success: false, message: "Gagal membuka dokumen PDF." },
      { status: 500 }
    );
  }
}
