import { ApiPropertyOptional } from '@nestjs/swagger';
import { PhotoMoment, PhotoStage } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
