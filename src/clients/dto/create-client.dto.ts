import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'Morgana Lefay', description: 'Nome completo' })
  @IsString()
  @MinLength(3, { message: 'Informe o nome completo' })
  @MaxLength(120)
  fullName: string;

  @ApiProperty({ example: '1995-06-21', description: 'Data de nascimento (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'Data de nascimento inválida (use YYYY-MM-DD)' })
  birthDate: string;

  @ApiProperty({ example: '+5511988887777', description: 'Telefone' })
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Telefone inválido (use formato E.164, ex.: +5511988887777)',
  })
  phone: string;

  @ApiPropertyOptional({ example: 'morgana@exemplo.com', description: 'E-mail (opcional)' })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @ApiPropertyOptional({ example: '@morgana', description: 'Instagram (@usuario)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  instagram?: string;

  @ApiPropertyOptional({ example: 'Rua das Bruxas, 13 - Centro', description: 'Endereço (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    example: 'Alérgica a henna. Prefere atendimento à noite.',
    description: 'Observações (opcional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Profissional dono do cliente. Só o admin pode atribuir; ignorado para os demais (assume o próprio).',
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
