import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddComandaProcedureDto {
  @ApiProperty({ description: 'Procedimento a adicionar na comanda' })
  @IsUUID('4', { message: 'Procedimento inválido' })
  procedureId: string;
}
