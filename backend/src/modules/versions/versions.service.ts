import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentStatus, CollaboratorRole } from '@prisma/client';
import { CreateVersionDto } from './dto/create-version.dto';
import * as Y from 'yjs';
import * as Diff from 'diff';

@Injectable()
export class VersionsService {
    private readonly _logger = new Logger(VersionsService.name);

    constructor(private _prisma: PrismaService) {}

    // ==================== 权限检查 ====================

    private async _getUserRole(
        documentId: string,
        userId: string
    ): Promise<CollaboratorRole | null> {
        const document = await this._prisma.document.findUnique({
            where: { id: documentId },
            select: { authorId: true, status: true },
        });

        if (!document || document.status === DocumentStatus.DELETED) return null;
        if (document.authorId === userId) return CollaboratorRole.OWNER;

        const collaborator = await this._prisma.documentCollaborator.findUnique({
            where: { documentId_userId: { documentId, userId } },
        });

        return collaborator?.role ?? null;
    }

    private async _requireReadAccess(documentId: string, userId: string): Promise<void> {
        const document = await this._prisma.document.findUnique({
            where: { id: documentId },
            select: { id: true, status: true, isPublic: true },
        });

        if (!document || document.status === DocumentStatus.DELETED) {
            throw new NotFoundException('文档不存在');
        }

        const role = await this._getUserRole(documentId, userId);
        if (!role && !document.isPublic) {
            throw new ForbiddenException('无权访问此文档');
        }
    }

    private async _requireWriteAccess(documentId: string, userId: string): Promise<void> {
        await this._requireReadAccess(documentId, userId);

        const role = await this._getUserRole(documentId, userId);
        if (role !== CollaboratorRole.OWNER && role !== CollaboratorRole.EDITOR) {
            throw new ForbiddenException('无权编辑此文档');
        }
    }

    // ==================== 核心方法 ====================

    /**
     * 创建快照：复制当前文档 content → DocumentVersion
     */
    async createSnapshot(documentId: string, userId: string, dto: CreateVersionDto) {
        await this._requireWriteAccess(documentId, userId);

        const document = await this._prisma.document.findUnique({
            where: { id: documentId },
            select: { content: true },
        });

        if (!document) {
            throw new NotFoundException('文档不存在');
        }

        // 获取当前最大版本号
        const lastVersion = await this._prisma.documentVersion.findFirst({
            where: { documentId },
            orderBy: { version: 'desc' },
            select: { version: true },
        });

        const nextVersion = (lastVersion?.version ?? 0) + 1;

        const version = await this._prisma.documentVersion.create({
            data: {
                documentId,
                version: nextVersion,
                content: document.content ?? Buffer.alloc(0),
                changeLog: dto.changeLog ?? `版本 ${nextVersion}`,
                createdBy: userId,
            },
            include: {
                author: { select: { id: true, username: true, nickname: true } },
            },
        });

        return this._formatVersionItem(version);
    }

    /**
     * 获取版本列表（分页，倒序）
     */
    async listVersions(documentId: string, userId: string, page: number = 1, limit: number = 20) {
        await this._requireReadAccess(documentId, userId);

        const skip = (page - 1) * limit;

        const [versions, total] = await Promise.all([
            this._prisma.documentVersion.findMany({
                where: { documentId },
                orderBy: { version: 'desc' },
                skip,
                take: limit,
                include: {
                    author: { select: { id: true, username: true, nickname: true } },
                },
            }),
            this._prisma.documentVersion.count({ where: { documentId } }),
        ]);

        return {
            items: versions.map((v) => this._formatVersionItem(v)),
            total,
            page,
            limit,
        };
    }

    /**
     * 获取单个版本内容（Base64 编码）
     */
    async getVersionContent(documentId: string, version: number, userId: string) {
        await this._requireReadAccess(documentId, userId);

        const versionRecord = await this._prisma.documentVersion.findUnique({
            where: { documentId_version: { documentId, version } },
            include: {
                author: { select: { id: true, username: true, nickname: true } },
            },
        });

        if (!versionRecord) {
            throw new NotFoundException('版本不存在');
        }

        return {
            ...this._formatVersionItem(versionRecord),
            contentBase64: versionRecord.content
                ? Buffer.from(versionRecord.content).toString('base64')
                : '',
        };
    }

