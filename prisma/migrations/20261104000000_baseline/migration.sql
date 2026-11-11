-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."dokumen_permintaan" (
    "id" BIGSERIAL NOT NULL,
    "permintaan_id" BIGINT NOT NULL,
    "nama_file" VARCHAR(255) NOT NULL,
    "nama_file_simpan" VARCHAR(255) NOT NULL,
    "path_file" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    "ukuran_file" BIGINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dokumen_permintaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permintaan_pengadaan" (
    "id" BIGSERIAL NOT NULL,
    "nomor_surat" VARCHAR(100) NOT NULL,
    "tanggal_surat" DATE NOT NULL,
    "tanggal_diterima" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unit_pln_id" BIGINT NOT NULL,
    "nama_pic" VARCHAR(150) NOT NULL,
    "kontak_pic" VARCHAR(30) NOT NULL,
    "jenis_pengadaan" VARCHAR(20) NOT NULL,
    "nama_pengadaan" VARCHAR(255) NOT NULL,
    "deskripsi_kebutuhan" TEXT NOT NULL,
    "lokasi_pengiriman" VARCHAR(255) NOT NULL,
    "tanggal_kebutuhan" DATE NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permintaan_pengadaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."unit_pln" (
    "id" BIGSERIAL NOT NULL,
    "nama_unit" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_pln_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dokumen_permintaan_nama_file_simpan_key" ON "public"."dokumen_permintaan"("nama_file_simpan" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "dokumen_permintaan_permintaan_id_key" ON "public"."dokumen_permintaan"("permintaan_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "unit_pln_nama_unit_key" ON "public"."unit_pln"("nama_unit" ASC);

-- AddForeignKey
ALTER TABLE "public"."dokumen_permintaan" ADD CONSTRAINT "fk_dokumen_permintaan" FOREIGN KEY ("permintaan_id") REFERENCES "public"."permintaan_pengadaan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."permintaan_pengadaan" ADD CONSTRAINT "fk_permintaan_unit" FOREIGN KEY ("unit_pln_id") REFERENCES "public"."unit_pln"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
