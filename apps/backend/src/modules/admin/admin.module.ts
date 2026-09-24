import { Module } from '@nestjs/common';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminSecurityController } from './security/admin-security.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';

@Module({
  imports: [PrismaModule, RateLimitModule],
  controllers: [AdminUsersController, AdminSecurityController],
  providers: [AdminUsersService],
})
export class AdminModule {}