import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EmotionalCheckinsService } from './emotional-checkins.service';
import { CreateEmotionalCheckinDto } from './dto/create-emotional-checkin.dto';
import { UpdateEmotionalCheckinDto } from './dto/update-emotional-checkin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('emotional-checkins')
@UseGuards(JwtAuthGuard)
export class EmotionalCheckinsController {
  constructor(private readonly emotionalCheckinsService: EmotionalCheckinsService) {}

  @Post()
  create(
    @Request() req,
    @Body(ValidationPipe) createEmotionalCheckinDto: CreateEmotionalCheckinDto,
  ) {
    return this.emotionalCheckinsService.create(req.user.id, createEmotionalCheckinDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.emotionalCheckinsService.findAll(req.user.id);
  }

  @Get('stats')
  getStats(@Request() req) {
    return this.emotionalCheckinsService.getStats(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.emotionalCheckinsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body(ValidationPipe) updateEmotionalCheckinDto: UpdateEmotionalCheckinDto,
  ) {
    return this.emotionalCheckinsService.update(id, req.user.id, updateEmotionalCheckinDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.emotionalCheckinsService.remove(id, req.user.id);
  }
}