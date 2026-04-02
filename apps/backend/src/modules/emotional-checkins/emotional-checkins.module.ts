import { Module } from '@nestjs/common';
import { EmotionalCheckinsController } from './emotional-checkins.controller';
import { EmotionalCheckinsService } from './emotional-checkins.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmotionalCheckinsController],
  providers: [EmotionalCheckinsService]
})
export class EmotionalCheckinsModule {}