import { Module } from '@nestjs/common';
import { EmotionalCheckinsController } from './emotional-checkins.controller';
import { EmotionalCheckinsService } from './emotional-checkins.service';

@Module({
  controllers: [EmotionalCheckinsController],
  providers: [EmotionalCheckinsService]
})
export class EmotionalCheckinsModule {}