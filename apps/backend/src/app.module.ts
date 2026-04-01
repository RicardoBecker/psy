import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmotionalCheckinsModule } from './modules/emotional-checkins/emotional-checkins.module';
import { JournalEntriesModule } from './modules/journal-entries/journal-entries.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    EmotionalCheckinsModule,
    JournalEntriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}