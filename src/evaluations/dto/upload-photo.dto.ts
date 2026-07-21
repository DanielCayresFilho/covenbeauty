import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PhotoMoment, PhotoStage } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Metadados enviados junto da imagem (multipart, campos de texto). */
export class UploadPhotoDto {
  @ApiPropertyOptional({ enum: PhotoStage, default: PhotoStage.OTHER })
  @IsOptional()
  @IsEnum(PhotoStage)
  stage: PhotoStage = PhotoStage.OTHER;

  @ApiPropertyOptional({ enum: PhotoMoment, default: PhotoMoment.BEFORE })
  @IsOptional()
  @IsEnum(PhotoMoment)
  moment: PhotoMoment = PhotoMoment.BEFORE;

  @ApiPropertyOptional({ example: 'Lateral direita, luz natural' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;

  @ApiPropertyOptional({ example: 1, description: 'Tatuagem: nº da sessão da foto' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  session?: number;
}
