import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { AddCollaboratorDto } from './dto/add-collaborator.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { MoveDocumentDto } from './dto/move-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import type { RequestUser } from '@collab/types';

interface AuthRequest extends Request {
    user: RequestUser;
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
    constructor(private readonly _documentsService: DocumentsService) {}

    // 获取用户可访问的所有文档（支持搜索）
    @Get()
    async findAll(@Req() req: AuthRequest, @Query('search') search?: string) {
        return this._documentsService.findAll(req.user.userId, { search });
    }

    // 获取单个文档详情
    @Get(':id')
    async findOne(@Param('id') id: string, @Req() req: AuthRequest) {
        return this._documentsService.findOne(id, req.user.userId);
    }

    // 获取文档查看页内容（含 Base64 编码的 Yjs 状态）
    @Get(':id/view')
    async getView(@Param('id') id: string, @Req() req: AuthRequest) {
        return this._documentsService.getView(id, req.user.userId);
    }

    // 获取文档二进制内容（Base64）
    @Get(':id/content')
    async getContent(@Param('id') id: string, @Req() req: AuthRequest) {
        return this._documentsService.getContent(id, req.user.userId);
    }

    // 创建文档
    @Post()
    async create(@Body() dto: CreateDocumentDto, @Req() req: AuthRequest) {
        return this._documentsService.create(req.user.userId, dto);
    }

    // 更新文档
    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @Req() req: AuthRequest) {
        return this._documentsService.update(id, req.user.userId, dto);
    }

    // 移动文档（修改层级和排序）
    @Patch(':id/move')
    async move(@Param('id') id: string, @Body() dto: MoveDocumentDto, @Req() req: AuthRequest) {
        return this._documentsService.moveDocument(id, req.user.userId, dto);
    }

    // 删除文档 (软删除)
    @Delete(':id')
    async remove(@Param('id') id: string, @Req() req: AuthRequest) {
        return this._documentsService.remove(id, req.user.userId);
    }

    // 添加协作者
    @Post(':id/collaborators')
    async addCollaborator(
        @Param('id') id: string,
        @Body() dto: AddCollaboratorDto,
        @Req() req: AuthRequest
    ) {
        return this._documentsService.addCollaborator(id, req.user.userId, dto);
    }

    // 移除协作者
    @Delete(':id/collaborators/:userId')
    async removeCollaborator(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Req() req: AuthRequest
    ) {
        return this._documentsService.removeCollaborator(id, userId, req.user.userId);
    }

    // 更新协作者角色
    @Patch(':id/collaborators/:userId')
    async updateCollaboratorRole(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Body() dto: AddCollaboratorDto,
        @Req() req: AuthRequest
    ) {
        return this._documentsService.updateCollaboratorRole(id, userId, dto.role, req.user.userId);
    }

    // 发起所有权转让
    @Post(':id/transfer-ownership')
    async requestTransferOwnership(
        @Param('id') id: string,
        @Body() dto: TransferOwnershipDto,
        @Req() req: AuthRequest
    ) {
        return this._documentsService.requestTransferOwnership(
            id,
            req.user.userId,
            dto.targetUserId
        );
    }

    // 接受所有权转让
    @Post(':id/accept-ownership')
    async acceptTransferOwnership(@Param('id') id: string, @Req() req: AuthRequest) {
        return this._documentsService.acceptTransferOwnership(id, req.user.userId);
    }

    // 取消所有权转让
    @Delete(':id/transfer-ownership')
    async cancelTransferOwnership(@Param('id') id: string, @Req() req: AuthRequest) {
        return this._documentsService.cancelTransferOwnership(id, req.user.userId);
    }

    // 获取活动日志
    @Get(':id/activity-logs')
    async getActivityLogs(
        @Param('id') id: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
        @Req() req: AuthRequest
    ) {
        return this._documentsService.getActivityLogs(
            id,
            req.user.userId,
            Number(page),
            Number(limit)
        );
    }
}
