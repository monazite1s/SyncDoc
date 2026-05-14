-- AlterEnum: 在 CollaboratorRole 中新增 ADMIN 角色
ALTER TYPE "CollaboratorRole" ADD VALUE 'ADMIN' BEFORE 'EDITOR';
