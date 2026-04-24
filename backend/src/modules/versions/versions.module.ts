import { Module } from '@nestjs/common';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';
import { VersionCleanupService } from './version-cleanup.service';

@Module({
    controllers: [VersionsController],
    providers: [VersionsService, VersionCleanupService],
    exports: [VersionsService],
})
export class VersionsModule {}
