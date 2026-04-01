import { Controller } from '@nestjs/common';
import { EmotionalCheckinsService } from './emotional-checkins.service';

@Controller('emotional-checkins')
export class EmotionalCheckinsController {
  constructor(private readonly emotionalCheckinsService: EmotionalCheckinsService) {}
}