import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreatePsychologistProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsString()
  registrationNumber?: string;
}

// 🔒 Self-service: o próprio psicólogo edita bio/especialidades/registro.
// `verified` propositalmente não existe aqui — só é concedido pelo
// endpoint administrativo (PsychologistService.verifyPsychologist).
export class UpdatePsychologistProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsString()
  registrationNumber?: string;
}