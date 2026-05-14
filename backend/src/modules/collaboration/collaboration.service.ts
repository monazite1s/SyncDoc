import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VersionType } from '@prisma/client';

@Injectable()
export class CollaborationService {
    private readonly _logger = new Logger(CollaborationService.name);
    private static readonly AUTO_SNAPSHOT_INTERVAL_MS = 30 * 60 * 1000;

    constructor(private readonly _prisma: PrismaService) {}

    /**
     * 从数据库加载文档的 Yjs 二进制状态
     */
    async loadDocumentState(documentName: string): Promise<Uint8Array | null> {
        const document = await this._prisma.document.findUnique({
            where: { id: documentName },
            select: { id: true, content: true },
        });

        if (!document || !document.content) {
            return null;
        }

        // Prisma Bytes → Uint8Array
        return new Uint8Array(document.content);
    }

    /**
     * 持久化当前协同状态 → documents.content（答辩：在线「当前稿」与历史快照分表存）
     */
    async storeDocumentState(documentName: string, state: Uint8Array): Promise<void> {
        try {
            await this._prisma.document.update({
                where: { id: documentName },
                // documentName 即文档 id，与 Hocuspocus documentName 一致
                data: { content: Buffer.from(state) },
            });
        } catch (error) {
            this._logger.error(`存储文档 ${documentName} 状态失败: ${(error as Error).message}`);
            throw error;
        }
    }

    /**
     * 按间隔自动创建版本快照，避免历史版本长期为空。
     * force=true 时忽略时间间隔（用于断开连接时兜底快照）。
     * 包含短时去重：同一用户 5 分钟内若已有自动快照，直接覆盖而非新增。
     */
    // eslint-disable-next-line max-lines-per-function -- 自动快照：查询、去重、节流、建版本同一流程
    async maybeCreateAutoSnapshot(
        documentName: string,
        userId: string,
        state: Uint8Array,
        options?: { force?: boolean }
    ): Promise<void> {
        try {
            const document = await this._prisma.document.findUnique({
                where: { id: documentName },
                select: { id: true, status: true },
            });

            if (!document || document.status === 'DELETED') {
                return;
            }

            const latestVersion = await this._prisma.documentVersion.findFirst({
                where: { documentId: documentName },
                orderBy: { version: 'desc' },
                select: {
                    id: true,
                    version: true,
                    type: true,
                    content: true,
                    createdBy: true,
                    createdAt: true,
                },
            });

            const currentState = Buffer.from(state);
            // 与最新版本二进制相同则跳过，避免无意义版本膨胀
            if (
                latestVersion?.content &&
                Buffer.compare(Buffer.from(latestVersion.content), currentState) === 0
            ) {
                return;
            }

            // 短时去重：同一用户 5 分钟内的自动快照直接覆盖（不新增版本号）
            const DEDUP_INTERVAL_MS = 5 * 60 * 1000;
            if (
                latestVersion &&
                latestVersion.type === VersionType.AUTO &&
                latestVersion.createdBy === userId
            ) {
                const elapsed = Date.now() - latestVersion.createdAt.getTime();
                if (elapsed < DEDUP_INTERVAL_MS) {
                    await this._prisma.documentVersion.update({
                        where: { id: latestVersion.id },
                        data: { content: currentState, createdAt: new Date() },
                    });
                    return;
                }
            }

            // 默认 30 分钟内不新建 AUTO（force 时跳过，供 onDisconnect 兜底）
            if (!options?.force && latestVersion) {
                const elapsed = Date.now() - latestVersion.createdAt.getTime();
                if (elapsed < CollaborationService.AUTO_SNAPSHOT_INTERVAL_MS) {
                    return;
                }
            }

            const nextVersion = (latestVersion?.version ?? 0) + 1;
            // 历史时间点：整份 Yjs 状态快照，供回溯/对比（非增量 OT 操作链）
            await this._prisma.documentVersion.create({
                data: {
                    documentId: documentName,
                    version: nextVersion,
                    type: VersionType.AUTO,
                    content: currentState,
                    changeLog: null,
                    createdBy: userId,
                },
            });
        } catch (error) {
            this._logger.error(
                `自动创建文档 ${documentName} 快照失败: ${(error as Error).message}`
            );
        }
    }

    /**
     * 验证用户是否存在且状态活跃
     */
    async validateUser(userId: string): Promise<{ id: string; username: string } | null> {
        const user = await this._prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, status: true },
        });

        if (!user || user.status !== 'ACTIVE') {
            return null;
        }

        return user;
    }

    /**
     * 获取用户在文档中的角色及访问权限（用于 WS 认证）
     */
    async getDocumentRole(
        documentId: string,
        userId: string
    ): Promise<{ canAccess: boolean; readOnly: boolean }> {
        const document = await this._prisma.document.findUnique({
            where: { id: documentId },
            select: { authorId: true, isPublic: true, status: true },
        });

        if (!document || document.status === 'DELETED') {
            return { canAccess: false, readOnly: true };
        }

        if (document.authorId === userId) {
            return { canAccess: true, readOnly: false };
        }

        const collaborator = await this._prisma.documentCollaborator.findUnique({
            where: { documentId_userId: { documentId, userId } },
        });

        if (collaborator) {
            return {
                canAccess: true,
                readOnly: collaborator.role === 'VIEWER',
                // ADMIN、EDITOR 可编辑，VIEWER 只读
            };
        }

        if (document.isPublic) {
            return { canAccess: true, readOnly: true };
        }

        return { canAccess: false, readOnly: true };
    }

    /**
     * 检查用户是否有文档的访问权限
     */
    async checkDocumentAccess(documentId: string, userId: string): Promise<boolean> {
        const document = await this._prisma.document.findUnique({
            where: { id: documentId },
            select: { authorId: true, isPublic: true },
        });

        if (!document) {
            throw new NotFoundException('文档不存在');
        }

        if (document.authorId === userId || document.isPublic) {
            return true;
        }

        const collaborator = await this._prisma.documentCollaborator.findUnique({
            where: {
                documentId_userId: { documentId, userId },
            },
        });

        return !!collaborator;
    }

    /**
     * 获取文档最新版本号
     */
    async getLatestVersionNumber(documentId: string): Promise<number> {
        const latest = await this._prisma.documentVersion.findFirst({
            where: { documentId },
            orderBy: { version: 'desc' },
            select: { version: true },
        });
        return latest?.version ?? 0;
    }

    /**
     * 记录编辑归属：仅在用户 ID 变化时写入，减少记录量
     */
    async recordEdit(
        documentId: string,
        userId: string,
        operation: Uint8Array,
        version: number
    ): Promise<void> {
        try {
            const lastEdit = await this._prisma.documentEdit.findFirst({
                where: { documentId },
                orderBy: { timestamp: 'desc' },
                select: { userId: true },
            });

            // 同一用户连续编辑不重复记录
            if (lastEdit?.userId === userId) return;

            await this._prisma.documentEdit.create({
                data: {
                    documentId,
                    userId,
                    operation: Buffer.from(operation),
                    version,
                },
            });
        } catch (error) {
            this._logger.error(`记录文档 ${documentId} 编辑归属失败: ${(error as Error).message}`);
        }
    }
}
