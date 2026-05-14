import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Document, DocumentStatus, CollaboratorRole, Prisma } from '@prisma/client';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { AddCollaboratorDto } from './dto/add-collaborator.dto';
import { CollaborationHocuspocus } from '../collaboration/collaboration.hocuspocus';
import { ActivityLogService } from '../../common/services/activity-log.service';

@Injectable()
export class DocumentsService {
    constructor(
        private _prisma: PrismaService,
        private _hocuspocus: CollaborationHocuspocus,
        private _activityLog: ActivityLogService
    ) {}

    // 排除 content 字段的 select 常量
    private readonly _DOCUMENT_PUBLIC_SELECT: Prisma.DocumentSelect = {
        id: true,
        title: true,
        description: true,
        parentId: true,
        position: true,
        isPublic: true,
        status: true,
        authorId: true,
        createdAt: true,
        updatedAt: true,
        author: {
            select: { id: true, username: true, nickname: true, avatar: true },
        },
        _count: {
            select: { collaborators: true },
        },
    };

    private _toDocumentListItem(
        document: {
            id: string;
            title: string;
            description: string | null;
            parentId: string | null;
            position: number;
            isPublic: boolean;
            status: DocumentStatus;
            authorId: string;
            createdAt: Date;
            updatedAt: Date;
            author: {
                id: string;
                username: string;
                nickname: string | null;
                avatar: string | null;
            };
            _count: { collaborators: number };
        },
        userRole: CollaboratorRole | null
    ) {
        return {
            id: document.id,
            title: document.title,
            description: document.description,
            parentId: document.parentId,
            position: document.position,
            isPublic: document.isPublic,
            status: document.status,
            authorId: document.authorId,
            createdAt: document.createdAt.toISOString(),
            updatedAt: document.updatedAt.toISOString(),
            author: document.author,
            userRole,
            collaboratorCount: document._count.collaborators,
        };
    }

    /**
     * 获取用户在文档中的角色
     */
    private async _getUserRole(
        documentId: string,
        userId: string
    ): Promise<CollaboratorRole | null> {
        const document = await this._prisma.document.findUnique({
            where: { id: documentId },
            select: { authorId: true },
        });

        if (!document) return null;

        // 作者为 OWNER
        if (document.authorId === userId) {
            return CollaboratorRole.OWNER;
        }

        // 检查是否为协作者
        const collaborator = await this._prisma.documentCollaborator.findUnique({
            where: {
                documentId_userId: { documentId, userId },
            },
        });

        return collaborator?.role ?? null;
    }

    /**
     * 检查文档是否存在且有权限访问
     */
    private async _requireAccess(documentId: string, userId: string): Promise<Document> {
        const document = await this._prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document) {
            throw new NotFoundException('文档不存在');
        }

        if (document.status === DocumentStatus.DELETED) {
            throw new NotFoundException('文档不存在');
        }

        const userRole = await this._getUserRole(documentId, userId);
        if (!userRole && !document.isPublic) {
            throw new ForbiddenException('无权访问此文档');
        }

