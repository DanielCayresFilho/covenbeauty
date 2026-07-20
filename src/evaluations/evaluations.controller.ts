import type { Response } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { EvaluationsService } from './evaluations.service';
import {
  EvaluationPhotosService,
  MAX_PHOTO_BYTES,
  type UploadedImage,
} from './photos.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { QueryEvaluationsDto } from './dto/query-evaluations.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('evaluations')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('evaluations')
export class EvaluationsController {
  constructor(
    private readonly evaluations: EvaluationsService,
    private readonly photos: EvaluationPhotosService,
  ) {}

  @Post()
  @ApiOperation({ summary: '[ADMIN] Cria uma ficha de avaliação para o cliente' })
  create(@Body() dto: CreateEvaluationDto, @CurrentUser('id') userId: string) {
    return this.evaluations.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '[ADMIN] Lista fichas (filtra por cliente; histórico)' })
  findAll(@Query() query: QueryEvaluationsDto) {
    return this.evaluations.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Detalha uma ficha de avaliação' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.evaluations.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Atualiza uma ficha de avaliação' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEvaluationDto) {
    return this.evaluations.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Remove uma ficha de avaliação' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.evaluations.remove(id);
  }

  // ─────────────── Fotos da ficha (histórico antes/depois) ───────────────

  @Post(':id/photos')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Anexa uma foto à ficha (rosto, cabelo, etc.)' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_BYTES } }),
  )
  uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedImage | undefined,
    @Body() dto: UploadPhotoDto,
  ) {
    return this.photos.upload(id, file, dto);
  }

  @Get(':id/photos')
  @ApiOperation({ summary: 'Lista as fotos de uma ficha' })
  listPhotos(@Param('id', ParseUUIDPipe) id: string) {
    return this.photos.findAll(id);
  }

  @Get('photos/:photoId/file')
  @ApiOperation({ summary: 'Baixa o arquivo da foto (autenticado)' })
  async photoFile(
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Res() res: Response,
  ) {
    const { path, mimeType } = await this.photos.fileOf(photoId);
    res.type(mimeType);
    res.sendFile(path);
  }

  @Delete('photos/:photoId')
  @ApiOperation({ summary: 'Remove uma foto da ficha' })
  removePhoto(@Param('photoId', ParseUUIDPipe) photoId: string) {
    return this.photos.remove(photoId);
  }
}
