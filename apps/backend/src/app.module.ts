import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
import { CsrfCookieMiddleware } from './common/csrf.middleware';
import { CsrfGuard } from './common/csrf.guard';

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
  providers: [AppService, { provide: APP_GUARD, useClass: CsrfGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfCookieMiddleware).forRoutes('*');
  }
}