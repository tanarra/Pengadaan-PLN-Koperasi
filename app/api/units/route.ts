import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export async function GET() {
  try {
    const units = await prisma.unit_pln.findMany({
      orderBy: {
        nama_unit: "asc",
      },
    });

    return NextResponse.json({
  success: true,
  data: units.map((unit) => ({
    ...unit,
    id: unit.id.toString(),
  })),
});
  } catch (error) {
    console.error("Gagal mengambil data unit PLN:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data unit PLN",
      },
      { status: 500 }
    );
  }
}