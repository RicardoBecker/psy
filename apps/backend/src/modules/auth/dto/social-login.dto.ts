import { IsNotEmpty, IsString } from 'class-validator';

// 🔒 KAN-15/KAN-16: o único dado que o frontend nos entrega é o ID token
// assinado pelo provedor (Google/Apple). Nada além disso — nem email, nem
// nome, nem role — é aceito daqui; toda identidade vem da verificação de
// assinatura feita em providers/*.provider.ts.
export class SocialLoginDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
