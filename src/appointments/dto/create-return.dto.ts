import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Retorno: reagenda parte dos procedimentos de um agendamento de origem.
 * O profissional escolhe quais procedimentos refazer e a nova data.
 */
export class CreateReturnDto {
  @ApiProperty({ example: '2026-08-15T14:00:00.000Z', description: 'Nova data/hora (ISO 8601)' })
  @IsDateString({}, { message: 'Data/hora inválida' })
  startTime: string;

  @ApiProperty({
    type: [String],
    description: 'Procedimentos a reagendar (subconjunto do agendamento de origem)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecione ao menos um procedimento para o retorno' })
  @IsUUID('4', { each: true, message: 'Procedimento inválido' })
  procedureIds: string[];

  @ApiPropertyOptional({ description: 'Profissional (padrão: o mesmo do agendamento de origem)' })
  @IsOptional()
  @IsUUID('4', { message: 'Profissional inválido' })
  professionalId?: string;

  @ApiPropertyOptional({ description: 'Observação' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
