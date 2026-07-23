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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { RestockProductDto } from './dto/restock-product.dto';
import { MAX_UPLOAD_BYTES, type UploadedImage } from '@/common/uploads';
import { AuthUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('products')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um produto' })
  create(@Body() dto: CreateProductDto, @CurrentUser('id') userId: string) {
    return this.products.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lista produtos (busca, filtros e paginação)' })
  findAll(@Query() query: QueryProductsDto, @CurrentUser() user: AuthUser) {
    return this.products.findAll(query, user);
  }

  @Post(':id/restock')
  @ApiOperation({ summary: 'Repõe estoque (entram N embalagens)' })
  restock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestockProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.restock(id, dto.units, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um produto' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.products.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um produto' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um produto' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.products.remove(id, user);
  }

  // ─────────────── Imagem do produto ───────────────

  @Post(':id/image')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Anexa/atualiza a imagem do produto' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  setImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedImage | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.setImage(id, file, user);
  }

  @Get(':id/image/file')
  @ApiOperation({ summary: 'Baixa a imagem do produto (autenticado)' })
  async imageFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const { path, mimeType } = await this.products.imageOf(id, user);
    res.type(mimeType);
    res.sendFile(path);
  }

  @Delete(':id/image')
  @ApiOperation({ summary: 'Remove a imagem do produto' })
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.clearImage(id, user);
  }
}
