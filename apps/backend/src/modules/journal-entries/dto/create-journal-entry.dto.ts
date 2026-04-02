import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateJournalEntryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content: string;
}