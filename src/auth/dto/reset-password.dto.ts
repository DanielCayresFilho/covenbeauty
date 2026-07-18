import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'admin@covenbeauty.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos recebido por e-mail' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'O código deve ter 6 dígitos' })
  code: string;

  @ApiProperty({ example: 'NovaSenh4!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(72)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'A senha deve conter maiúscula, minúscula e número',
  })
  newPassword: string;
}
