import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { VersionsService } from './versions.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { VersionDiffDto } from './dto/version-diff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import type { RequestUser } from '@collab/types';

interface AuthRequest extends Request {
    user: RequestUser;
}

@Controller('documents/:documentId/versions')
@UseGuards(JwtAuthGuard)
export class VersionsController {
    constructor(private readonly _versionsService: VersionsService) {}

    // 版本列表（分页）
    @Get()
    async listVersions(
        @Param('documentId') documentId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Req() req?: AuthRequest
    ) {
        return this._versionsService.listVersions(
            documentId,
            req!.user.userId,
            parseInt(page ?? '1'),
            parseInt(limit ?? '20')
        );
    }

    // 创建快照
    @Post()
    async createSnapshot(
        @Param('documentId') documentId: string,
        @Body() dto: CreateVersionDto,
        @Req() req: AuthRequest
    ) {
        return this._versionsService.createSnapshot(documentId, req.user.userId, dto);
    }

    // 获取单个版本内容
    @Get(':version')
    async getVersion(
        @Param('documentId') documentId: string,
        @Param('version') version: string,
        @Req() req: AuthRequest
    ) {
        return this._versionsService.getVersionContent(
            documentId,
            parseInt(version),
            req.user.userId
        );
    }

    // 恢复版本
    @Post(':version/restore')
    async restoreVersion(
        @Param('documentId') documentId: string,
        @Param('version') version: string,
        @Req() req: AuthRequest
    ) {
        return this._versionsService.restoreVersion(documentId, parseInt(version), req.user.userId);
    }

    // 版本 Diff
    @Post('diff')
    async diffVersions(
        @Param('documentId') documentId: string,
        @Body() dto: VersionDiffDto,
        @Req() req: AuthRequest
    ) {
        return this._versionsService.diffVersions(
            documentId,
            dto.fromVersion,
            dto.toVersion,
            req.user.userId
        );
    }
}
