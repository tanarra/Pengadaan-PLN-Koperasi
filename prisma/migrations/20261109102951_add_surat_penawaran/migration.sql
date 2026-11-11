-- CreateTable
CREATE TABLE "surat_penawaran" (
    "id" BIGSERIAL NOT NULL,
    "permintaan_id" BIGINT NOT NULL,
    "nomor_surat" VARCHAR(100) NOT NULL,
    "tanggal_surat" DATE NOT NULL,
    "catatan" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Draft',
    "tanggal_dikirim" TIMESTAMP(6),
    "tanggal_diterima" TIMESTAMP(6),
    "catatan_konfirmasi" TEXT,
    "bukti_penerimaan_nama_file" VARCHAR(255),
    "bukti_penerimaan_simpan" VARCHAR(255),
    "bukti_penerimaan_path" TEXT,
    "bukti_penerimaan_mime" VARCHAR(100),
    "bukti_penerimaan_ukuran" BIGINT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "surat_penawaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_surat_penawaran" (
    "id" BIGSERIAL NOT NULL,
    "surat_penawaran_id" BIGINT NOT NULL,
    "request_item_id" BIGINT,
    "nama_item" VARCHAR(255) NOT NULL,
    "spesifikasi_item" TEXT NOT NULL,
    "jumlah_penawaran" INTEGER NOT NULL,
    "jenis_item" VARCHAR(20) NOT NULL,
    "harga_satuan" DECIMAL(18,2),
    "subtotal" DECIMAL(18,2),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "item_surat_penawaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nomor_surat_penawaran_sequence" (
    "id" BIGSERIAL NOT NULL,
    "tahun" INTEGER NOT NULL,
    "nomor_terakhir" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nomor_surat_penawaran_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "surat_penawaran_permintaan_id_key" ON "surat_penawaran"("permintaan_id");

-- CreateIndex
CREATE UNIQUE INDEX "surat_penawaran_nomor_surat_key" ON "surat_penawaran"("nomor_surat");

-- CreateIndex
CREATE UNIQUE INDEX "surat_penawaran_bukti_penerimaan_simpan_key" ON "surat_penawaran"("bukti_penerimaan_simpan");

-- CreateIndex
CREATE INDEX "surat_penawaran_status_idx" ON "surat_penawaran"("status");

-- CreateIndex
CREATE INDEX "item_surat_penawaran_surat_penawaran_id_idx" ON "item_surat_penawaran"("surat_penawaran_id");

-- CreateIndex
CREATE UNIQUE INDEX "nomor_surat_penawaran_sequence_tahun_key" ON "nomor_surat_penawaran_sequence"("tahun");

-- AddForeignKey
ALTER TABLE "surat_penawaran" ADD CONSTRAINT "surat_penawaran_permintaan_id_fkey" FOREIGN KEY ("permintaan_id") REFERENCES "permintaan_pengadaan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_surat_penawaran" ADD CONSTRAINT "item_surat_penawaran_surat_penawaran_id_fkey" FOREIGN KEY ("surat_penawaran_id") REFERENCES "surat_penawaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;
