import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { CashFlowCategory } from '@prisma/client';
import { ACCOUNT_CATEGORIES } from '../../financial.constants';

export class CreateAccountDto {
  @ApiProperty({ example: 'Materiais', description: 'Nome da conta' })
  @IsString()
  @MinLength(2, { message: 'Informe o nome da conta' })
  @MaxLength(120)
  name: string;

  @ApiProperty({
    enum: ACCOUNT_CATEGORIES,
    description: 'Tipo da conta (INCOME, VARIABLE_COST, FIXED_EXPENSE, PRO_LABORE, INVESTMENT)',
  })
  @IsIn(ACCOUNT_CATEGORIES, { message: 'Categoria de conta inválida' })
  category: CashFlowCategory;
}
