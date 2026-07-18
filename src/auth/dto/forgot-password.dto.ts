import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@covenbeauty.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;
}
