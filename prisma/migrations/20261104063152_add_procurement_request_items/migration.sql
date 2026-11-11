-- CreateTable
CREATE TABLE "procurement_request_items" (
    "id" BIGSERIAL NOT NULL,
    "requestId" BIGINT NOT NULL,
    "nama_item" VARCHAR(255) NOT NULL,
    "spesifikasi_item" TEXT NOT NULL,
    "jumlah_permintaan" INTEGER NOT NULL,
    "jenis_item" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "procurement_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "procurement_request_items_requestId_idx" ON "procurement_request_items"("requestId");

-- AddForeignKey
ALTER TABLE "procurement_request_items" ADD CONSTRAINT "fk_procurement_request_items_request" FOREIGN KEY ("requestId") REFERENCES "permintaan_pengadaan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
