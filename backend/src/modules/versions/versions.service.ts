import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VersionsService {
    constructor(private _prisma: PrismaService) {}

    // TODO: Implement version operations
    // - Create version snapshots
    // - List versions
    // - Restore to specific version
}
