import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmotionalCheckinsModule } from './modules/emotional-checkins/emotional-checkins.module';
import { JournalEntriesModule } from './modules/journal-entries/journal-entries.module';
import { GuardianModule } from './modules/guardian/guardian.module';
import { PsychologistModule } from './modules/psychologist/psychologist.module';
import { ConsentModule } from './modules/consent/consent.module';
import { AdminModule } from './modules/admin/admin.module';

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
    GuardianModule,
    PsychologistModule,
    ConsentModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}