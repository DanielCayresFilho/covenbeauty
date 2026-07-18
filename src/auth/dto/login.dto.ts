import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'cliente@covenbeauty.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @ApiProperty({ example: 'SenhaF0rte!' })
  @IsString()
  @MinLength(1, { message: 'Informe a senha' })
  password: string;
}
