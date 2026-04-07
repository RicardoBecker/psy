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
} from '@nestjs/common';
import { GuardianService } from './guardian.service';
import { CreateGuardianRelationshipDto } from './dto/create-guardian-relationship.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/types/auth.types';

@Controller('guardian')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuardianController {
  constructor(private readonly guardianService: GuardianService) {}

  @Post('relationships')
  @Roles(Role.GUARDIAN, Role.ADMIN)
  createRelationship(
    @Request() req,
    @Body(ValidationPipe) createDto: CreateGuardianRelationshipDto,
  ) {
    return this.guardianService.createGuardianRelationship(req.user.id, createDto);
  }

  @Get('relationships')
  @Roles(Role.GUARDIAN, Role.ADMIN)
  getMyRelationships(@Request() req) {
    return this.guardianService.getGuardianRelationships(req.user.id);
  }

  @Get('minor-relationships')
  getMyMinorRelationships(@Request() req) {
    return this.guardianService.getMinorRelationships(req.user.id);
  }

  @Patch('relationships/:id/approve')
  approveRelationship(
    @Param('id', ParseUUIDPipe) relationshipId: string,
    @Request() req,
  ) {
    return this.guardianService.approveRelationship(relationshipId, req.user.id);
  }

  @Patch('relationships/:id/reject')
  rejectRelationship(
    @Param('id', ParseUUIDPipe) relationshipId: string,
    @Request() req,
  ) {
    return this.guardianService.rejectRelationship(relationshipId, req.user.id);
  }
}