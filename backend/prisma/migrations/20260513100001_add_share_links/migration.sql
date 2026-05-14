-- CreateEnum: 分享链接访客角色（须先于使用该类型的表）
CREATE TYPE "ShareLinkRole" AS ENUM ('VIEWER', 'EDITOR');

-- CreateTable: 分享链接表
CREATE TABLE "document_share_links" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "ShareLinkRole" NOT NULL DEFAULT 'VIEWER',
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_share_links_token_key" ON "document_share_links"("token");
CREATE INDEX "document_share_links_token_idx" ON "document_share_links"("token");
CREATE INDEX "document_share_links_documentId_idx" ON "document_share_links"("documentId");

-- AddForeignKey
ALTER TABLE "document_share_links" ADD CONSTRAINT "document_share_links_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_share_links" ADD CONSTRAINT "document_share_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
