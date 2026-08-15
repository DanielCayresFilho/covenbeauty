import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFixedExpenseDto {
  @ApiProperty({ example: 'Aluguel' })
  @IsString()
  @MinLength(2, { message: 'Informe o nome da despesa' })
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 1800.0, description: 'Valor mensal' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor inválido' })
  @IsPositive({ message: 'O valor deve ser maior que zero' })
  amount: number;

  @ApiProperty({ example: 10, description: 'Dia do vencimento (1-31)' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'O dia do vencimento vai de 1 a 31' })
  @Max(31, { message: 'O dia do vencimento vai de 1 a 31' })
  dueDay: number;

  @ApiPropertyOptional({ description: 'Conta de despesa fixa onde lançar o pagamento' })
  @IsOptional()
  @IsUUID('4', { message: 'Conta inválida' })
  accountId?: string;

  @ApiPropertyOptional({ example: 'Vence todo dia 10, boleto no e-mail' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
