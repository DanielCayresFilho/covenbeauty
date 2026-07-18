import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// A categoria não muda (mudaria o significado dos lançamentos existentes).
export class UpdateAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Ativa/inativa a conta' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
