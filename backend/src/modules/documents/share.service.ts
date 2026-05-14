import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CollaboratorRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { ActivityLogService } from '../../common/services/activity-log.service';

@Injectable()
export class ShareService {
    constructor(
        private readonly _prisma: PrismaService,
        private readonly _activityLog: ActivityLogService
    ) {}

    private async _requireAdminAccess(documentId: string, userId: string): Promise<void> {
        const document = await this._prisma.document.findUnique({
            where: { id: documentId },
            select: { authorId: true },
        });
        if (!document) throw new NotFoundException('文档不存在');
        if (document.authorId === userId) return;

        const collaborator = await this._prisma.documentCollaborator.findUnique({
            where: { documentId_userId: { documentId, userId } },
        });
        if (
            collaborator?.role !== CollaboratorRole.ADMIN &&
            collaborator?.role !== CollaboratorRole.OWNER
        ) {
            throw new ForbiddenException('需要管理员权限管理分享链接');
        }
    }

    async createShareLink(documentId: string, userId: string, dto: CreateShareLinkDto) {
        await this._requireAdminAccess(documentId, userId);

        const hashedPassword = dto.password ? await bcrypt.hash(dto.password, 10) : null;

        const shareLink = await this._prisma.documentShareLink.create({
            data: {
                documentId,
                role: dto.role,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                password: hashedPassword,
                createdById: userId,
            },
        });

        await this._activityLog.log(documentId, userId, 'SHARE_LINK_CREATED', {
            linkId: shareLink.id,
            role: dto.role,
        });

        return {
            id: shareLink.id,
            token: shareLink.token,
            role: shareLink.role,
            expiresAt: shareLink.expiresAt?.toISOString() ?? null,
            hasPassword: !!hashedPassword,
            createdAt: shareLink.createdAt.toISOString(),
        };
    }

    async listShareLinks(documentId: string, userId: string) {
        await this._requireAdminAccess(documentId, userId);

        const links = await this._prisma.documentShareLink.findMany({
            where: { documentId },
            select: {
                id: true,
                token: true,
                role: true,
                expiresAt: true,
                password: true,
                createdAt: true,
                createdBy: {
                    select: { id: true, username: true, nickname: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return links.map((link) => ({
            id: link.id,
            token: link.token,
            role: link.role,
            expiresAt: link.expiresAt?.toISOString() ?? null,
            hasPassword: !!link.password,
            createdAt: link.createdAt.toISOString(),
            createdBy: link.createdBy,
        }));
    }

    async revokeShareLink(documentId: string, linkId: string, userId: string) {
        await this._requireAdminAccess(documentId, userId);

        const link = await this._prisma.documentShareLink.findUnique({
            where: { id: linkId },
        });
        if (!link || link.documentId !== documentId) {
            throw new NotFoundException('分享链接不存在');
        }

        await this._prisma.documentShareLink.delete({ where: { id: linkId } });

        await this._activityLog.log(documentId, userId, 'SHARE_LINK_REVOKED', { linkId });

        return { success: true };
    }

    async accessByToken(token: string, password?: string) {
        const link = await this._prisma.documentShareLink.findUnique({
            where: { token },
            include: {
                document: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        status: true,
                        content: true,
                        author: {
                            select: { id: true, username: true, nickname: true, avatar: true },
                        },
                    },
                },
            },
        });

        if (!link) {
            throw new NotFoundException('分享链接不存在或已失效');
        }

        if (link.expiresAt && link.expiresAt < new Date()) {
            await this._prisma.documentShareLink.delete({ where: { id: link.id } });
            throw new NotFoundException('分享链接已过期');
        }

        if (link.password) {
            if (!password) {
                return { requiresPassword: true, documentTitle: link.document.title };
            }
            const valid = await bcrypt.compare(password, link.password);
            if (!valid) {
                throw new ForbiddenException('密码错误');
            }
        }

        if (link.document.status === 'DELETED') {
            throw new NotFoundException('文档不存在');
        }

        return {
            requiresPassword: false,
            document: {
                id: link.document.id,
                title: link.document.title,
                description: link.document.description,
                author: link.document.author,
                role: link.role,
                contentBase64: link.document.content
                    ? Buffer.from(link.document.content).toString('base64')
                    : null,
            },
        };
    }
}
