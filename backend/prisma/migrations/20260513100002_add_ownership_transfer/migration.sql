-- AlterTable: 添加所有权转让字段
ALTER TABLE "documents" ADD COLUMN "pendingOwnerId" TEXT;
ALTER TABLE "documents" ADD COLUMN "ownershipTransferRequestedAt" TIMESTAMP(3);
