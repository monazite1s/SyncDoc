import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ShareController, ShareAccessController } from './share.controller';
import { ShareService } from './share.service';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { ActivityLogService } from '../../common/services/activity-log.service';

@Module({
    imports: [CollaborationModule],
    controllers: [DocumentsController, ShareController, ShareAccessController],
    providers: [ActivityLogService, DocumentsService, ShareService],
    exports: [DocumentsService, ShareService],
})
export class DocumentsModule {}
