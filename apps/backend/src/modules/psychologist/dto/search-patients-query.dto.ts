import { IsString, MinLength } from 'class-validator';

export class SearchPatientsQueryDto {
  @IsString()
  @MinLength(3)
  email: string;
}
