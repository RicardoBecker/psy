import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ConsentService } from './consent.service';
import { CreateConsentRecordDto } from './dto/create-consent-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/types/auth.types';

@Controller('consent')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post('records')
  createConsentRecord(
    @Request() req,
    @Body(ValidationPipe) createDto: CreateConsentRecordDto,
  ) {
    return this.consentService.createConsentRecord(req.user.id, createDto);
  }

  @Get('my-consents')
  getMyConsents(@Request() req) {
    return this.consentService.getUserConsents(req.user.id);
  }

  @Get('guardian-consents')
  @Roles(Role.GUARDIAN, Role.ADMIN)
  getGuardianConsents(@Request() req) {
    return this.consentService.getGuardianConsents(req.user.id);
  }

  @Patch('records/:id/revoke')
  revokeConsent(
    @Param('id', ParseUUIDPipe) consentId: string,
    @Request() req,
  ) {
    return this.consentService.revokeConsent(consentId, req.user.id);
  }

  @Get('check')
  checkUserConsent(
    @Request() req,
    @Query('type') consentType: string,
  ) {
    return this.consentService.checkUserConsent(req.user.id, consentType);
  }

  @Get('all')
  @Roles(Role.ADMIN)
  getAllConsents(@Request() req) {
    return this.consentService.getAllConsents(req.user.id);
  }
}