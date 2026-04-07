import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateEmotionalCheckinDto {
  @IsNumber()
  @Min(1)
  @Max(10)
  @IsNotEmpty()
  moodScore: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  @IsNotEmpty()
  energyLevel: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  @IsNotEmpty()
  anxietyLevel: number;

  @IsOptional()
  @IsString()
  notes?: string;
}