import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsPositive } from 'class-validator';

/** Confirma o pagamento de uma despesa fixa, gerando o lançamento no fluxo. */
export class PayFixedExpenseDto {
  @ApiPropertyOptional({
    description: 'Data do pagamento (YYYY-MM-DD). Padrão: hoje.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data inválida' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Valor pago, quando diferente do cadastrado (ex.: conta de luz).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor inválido' })
  @IsPositive({ message: 'O valor deve ser maior que zero' })
  amount?: number;
}
