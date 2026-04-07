import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateConsentRecordDto {
  @IsNotEmpty()
  @IsString()
  consentType: string;

  @IsOptional()
  @IsUUID()
  guardianUserId?: string;
}