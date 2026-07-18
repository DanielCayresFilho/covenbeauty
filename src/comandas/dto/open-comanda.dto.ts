import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class OpenComandaDto {
  @ApiProperty({ description: 'Agendamento que origina a comanda' })
  @IsUUID('4', { message: 'Agendamento inválido' })
  appointmentId: string;
}
