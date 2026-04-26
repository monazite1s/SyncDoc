import { Module } from '@nestjs/common';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';
import { VersionCleanupService } from './version-cleanup.service';
import { CollaborationModule } from '../collaboration/collaboration.module';

@Module({
    imports: [CollaborationModule],
    controllers: [VersionsController],
    providers: [VersionsService, VersionCleanupService],
    exports: [VersionsService],
})
export class VersionsModule {}
