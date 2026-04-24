-- AlterTable
ALTER TABLE "documents"
ADD COLUMN "parentId" TEXT,
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "documents_parentId_position_idx" ON "documents"("parentId", "position");

-- AddForeignKey
ALTER TABLE "documents"
ADD CONSTRAINT "documents_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "documents"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
