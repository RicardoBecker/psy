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
  Query,
} from '@nestjs/common';
import { JournalEntriesService } from './journal-entries.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('journal-entries')
@UseGuards(JwtAuthGuard)
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Post()
  create(
    @Request() req,
    @Body(ValidationPipe) createJournalEntryDto: CreateJournalEntryDto,
  ) {
    return this.journalEntriesService.create(req.user.id, createJournalEntryDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.journalEntriesService.findAll(req.user.id);
  }

  @Get('search')
  search(@Request() req, @Query('q') searchTerm: string) {
    return this.journalEntriesService.search(req.user.id, searchTerm);
  }

  @Get('stats')
  getStats(@Request() req) {
    return this.journalEntriesService.getStats(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.journalEntriesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body(ValidationPipe) updateJournalEntryDto: UpdateJournalEntryDto,
  ) {
    return this.journalEntriesService.update(id, req.user.id, updateJournalEntryDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.journalEntriesService.remove(id, req.user.id);
  }
}