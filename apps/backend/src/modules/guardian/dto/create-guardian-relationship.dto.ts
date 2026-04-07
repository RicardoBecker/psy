import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateGuardianRelationshipDto {
  @IsNotEmpty()
  @IsUUID()
  minorUserId: string;

  @IsNotEmpty()
  @IsString()
  relationshipType: string;
}