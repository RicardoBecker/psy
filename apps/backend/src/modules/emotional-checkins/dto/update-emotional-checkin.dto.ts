import { PartialType } from '@nestjs/mapped-types';
import { CreateEmotionalCheckinDto } from './create-emotional-checkin.dto';

export class UpdateEmotionalCheckinDto extends PartialType(CreateEmotionalCheckinDto) {}