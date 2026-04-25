-- AlterTable: 为版本记录添加用户自定义标签
ALTER TABLE "document_versions" ADD COLUMN "label" TEXT;
