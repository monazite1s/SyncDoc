-- CreateEnum: 活动操作类型
CREATE TYPE "ActivityAction" AS ENUM ('COLLABORATOR_ADDED', 'COLLABORATOR_REMOVED', 'COLLABORATOR_ROLE_CHANGED', 'OWNERSHIP_TRANSFERRED', 'SHARE_LINK_CREATED', 'SHARE_LINK_REVOKED', 'DOCUMENT_DELETED', 'DOCUMENT_ARCHIVED', 'VERSION_RESTORED');

-- CreateTable: 活动日志表
CREATE TABLE "document_activity_logs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "ActivityAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_activity_logs_documentId_createdAt_idx" ON "document_activity_logs"("documentId", "createdAt");
CREATE INDEX "document_activity_logs_action_idx" ON "document_activity_logs"("action");

-- AddForeignKey
ALTER TABLE "document_activity_logs" ADD CONSTRAINT "document_activity_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_activity_logs" ADD CONSTRAINT "document_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
