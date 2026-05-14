import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { CollaboratorRole, DocumentStatus } from '@prisma/client';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

// 角色层级：数值越高权限越大
const ROLE_HIERARCHY: Record<CollaboratorRole, number> = {
    OWNER: 100,
    ADMIN: 75,
    EDITOR: 50,
    VIEWER: 25,
};

// 权限到最低角色的映射
const PERMISSION_MIN_ROLE: Record<string, CollaboratorRole> = {
    'document:read': CollaboratorRole.VIEWER,
    'document:update': CollaboratorRole.EDITOR,
    'document:share': CollaboratorRole.ADMIN,
    'document:manageUsers': CollaboratorRole.ADMIN,
    'document:manageVersions': CollaboratorRole.ADMIN,
    'document:delete': CollaboratorRole.OWNER,
    'document:transferOwner': CollaboratorRole.OWNER,
    'document:togglePublic': CollaboratorRole.OWNER,
};

@Injectable()
export class DocumentPermissionGuard implements CanActivate {
    constructor(
        private readonly _reflector: Reflector,
        private readonly _prisma: PrismaService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission = this._reflector.get<string>(
            PERMISSION_KEY,
            context.getHandler()
        );
        if (!requiredPermission) return true;

        const request = context.switchToHttp().getRequest();
        const userId = request.user?.userId;
        const documentId = request.params?.id || request.params?.documentId;

        if (!userId || !documentId) {
            throw new ForbiddenException('无权执行此操作');
        }

        const role = await this._resolveRole(documentId, userId);
        if (!role) {
            throw new NotFoundException('文档不存在或无权访问');
        }

        const minRole = PERMISSION_MIN_ROLE[requiredPermission];
        if (!minRole || ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) {
            throw new ForbiddenException('无权执行此操作');
        }

        return true;
    }

    private async _resolveRole(
        documentId: string,
        userId: string
    ): Promise<CollaboratorRole | null> {
        const document = await this._prisma.document.findUnique({
            where: { id: documentId },
            select: { authorId: true, isPublic: true, status: true },
        });

        if (!document || document.status === DocumentStatus.DELETED) {
            return null;
        }

        if (document.authorId === userId) {
            return CollaboratorRole.OWNER;
        }

        const collaborator = await this._prisma.documentCollaborator.findUnique({
            where: {
                documentId_userId: { documentId, userId },
            },
            select: { role: true },
        });

        if (collaborator) return collaborator.role;

        // 公开文档至少有 VIEWER 权限
        if (document.isPublic) return CollaboratorRole.VIEWER;

        return null;
    }
}
