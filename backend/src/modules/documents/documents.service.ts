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

@Injectable()
export class DocumentsService {
    constructor(private _prisma: PrismaService) {}

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
     * 检查写权限 (OWNER 或 EDITOR)
     */
    private async _requireWriteAccess(documentId: string, userId: string): Promise<Document> {
        const document = await this._requireAccess(documentId, userId);
        const userRole = await this._getUserRole(documentId, userId);

        if (userRole !== CollaboratorRole.OWNER && userRole !== CollaboratorRole.EDITOR) {
            throw new ForbiddenException('无权编辑此文档');
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
     * 移动文档到新的父节点并调整同级排序（预留）
     */
    async moveDocument(
        documentId: string,
        userId: string,
        targetParentId: string | null,
        targetPosition: number
    ) {
        await this._requireWriteAccess(documentId, userId);

        if (targetParentId) {
            if (targetParentId === documentId) {
                throw new BadRequestException('不能将文档移动到自身下');
            }
            await this._requireWriteAccess(targetParentId, userId);
        }

        const siblingMax = await this._prisma.document.aggregate({
            where: {
                parentId: targetParentId,
                status: { not: DocumentStatus.DELETED },
                id: { not: documentId },
            },
            _max: { position: true },
        });
        const maxPosition = siblingMax._max.position ?? -1;
        const safePosition = Math.min(Math.max(targetPosition, 0), maxPosition + 1);

        await this._prisma.document.update({
            where: { id: documentId },
            data: {
                parentId: targetParentId,
                position: safePosition,
            },
        });

        return { success: true };
    }

    /**
     * 更新文档
     */
    async update(documentId: string, userId: string, dto: UpdateDocumentDto) {
        await this._requireWriteAccess(documentId, userId);

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

        return { success: true };
    }

    /**
     * 添加协作者 (OWNER 或 EDITOR)
     */
    async addCollaborator(documentId: string, operatorId: string, dto: AddCollaboratorDto) {
        await this._requireWriteAccess(documentId, operatorId);

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

        return { success: true };
    }

    /**
     * 移除协作者 (OWNER 或 EDITOR)
     */
    async removeCollaborator(documentId: string, collaboratorUserId: string, operatorId: string) {
        await this._requireWriteAccess(documentId, operatorId);

        await this._prisma.documentCollaborator.delete({
            where: {
                documentId_userId: { documentId, userId: collaboratorUserId },
            },
        });

        return { success: true };
    }
}
