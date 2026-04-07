import { IsOptional, IsString, IsEmail, IsDateString, IsBoolean, IsEnum } from 'class-validator';
import { AgeGroup } from '../../../../common/types/auth.types';

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsEnum(AgeGroup)
  ageGroup?: AgeGroup;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}