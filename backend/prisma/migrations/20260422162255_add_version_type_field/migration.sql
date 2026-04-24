-- CreateEnum
CREATE TYPE "VersionType" AS ENUM ('AUTO', 'MANUAL', 'RESTORE');

-- AlterTable
ALTER TABLE "document_versions" ADD COLUMN     "summary" TEXT,
ADD COLUMN     "type" "VersionType" NOT NULL DEFAULT 'AUTO';

-- CreateIndex
CREATE INDEX "document_versions_documentId_type_idx" ON "document_versions"("documentId", "type");
