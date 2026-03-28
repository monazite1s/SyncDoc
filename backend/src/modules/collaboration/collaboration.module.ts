import { Module } from '@nestjs/common';
import { CollaborationHocuspocus } from './collaboration.hocuspocus';
import { CollaborationService } from './collaboration.service';

@Module({
  providers: [CollaborationHocuspocus, CollaborationService],
  exports: [CollaborationService, CollaborationHocuspocus],
})
export class CollaborationModule {}
