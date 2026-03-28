import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CollaborationService {
  private readonly _logger = new Logger(CollaborationService.name);

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
   * 持久化文档的 Yjs 二进制状态
   */
  async storeDocumentState(documentName: string, state: Uint8Array): Promise<void> {
    try {
      await this._prisma.document.update({
        where: { id: documentName },
        data: { content: Buffer.from(state) },
      });
    } catch (error) {
      this._logger.error(`存储文档 ${documentName} 状态失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 记录编辑操作到历史表
   */
  async recordEdit(documentName: string, userId: string, operation: Uint8Array): Promise<void> {
    try {
      // 获取当前文档最大版本号
      const lastEdit = await this._prisma.documentEdit.findFirst({
        where: { documentId: documentName },
        orderBy: { version: 'desc' },
        select: { version: true },
      });

      const nextVersion = (lastEdit?.version ?? 0) + 1;

      await this._prisma.documentEdit.create({
        data: {
          documentId: documentName,
          userId,
          operation: Buffer.from(operation),
          version: nextVersion,
        },
      });
    } catch (error) {
      this._logger.error(`记录文档 ${documentName} 编辑历史失败: ${(error as Error).message}`);
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
   * 检查用户是否有文档的访问权限
   */
  async checkDocumentAccess(documentId: string, userId: string): Promise<boolean> {
    // 文档作者自动有权限
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

    // 检查是否为协作者
    const collaborator = await this._prisma.documentCollaborator.findUnique({
      where: {
        documentId_userId: { documentId, userId },
      },
    });

    return !!collaborator;
  }
}
