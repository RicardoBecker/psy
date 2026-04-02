import { Module } from '@nestjs/common';
import { JournalEntriesController } from './journal-entries.controller';
import { JournalEntriesService } from './journal-entries.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JournalEntriesController],
  providers: [JournalEntriesService]
})
export class JournalEntriesModule {}