        return document;
    }

    /**
     * 检查写权限 (OWNER、ADMIN 或 EDITOR)
     */
    private async _requireWriteAccess(documentId: string, userId: string): Promise<Document> {
        const document = await this._requireAccess(documentId, userId);
        const userRole = await this._getUserRole(documentId, userId);

        if (
            userRole !== CollaboratorRole.OWNER &&
            userRole !== CollaboratorRole.ADMIN &&
            userRole !== CollaboratorRole.EDITOR
        ) {
            throw new ForbiddenException('无权编辑此文档');
        }

        return document;
    }

    /**
     * 检查管理权限 (OWNER 或 ADMIN)
     */
    private async _requireAdminAccess(documentId: string, userId: string): Promise<Document> {
        const document = await this._requireAccess(documentId, userId);
        const userRole = await this._getUserRole(documentId, userId);

        if (userRole !== CollaboratorRole.OWNER && userRole !== CollaboratorRole.ADMIN) {
            throw new ForbiddenException('需要管理员权限执行此操作');
        }

        return document;
    }

    /**
     * 检查所有者权限 (仅 OWNER)
     */
    private async _requireOwnerAccess(documentId: string, userId: string): Promise<Document> {
        const document = await this._requireAccess(documentId, userId);
        const userRole = await this._getUserRole(documentId, userId);

        if (userRole !== CollaboratorRole.OWNER) {
            throw new ForbiddenException('仅文档所有者可执行此操作');
        }

        return document;
    }

    /**
     * 获取用户可访问的所有文档（支持搜索）
     */
    async findAll(userId: string, options?: { search?: string }) {
        const searchFilter = options?.search?.trim()
            ? { title: { contains: options.search.trim(), mode: 'insensitive' as const } }
            : {};

        const documents = await this._prisma.document.findMany({
            where: {
                status: { not: DocumentStatus.DELETED },
                ...searchFilter,
                OR: [{ authorId: userId }, { collaborators: { some: { userId } } }],
            },
            select: {
                ...this._DOCUMENT_PUBLIC_SELECT,
                collaborators: {
                    where: { userId },
                    select: { role: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        // 转换为前端需要的格式
        return documents.map((doc) =>
            this._toDocumentListItem(
                doc,
                doc.authorId === userId
                    ? CollaboratorRole.OWNER
                    : (doc.collaborators[0]?.role ?? null)
            )
        );
    }

    /**
     * 获取单个文档详情
     */
    async findOne(documentId: string, userId: string) {
        await this._requireAccess(documentId, userId);

        const [document, latestVersion] = await Promise.all([
            this._prisma.document.findUnique({
                where: { id: documentId },
                select: {
                    ...this._DOCUMENT_PUBLIC_SELECT,
                    pendingOwnerId: true,
                    collaborators: {
                        select: {
                            userId: true,
                            role: true,
                            user: {
                                select: { id: true, username: true, nickname: true, avatar: true },
                            },
                        },
                    },
                },
            }),
            this._prisma.documentVersion.findFirst({
                where: { documentId },
                orderBy: { version: 'desc' },
                select: { version: true, id: true },
            }),
        ]);

        if (!document) {
            throw new NotFoundException('文档不存在');
        }

        const userRole = await this._getUserRole(documentId, userId);

        return {
            ...this._toDocumentListItem(document, userRole),
            pendingOwnerId: document.pendingOwnerId,
            latestVersion: latestVersion?.version,
            latestVersionHash: latestVersion?.id,
            collaborators: document.collaborators.map((c) => ({
                userId: c.userId,
                role: c.role,
                user: c.user,
            })),
        };
    }

    /**
     * 获取文档二进制内容（Base64）
     */
    async getContent(documentId: string, userId: string) {
        await this._requireAccess(documentId, userId);
        const document = await this._prisma.document.findUnique({
            where: { id: documentId },
            select: { id: true, content: true, updatedAt: true },
        });

        if (!document) {
            throw new NotFoundException('文档不存在');
        }

        return {
            documentId: document.id,
            content: document.content ? Buffer.from(document.content).toString('base64') : null,
            updatedAt: document.updatedAt.toISOString(),
        };
    }

    /**
     * 获取文档查看页数据（包含 Base64 内容）
     */
    async getView(documentId: string, userId: string) {
        const detail = await this.findOne(documentId, userId);
        const content = await this.getContent(documentId, userId);
        return {
            ...detail,
            contentBase64: content.content ?? undefined,
        };
    }

    /**
     * 创建文档
     */
    async create(userId: string, dto: CreateDocumentDto) {
        if (dto.parentId) {
            await this._requireWriteAccess(dto.parentId, userId);
        }

        const siblingPosition = await this._prisma.document.aggregate({
            where: {
                parentId: dto.parentId ?? null,
                status: { not: DocumentStatus.DELETED },
            },
            _max: { position: true },
        });
        const nextPosition = (siblingPosition._max.position ?? -1) + 1;

        const document = await this._prisma.document.create({
            data: {
                title: dto.title,
                description: dto.description,
                parentId: dto.parentId ?? null,
                position: nextPosition,
                authorId: userId,
                status: DocumentStatus.DRAFT,
                isPublic: false,
            },
            select: this._DOCUMENT_PUBLIC_SELECT,
        });

        return this._toDocumentListItem(document, CollaboratorRole.OWNER);
    }

    /**
     * 更新文档
     */
    async update(documentId: string, userId: string, dto: UpdateDocumentDto) {
        // isPublic 和 status 变更需要 OWNER 权限
        if (dto.isPublic !== undefined || dto.status !== undefined) {
            await this._requireOwnerAccess(documentId, userId);
        } else {
            await this._requireWriteAccess(documentId, userId);
        }

        // DTO 已通过 IsEnum 排除了 DELETED 状态，无需额外检查
        const document = await this._prisma.document.update({
            where: { id: documentId },
            data: dto,
            select: this._DOCUMENT_PUBLIC_SELECT,
        });

        const userRole = await this._getUserRole(documentId, userId);

        return this._toDocumentListItem(document, userRole);
    }

    /**
     * 软删除文档 (仅 OWNER)
     */
    async remove(documentId: string, userId: string) {
        await this._requireOwnerAccess(documentId, userId);

        await this._prisma.document.update({
            where: { id: documentId },
            data: { status: DocumentStatus.DELETED },
        });

        await this._activityLog.log(documentId, userId, 'DOCUMENT_DELETED');

        return { success: true };
    }

    /**
     * 移动文档（修改 parentId 和 position）
     */
    async moveDocument(
        documentId: string,
        userId: string,
        dto: { parentId?: string | null; position?: number }
    ) {
        const doc = await this._requireAdminAccess(documentId, userId);

        // 无实际变更则提前返回
        if (dto.parentId === undefined && dto.position === undefined) {
            const userRole = await this._getUserRole(documentId, userId);
            const currentDoc = await this._prisma.document.findUnique({
                where: { id: documentId },
                select: this._DOCUMENT_PUBLIC_SELECT,
            });
            return this._toDocumentListItem(currentDoc!, userRole);
        }

        const newParentId = dto.parentId === null ? null : (dto.parentId ?? doc.parentId);

        // 防循环引用：不能移动到自身或自身后代下
        if (newParentId) {
            if (newParentId === documentId) {
                throw new BadRequestException('不能将文档移动到自身下');
            }
            const isDescendant = await this._isDescendant(documentId, newParentId);
            if (isDescendant) {
                throw new BadRequestException('不能将文档移动到其子文档下');
            }
            // 检查目标父文档存在、未删除且未归档，并验证用户权限
            const parent = await this._prisma.document.findFirst({
                where: {
                    id: newParentId,
                    status: { in: [DocumentStatus.DRAFT, DocumentStatus.PUBLISHED] },
                },
            });
            if (!parent) {
                throw new NotFoundException('目标父文档不存在或已归档');
            }
            await this._requireWriteAccess(newParentId, userId);
        }

        // 获取目标父级下的现有兄弟
        const siblings = await this._prisma.document.findMany({
            where: {
                parentId: newParentId,
                status: { not: DocumentStatus.DELETED },
                id: { not: documentId },
            },
            orderBy: { position: 'asc' },
            select: { id: true },
        });

        // 计算 position
        const targetPosition =
            dto.position !== undefined ? Math.min(dto.position, siblings.length) : siblings.length;

        // 构建 position 重排
        const updatedSiblings = [...siblings];
        updatedSiblings.splice(targetPosition, 0, { id: documentId });

        await this._prisma.$transaction(
            updatedSiblings.map((sibling, index) =>
                this._prisma.document.update({
                    where: { id: sibling.id },
                    data: {
                        position: index,
                        ...(sibling.id === documentId ? { parentId: newParentId } : {}),
                    },
                })
            )
        );

        await this._activityLog.log(documentId, userId, 'DOCUMENT_MOVED', {
            parentId: newParentId,
            position: targetPosition,
        });

        const updatedDoc = await this._prisma.document.findFirst({
            where: { id: documentId },
            select: this._DOCUMENT_PUBLIC_SELECT,
        });
        const userRole = await this._getUserRole(documentId, userId);
        return this._toDocumentListItem(updatedDoc!, userRole);
    }

    /**
     * 检查 targetId 是否是 documentId 的后代
     */
    private async _isDescendant(ancestorId: string, checkId: string): Promise<boolean> {
        let current: string | null = checkId;
        const visited = new Set<string>();
        while (current) {
            if (current === ancestorId) return true;
            if (visited.has(current)) return false;
            visited.add(current);
            const found: { parentId: string | null } | null =
                await this._prisma.document.findUnique({
                    where: { id: current },
                    select: { parentId: true },
                });
            current = found?.parentId ?? null;
        }
        return false;
    }

    /**
     * 添加协作者 (OWNER 或 ADMIN)
     */
    async addCollaborator(documentId: string, operatorId: string, dto: AddCollaboratorDto) {
        await this._requireAdminAccess(documentId, operatorId);

        // 检查是否已经是协作者
        const existing = await this._prisma.documentCollaborator.findUnique({
            where: {
                documentId_userId: { documentId, userId: dto.userId },
            },
        });

        if (existing) {
            throw new BadRequestException('该用户已是协作者');
        }

        // 检查是否是作者
        const document = await this._prisma.document.findUnique({
            where: { id: documentId },
            select: { authorId: true },
        });

        if (document?.authorId === dto.userId) {
            throw new BadRequestException('文档作者不能添加为协作者');
        }

        await this._prisma.documentCollaborator.create({
            data: {
                documentId,
                userId: dto.userId,
                role: dto.role,
            },
        });

        // 实时通知新协作者
        await this._hocuspocus.handlePermissionChange(documentId, dto.userId, dto.role);

        // 审计日志
        await this._activityLog.log(documentId, operatorId, 'COLLABORATOR_ADDED', {
            targetUserId: dto.userId,
            role: dto.role,
        });

        return { success: true };
    }

    /**
     * 移除协作者 (OWNER 或 ADMIN)
     */
    async removeCollaborator(documentId: string, collaboratorUserId: string, operatorId: string) {
        await this._requireAdminAccess(documentId, operatorId);

        await this._prisma.documentCollaborator.delete({
            where: {
                documentId_userId: { documentId, userId: collaboratorUserId },
            },
        });

        // 实时断开被移除用户的连接
        await this._hocuspocus.handlePermissionChange(documentId, collaboratorUserId, null);

        // 审计日志
        await this._activityLog.log(documentId, operatorId, 'COLLABORATOR_REMOVED', {
            targetUserId: collaboratorUserId,
        });

        return { success: true };
    }

    /**
     * 更新协作者角色
     */
    async updateCollaboratorRole(
        documentId: string,
        targetUserId: string,
        role: 'ADMIN' | 'EDITOR' | 'VIEWER',
        userId: string
    ) {
        await this._requireOwnerAccess(documentId, userId);

        const collaborator = await this._prisma.documentCollaborator.findUnique({
            where: { documentId_userId: { documentId, userId: targetUserId } },
        });

        if (!collaborator) {
            throw new NotFoundException('该用户不是此文档的协作者');
        }

        const updated = await this._prisma.documentCollaborator.update({
            where: { id: collaborator.id },
            data: { role },
        });

        // 实时通知角色变更
        await this._hocuspocus.handlePermissionChange(documentId, targetUserId, role);

        // 审计日志
        await this._activityLog.log(documentId, userId, 'COLLABORATOR_ROLE_CHANGED', {
            targetUserId,
            newRole: role,
            previousRole: collaborator.role,
        });

        return { success: true, role: updated.role };
    }

    // ==================== 所有权转让 ====================

    /**
     * 发起所有权转让（仅 OWNER）
     */
    async requestTransferOwnership(
        documentId: string,
        currentOwnerId: string,
        targetUserId: string
    ) {
        await this._requireOwnerAccess(documentId, currentOwnerId);

        // 验证目标用户是协作者
        const collaborator = await this._prisma.documentCollaborator.findUnique({
            where: { documentId_userId: { documentId, userId: targetUserId } },
        });
        if (!collaborator) {
            throw new BadRequestException('只能将所有权转让给现有协作者');
        }

        await this._prisma.document.update({
            where: { id: documentId },
            data: {
                pendingOwnerId: targetUserId,
                ownershipTransferRequestedAt: new Date(),
            },
        });

        await this._activityLog.log(documentId, currentOwnerId, 'OWNERSHIP_TRANSFERRED', {
            targetUserId,
            status: 'requested',
        });

        return { success: true };
    }

    /**
     * 接受所有权转让（目标用户确认，48 小时过期）
     */
    async acceptTransferOwnership(documentId: string, newOwnerId: string) {
        const document = await this._prisma.document.findUnique({
            where: { id: documentId },
            select: { authorId: true, pendingOwnerId: true, ownershipTransferRequestedAt: true },
        });

        if (!document || document.pendingOwnerId !== newOwnerId) {
            throw new ForbiddenException('无权接受此转让');
        }

        // 48 小时过期检查
        const TRANSFER_EXPIRY_MS = 48 * 60 * 60 * 1000;
        if (
            document.ownershipTransferRequestedAt &&
            Date.now() - document.ownershipTransferRequestedAt.getTime() > TRANSFER_EXPIRY_MS
        ) {
            await this.cancelTransferOwnership(documentId, document.authorId);
            throw new BadRequestException('所有权转让请求已过期');
        }

        // 事务：更新 authorId + 原 owner 降为 ADMIN + 清除 pendingOwnerId
        await this._prisma.$transaction([
            // 原 owner 降为 ADMIN 协作者
            this._prisma.documentCollaborator.upsert({
                where: { documentId_userId: { documentId, userId: document.authorId } },
                create: { documentId, userId: document.authorId, role: CollaboratorRole.ADMIN },
                update: { role: CollaboratorRole.ADMIN },
            }),
            // 更新文档所有者
            this._prisma.document.update({
                where: { id: documentId },
                data: {
                    authorId: newOwnerId,
                    pendingOwnerId: null,
                    ownershipTransferRequestedAt: null,
                },
            }),
            // 删除新 owner 的协作者记录（因为现在是 authorId）
            this._prisma.documentCollaborator.deleteMany({
                where: { documentId, userId: newOwnerId },
            }),
        ]);

        await this._activityLog.log(documentId, newOwnerId, 'OWNERSHIP_TRANSFERRED', {
            previousOwnerId: document.authorId,
            status: 'accepted',
        });

        return { success: true };
    }

    /**
     * 取消所有权转让（仅 OWNER）
     */
    async cancelTransferOwnership(documentId: string, currentOwnerId: string) {
        await this._requireOwnerAccess(documentId, currentOwnerId);

        const doc = await this._prisma.document.findUnique({
            where: { id: documentId },
            select: { pendingOwnerId: true },
        });

        await this._prisma.document.update({
            where: { id: documentId },
            data: { pendingOwnerId: null, ownershipTransferRequestedAt: null },
        });

        if (doc?.pendingOwnerId) {
            await this._activityLog.log(documentId, currentOwnerId, 'OWNERSHIP_TRANSFERRED', {
                targetUserId: doc.pendingOwnerId,
                status: 'cancelled',
            });
        }

        return { success: true };
    }

    /**
     * 获取活动日志（ADMIN+）
     */
    async getActivityLogs(documentId: string, userId: string, page: number, limit: number) {
        await this._requireAdminAccess(documentId, userId);
        return this._activityLog.getLogs(documentId, page, limit);
    }
}
