import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentStatus, CollaboratorRole, VersionType } from '@prisma/client';
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
     * 手动创建快照：复制当前文档 content → DocumentVersion（type = MANUAL）
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
                type: VersionType.MANUAL,
                content: document.content ?? Buffer.alloc(0),
                changeLog: dto.changeLog || null,
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

        const prevVersionRecord = await this._prisma.documentVersion.findFirst({
            where: {
                documentId,
                version: { lt: version },
            },
            orderBy: { version: 'desc' },
            select: { content: true },
        });

        return {
            ...this._formatVersionItem(versionRecord),
            contentBase64: versionRecord.content
                ? Buffer.from(versionRecord.content).toString('base64')
                : '',
            prevContentBase64: prevVersionRecord?.content
                ? Buffer.from(prevVersionRecord.content).toString('base64')
                : null,
        };
    }

    /**
     * 版本 Diff：将两个版本转为 Markdown 后做行级 diff，返回结构化变更数据
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

        if (!fromRecord) throw new NotFoundException(`版本 ${fromVersion} 不存在`);
        if (!toRecord) throw new NotFoundException(`版本 ${toVersion} 不存在`);

        const fromText = this._yjsStateToMarkdown(fromRecord.content);
        const toText = this._yjsStateToMarkdown(toRecord.content);

        // 行级 diff
        const rawChanges = Diff.diffLines(fromText, toText);

        const MAX_LINES = 5000;
        let lineCount = 0;
        let truncated = false;

        const changes: Array<{ type: 'added' | 'removed' | 'unchanged'; content: string }> = [];
        const stats = { additions: 0, deletions: 0, unchanged: 0 };

        for (const change of rawChanges) {
            if (truncated) break;

            const lines = change.value.split('\n').filter((l, i, arr) => {
                return !(i === arr.length - 1 && l === '');
            });

            for (const line of lines) {
                if (lineCount >= MAX_LINES) {
                    truncated = true;
                    break;
                }

                if (change.added) {
                    changes.push({ type: 'added', content: line });
                    stats.additions++;
                } else if (change.removed) {
                    changes.push({ type: 'removed', content: line });
                    stats.deletions++;
                } else {
                    changes.push({ type: 'unchanged', content: line });
                    stats.unchanged++;
                }
                lineCount++;
            }
        }

        return {
            fromVersion,
            toVersion,
            changes,
            stats,
            truncated,
        };
    }

    /**
     * 恢复版本：用目标版本 content 覆盖当前文档，并创建恢复快照（type = RESTORE）
     */
    async restoreVersion(documentId: string, version: number, userId: string) {
        await this._requireWriteAccess(documentId, userId);

        const versionRecord = await this._prisma.documentVersion.findUnique({
            where: { documentId_version: { documentId, version } },
            include: { author: { select: { id: true, username: true, nickname: true } } },
        });

        if (!versionRecord) {
            throw new NotFoundException(`版本 ${version} 不存在`);
        }

        await this._prisma.document.update({
            where: { id: documentId },
            data: { content: versionRecord.content },
        });

        const lastVersion = await this._prisma.documentVersion.findFirst({
            where: { documentId },
            orderBy: { version: 'desc' },
            select: { version: true },
        });

        const nextVersion = (lastVersion?.version ?? 0) + 1;
        const restoredAuthor = versionRecord.author.nickname || versionRecord.author.username;
        const restoredAt = new Intl.DateTimeFormat('zh-CN', {
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(versionRecord.createdAt);

        const snapshot = await this._prisma.documentVersion.create({
            data: {
                documentId,
                version: nextVersion,
                type: VersionType.RESTORE,
                content: versionRecord.content,
                changeLog: `恢复自 ${restoredAuthor} 于 ${restoredAt} 的版本`,
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
     * 将 Yjs 二进制状态转为 Markdown 文本（用于 diff）
     * Tiptap Collaboration 扩展默认使用 'prosemirror' 作为 XmlFragment 名称
     */
    private _yjsStateToMarkdown(state: Uint8Array | null): string {
        if (!state || state.length === 0) return '';

        try {
            const doc = new Y.Doc();
            Y.applyUpdate(doc, state);
            const fragment = doc.getXmlFragment('prosemirror');
            const lines = this._xmlToMarkdownLines(fragment);
            doc.destroy();
            return lines.join('\n');
        } catch {
            return '';
        }
    }

    /**
     * 递归将 Yjs XmlFragment/XmlElement 转换为 Markdown 行数组
     */
    private _xmlToMarkdownLines(node: Y.XmlFragment | Y.XmlElement): string[] {
        const lines: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (node as any).forEach((child: Y.XmlElement | Y.XmlText) => {
            if (!(child instanceof Y.XmlElement)) return;

            const name = child.nodeName;

            if (name === 'heading') {
                const level = Number(child.getAttribute('level') ?? 1);
                const prefix = '#'.repeat(Math.min(level, 6)) + ' ';
                lines.push(prefix + this._xmlToText(child));
            } else if (name === 'paragraph') {
                lines.push(this._xmlToText(child));
            } else if (name === 'bulletList') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (child as any).forEach((item: Y.XmlElement | Y.XmlText) => {
                    if (item instanceof Y.XmlElement && item.nodeName === 'listItem') {
                        lines.push('- ' + this._xmlToText(item));
                    }
                });
            } else if (name === 'orderedList') {
                let idx = 1;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (child as any).forEach((item: Y.XmlElement | Y.XmlText) => {
                    if (item instanceof Y.XmlElement && item.nodeName === 'listItem') {
                        lines.push(`${idx}. ` + this._xmlToText(item));
                        idx++;
                    }
                });
            } else if (name === 'codeBlock') {
                const lang = (child.getAttribute('language') as string) ?? '';
                lines.push('```' + lang, this._xmlToText(child), '```');
            } else if (name === 'blockquote') {
                lines.push('> ' + this._xmlToText(child));
            } else if (name === 'horizontalRule') {
                lines.push('---');
            } else {
                lines.push(...this._xmlToMarkdownLines(child));
            }
        });
        return lines;
    }

    /**
     * 从 XmlElement 中递归提取纯文本内容
     */
    private _xmlToText(element: Y.XmlElement | Y.XmlFragment): string {
        const parts: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (element as any).forEach((child: Y.XmlElement | Y.XmlText) => {
            if (child instanceof Y.XmlText) {
                parts.push(child.toString());
            } else if (child instanceof Y.XmlElement) {
                parts.push(child.nodeName === 'hardBreak' ? '\n' : this._xmlToText(child));
            }
        });
        return parts.join('');
    }

    /**
     * 格式化版本记录为前端类型
     */
    private _formatVersionItem(version: {
        id: string;
        documentId: string;
        version: number;
        type: VersionType;
        changeLog: string | null;
        label: string | null;
        createdBy: string;
        createdAt: Date;
        author: { id: string; username: string; nickname: string | null };
    }) {
        return {
            id: version.id,
            documentId: version.documentId,
            version: version.version,
            type: version.type,
            changeLog: version.changeLog,
            label: version.label,
            createdBy: version.createdBy,
            createdAt: version.createdAt.toISOString(),
            author: version.author,
        };
    }

    /**
     * 更新版本标签
     */
    async updateLabel(documentId: string, version: number, userId: string, label?: string) {
        await this._requireWriteAccess(documentId, userId);

        const versionRecord = await this._prisma.documentVersion.findUnique({
            where: { documentId_version: { documentId, version } },
        });

        if (!versionRecord) {
            throw new NotFoundException(`版本 ${version} 不存在`);
        }

        const updated = await this._prisma.documentVersion.update({
            where: { id: versionRecord.id },
            data: { label: label ?? null },
            include: {
                author: { select: { id: true, username: true, nickname: true } },
            },
        });

        return this._formatVersionItem(updated);
    }
}
