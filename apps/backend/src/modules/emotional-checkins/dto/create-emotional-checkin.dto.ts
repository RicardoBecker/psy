import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateEmotionalCheckinDto {
  @IsNumber()
  @Min(1)
  @Max(10)
  @IsNotEmpty()
  mood: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  @IsNotEmpty()
  energy: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  @IsNotEmpty()
  stress: number;

  @IsOptional()
  @IsString()
  notes?: string;
}