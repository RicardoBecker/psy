import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreatePatientLinkDto {
  @IsNotEmpty()
  @IsUUID()
  patientId: string;
}