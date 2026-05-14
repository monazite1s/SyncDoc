import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityAction, Prisma } from '@prisma/client';

@Injectable()
export class ActivityLogService {
    private readonly _logger = new Logger(ActivityLogService.name);

    constructor(private readonly _prisma: PrismaService) {}

    /**
     * 异步记录活动日志（不阻塞主请求）
     */
    async log(
        documentId: string,
        userId: string | null,
        action: ActivityAction,
        metadata?: Prisma.InputJsonValue
    ): Promise<void> {
        try {
            await this._prisma.documentActivityLog.create({
                data: { documentId, userId, action, metadata: metadata ?? undefined },
            });
        } catch (error) {
            this._logger.error(`记录活动日志失败: ${(error as Error).message}`);
        }
    }

    /**
     * 查询文档的活动日志（分页）
     */
    async getLogs(documentId: string, page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            this._prisma.documentActivityLog.findMany({
                where: { documentId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: {
                        select: { id: true, username: true, nickname: true, avatar: true },
                    },
                },
            }),
            this._prisma.documentActivityLog.count({ where: { documentId } }),
        ]);

        return {
            items: logs.map((log) => ({
                id: log.id,
                action: log.action,
                metadata: log.metadata,
                createdAt: log.createdAt.toISOString(),
                user: log.user,
            })),
            total,
            page,
            limit,
        };
    }
}
