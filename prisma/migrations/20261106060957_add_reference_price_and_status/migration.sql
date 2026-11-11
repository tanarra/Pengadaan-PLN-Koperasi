-- AlterTable
ALTER TABLE "permintaan_pengadaan" ADD COLUMN     "status" VARCHAR(50) NOT NULL DEFAULT 'Permintaan Diterima';

-- AlterTable
ALTER TABLE "procurement_request_items" ADD COLUMN     "referencePrice" DECIMAL(18,2),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProcurementStatusHistory" (
    "id" BIGSERIAL NOT NULL,
    "requestId" BIGINT NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "changedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcurementStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcurementStatusHistory_requestId_idx" ON "ProcurementStatusHistory"("requestId");

-- AddForeignKey
ALTER TABLE "ProcurementStatusHistory" ADD CONSTRAINT "ProcurementStatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "permintaan_pengadaan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
