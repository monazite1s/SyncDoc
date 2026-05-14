import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ShareService } from './share.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ThrottleGuard } from '../../common/guards/throttle.guard';
import { Throttle } from '../../common/decorators/throttle.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { Request } from 'express';
import type { RequestUser } from '@collab/types';

interface AuthRequest extends Request {
    user: RequestUser;
}

@Controller('documents')
export class ShareController {
    constructor(private readonly _shareService: ShareService) {}

    @Post(':id/share-links')
    @UseGuards(JwtAuthGuard)
    async createShareLink(
        @Param('id') id: string,
        @Body() dto: CreateShareLinkDto,
        @Req() req: AuthRequest
    ) {
        return this._shareService.createShareLink(id, req.user.userId, dto);
    }

    @Get(':id/share-links')
    @UseGuards(JwtAuthGuard)
    async listShareLinks(@Param('id') id: string, @Req() req: AuthRequest) {
        return this._shareService.listShareLinks(id, req.user.userId);
    }

    @Delete(':id/share-links/:linkId')
    @UseGuards(JwtAuthGuard)
    async revokeShareLink(
        @Param('id') id: string,
        @Param('linkId') linkId: string,
        @Req() req: AuthRequest
    ) {
        return this._shareService.revokeShareLink(id, linkId, req.user.userId);
    }
}

@Controller('share')
export class ShareAccessController {
    constructor(private readonly _shareService: ShareService) {}

    @Post(':token')
    @Public()
    @UseGuards(ThrottleGuard)
    @Throttle(10, 60)
    async accessByToken(@Param('token') token: string, @Body() body?: { password?: string }) {
        return this._shareService.accessByToken(token, body?.password);
    }
}
