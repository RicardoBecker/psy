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
import { PsychologistService } from './psychologist.service';
import { CreatePsychologistProfileDto, UpdatePsychologistProfileDto } from './dto/psychologist-profile.dto';
import { CreatePatientLinkDto } from './dto/create-patient-link.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/types/auth.types';

@Controller('psychologist')
@UseGuards(JwtAuthGuard, RolesGuard) 
export class PsychologistController {
  constructor(private readonly psychologistService: PsychologistService) {}

  @Post('profile')
  @Roles(Role.PSYCHOLOGIST)
  createProfile(
    @Request() req,
    @Body(ValidationPipe) createDto: CreatePsychologistProfileDto,
  ) {
    return this.psychologistService.createProfile(req.user.id, createDto);
  }

  @Get('profile')
  @Roles(Role.PSYCHOLOGIST, Role.ADMIN)
  getMyProfile(@Request() req) {
    return this.psychologistService.getProfile(req.user.id);
  }

  @Patch('profile')
  @Roles(Role.PSYCHOLOGIST)
  updateProfile(
    @Request() req,
    @Body(ValidationPipe) updateDto: UpdatePsychologistProfileDto,
  ) {
    return this.psychologistService.updateProfile(req.user.id, updateDto);
  }

  @Post('patient-links')
  @Roles(Role.PSYCHOLOGIST)
  createPatientLink(
    @Request() req,
    @Body(ValidationPipe) createDto: CreatePatientLinkDto,
  ) {
    return this.psychologistService.createPatientLink(req.user.id, createDto);
  }

  @Get('patients')
  @Roles(Role.PSYCHOLOGIST)
  getMyPatients(@Request() req) {
    return this.psychologistService.getMyPatients(req.user.id);
  }

  @Get('pending-links')
  @Roles(Role.PSYCHOLOGIST)
  getPendingLinks(@Request() req) {
    return this.psychologistService.getPendingLinks(req.user.id);
  }

  @Get('my-psychologists')
  @Roles(Role.PATIENT)
  getMyPsychologists(@Request() req) {
    return this.psychologistService.getMyPsychologists(req.user.id);
  }

  @Patch('links/:id/approve')
  approvePatientLink(
    @Param('id', ParseUUIDPipe) linkId: string,
    @Request() req,
  ) {
    return this.psychologistService.approvePatientLink(linkId, req.user.id);
  }

  // Endpoints administrativos
  @Get('all')
  @Roles(Role.ADMIN)
  getAllPsychologists() {
    return this.psychologistService.getAllPsychologists();
  }

  @Patch('verify/:id')
  @Roles(Role.ADMIN)
  verifyPsychologist(
    @Param('id', ParseUUIDPipe) profileId: string,
    @Request() req,
  ) {
    return this.psychologistService.verifyPsychologist(profileId, req.user.id);
  }
}