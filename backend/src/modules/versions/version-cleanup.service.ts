import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 自动版本裁剪策略（仅针对 AUTO 类型，MANUAL/RESTORE 永不裁剪）：
 * - 最近 7 天：保留全部
 * - 7-30 天：每天保留最后一个
 * - 30 天以上：每周保留最后一个
 * - 单文档 AUTO 版本上限 200 个，超出时删除最旧的
 */
@Injectable()
export class VersionCleanupService {
    private readonly _logger = new Logger(VersionCleanupService.name);
    private static readonly MAX_AUTO_VERSIONS = 200;

    constructor(private readonly _prisma: PrismaService) {}

    /**
     * 每天凌晨 3:00 执行裁剪
     */
    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async cleanupAutoVersions(): Promise<void> {
        this._logger.log('开始执行自动版本裁剪任务...');

        try {
            const documents = await this._prisma.document.findMany({
                select: { id: true },
                where: { status: { not: 'DELETED' } },
            });

            let totalDeleted = 0;
            for (const doc of documents) {
                const deleted = await this._cleanupDocument(doc.id);
                totalDeleted += deleted;
            }

            this._logger.log(`版本裁剪完成，共删除 ${totalDeleted} 个自动版本`);
        } catch (error) {
            this._logger.error(`版本裁剪任务失败: ${(error as Error).message}`);
        }
    }

    private async _cleanupDocument(documentId: string): Promise<number> {
        const autoVersions = await this._prisma.documentVersion.findMany({
            where: { documentId, type: 'AUTO' },
            orderBy: { createdAt: 'desc' },
            select: { id: true, createdAt: true },
        });

        if (autoVersions.length === 0) return 0;

        const toDelete = new Set<string>();
        const now = Date.now();

        const DAY_7 = 7 * 24 * 60 * 60 * 1000;
        const DAY_30 = 30 * 24 * 60 * 60 * 1000;

        // 7-30 天：每天保留最后一个（按天分组，保留最新）
        const by7to30: Map<string, string> = new Map(); // "YYYY-MM-DD" → id
        // 30 天以上：每周保留最后一个（按周分组）
        const byOld: Map<string, string> = new Map(); // "YYYY-WW" → id

        for (const v of autoVersions) {
            const age = now - v.createdAt.getTime();
            if (age <= DAY_7) {
                // 最近 7 天全部保留
                continue;
            }

            if (age <= DAY_30) {
                const dayKey = v.createdAt.toISOString().slice(0, 10);
                if (by7to30.has(dayKey)) {
                    // 已有更新的，标记当前（更旧的）为删除
                    toDelete.add(v.id);
                } else {
                    by7to30.set(dayKey, v.id);
                }
            } else {
                const weekKey = this._getYearWeek(v.createdAt);
                if (byOld.has(weekKey)) {
                    toDelete.add(v.id);
                } else {
                    byOld.set(weekKey, v.id);
                }
            }
        }

        // 总量上限：超出 MAX_AUTO_VERSIONS 时删除最旧的（不在 toDelete 中的也算）
        const remaining = autoVersions.filter((v) => !toDelete.has(v.id));
        if (remaining.length > VersionCleanupService.MAX_AUTO_VERSIONS) {
            const overflow = remaining.slice(VersionCleanupService.MAX_AUTO_VERSIONS);
            overflow.forEach((v) => toDelete.add(v.id));
        }

        if (toDelete.size === 0) return 0;

        await this._prisma.documentVersion.deleteMany({
            where: { id: { in: Array.from(toDelete) } },
        });

        return toDelete.size;
    }

    private _getYearWeek(date: Date): string {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    }
}