    /**
     * 版本 Diff：将两个版本转为文本后做文本级 diff
     */
    async diffVersions(documentId: string, fromVersion: number, toVersion: number, userId: string) {
        await this._requireReadAccess(documentId, userId);

        const [fromRecord, toRecord] = await Promise.all([
            this._prisma.documentVersion.findUnique({
                where: { documentId_version: { documentId, version: fromVersion } },
                select: { content: true },
            }),
            this._prisma.documentVersion.findUnique({
                where: { documentId_version: { documentId, version: toVersion } },
                select: { content: true },
            }),
        ]);

        if (!fromRecord) {
            throw new NotFoundException(`版本 ${fromVersion} 不存在`);
        }
        if (!toRecord) {
            throw new NotFoundException(`版本 ${toVersion} 不存在`);
        }

        const fromText = this._yjsStateToText(fromRecord.content);
        const toText = this._yjsStateToText(toRecord.content);

        const changes = Diff.diffWords(fromText, toText);
        const diffHtml = changes
            .map((change) => {
                const text = change.value
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br/>');
                if (change.added) {
                    return `<ins class="diff-added">${text}</ins>`;
                }
                if (change.removed) {
                    return `<del class="diff-removed">${text}</del>`;
                }
                return text;
            })
            .join('');

        return {
            fromVersion,
            toVersion,
            diffHtml,
        };
    }

    /**
     * 恢复版本：用目标版本 content 覆盖当前文档，并创建恢复快照
     */
    async restoreVersion(documentId: string, version: number, userId: string) {
        await this._requireWriteAccess(documentId, userId);

        const versionRecord = await this._prisma.documentVersion.findUnique({
            where: { documentId_version: { documentId, version } },
        });

        if (!versionRecord) {
            throw new NotFoundException(`版本 ${version} 不存在`);
        }

        // 覆盖文档当前 content
        await this._prisma.document.update({
            where: { id: documentId },
            data: { content: versionRecord.content },
        });

        // 自动创建恢复快照
        const lastVersion = await this._prisma.documentVersion.findFirst({
            where: { documentId },
            orderBy: { version: 'desc' },
            select: { version: true },
        });

        const nextVersion = (lastVersion?.version ?? 0) + 1;

        const snapshot = await this._prisma.documentVersion.create({
            data: {
                documentId,
                version: nextVersion,
                content: versionRecord.content,
                changeLog: `恢复到版本 ${version}`,
                createdBy: userId,
            },
            include: {
                author: { select: { id: true, username: true, nickname: true } },
            },
        });

        this._logger.log(`文档 ${documentId} 已恢复到版本 ${version}，新快照 v${nextVersion}`);

        return this._formatVersionItem(snapshot);
    }

    // ==================== 工具方法 ====================

    /**
     * 将 Yjs 二进制状态转为纯文本（用于 diff）
     */
    private _yjsStateToText(state: Uint8Array | null): string {
        if (!state || state.length === 0) return '';

        try {
            const doc = new Y.Doc();
            Y.applyUpdate(doc, state);
            const fragment = doc.getXmlFragment('default');
            const text = fragment.toJSON ? JSON.stringify(fragment.toJSON()) : '';
            doc.destroy();
            return text;
        } catch {
            return '';
        }
    }

    /**
     * 格式化版本记录为前端类型
     */
    private _formatVersionItem(version: {
        id: string;
        documentId: string;
        version: number;
        changeLog: string | null;
        createdBy: string;
        createdAt: Date;
        author: { id: string; username: string; nickname: string | null };
    }) {
        return {
            id: version.id,
            documentId: version.documentId,
            version: version.version,
            changeLog: version.changeLog,
            createdBy: version.createdBy,
            createdAt: version.createdAt.toISOString(),
            author: version.author,
        };
    }
}
