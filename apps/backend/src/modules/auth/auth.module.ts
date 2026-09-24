import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { GoogleAuthProvider } from './providers/google.provider';
import { AppleAuthProvider } from './providers/apple.provider';
import { SocialAuthService } from './social-auth.service';
import { PasswordResetService } from './password-reset.service';
import { MailerModule } from '../../common/mailer/mailer.module';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { AppleChallengeService } from './apple-challenge.service';

@Module({
  imports: [
    UsersModule,
    MailerModule,
    RateLimitModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleAuthProvider,
    AppleAuthProvider,
    SocialAuthService,
    PasswordResetService,
    AppleChallengeService,
  ],
  exports: [AuthService],
})
export class AuthModule {}