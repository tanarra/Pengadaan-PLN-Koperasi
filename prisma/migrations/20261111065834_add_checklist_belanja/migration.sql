-- AlterTable
ALTER TABLE "procurement_request_items" ADD COLUMN     "sudah_dibeli" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tanggal_pembelian" DATE;
