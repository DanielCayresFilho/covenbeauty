import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ComandasService } from './comandas.service';
import { OpenComandaDto } from './dto/open-comanda.dto';
import { AddComandaProcedureDto } from './dto/add-procedure.dto';
import { AddComandaProductDto } from './dto/add-product.dto';
import { CloseComandaDto } from './dto/close-comanda.dto';
import { QueryComandasDto } from './dto/query-comandas.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { AddSaleProductDto } from './dto/add-sale-product.dto';
import { AuthUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('comandas')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('comandas')
export class ComandasController {
  constructor(private readonly comandas: ComandasService) {}

  @Post()
  @ApiOperation({ summary: '[ADMIN] Abre a comanda de um agendamento' })
  open(@Body() dto: OpenComandaDto) {
    return this.comandas.open(dto);
  }

  @Post('sale')
  @ApiOperation({ summary: 'Abre uma comanda de venda (balcão, sem agendamento)' })
  createSale(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthUser) {
    return this.comandas.createSale(dto, user);
  }

  @Post(':id/sale-product')
  @ApiOperation({ summary: 'Vende um produto na comanda (baixa unidades)' })
  sellProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSaleProductDto,
  ) {
    return this.comandas.sellProduct(id, dto);
  }

  @Get()
  @ApiOperation({ summary: '[ADMIN] Lista comandas (filtros + paginação)' })
  findAll(@Query() query: QueryComandasDto) {
    return this.comandas.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Detalha a comanda (com prévia de valores)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.comandas.findOne(id);
  }

  @Post(':id/procedures')
  @ApiOperation({ summary: '[ADMIN] Adiciona um procedimento à comanda' })
  addProcedure(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddComandaProcedureDto,
  ) {
    return this.comandas.addProcedure(id, dto);
  }

  @Delete(':id/procedures/:itemId')
  @ApiOperation({ summary: '[ADMIN] Remove um procedimento da comanda' })
  removeProcedure(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.comandas.removeProcedure(id, itemId);
  }

  @Post(':id/products')
  @ApiOperation({ summary: '[ADMIN] Registra produto consumido (baixa do estoque)' })
  addProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddComandaProductDto,
  ) {
    return this.comandas.addProduct(id, dto);
  }

  @Delete(':id/products/:itemId')
  @ApiOperation({ summary: '[ADMIN] Remove produto consumido (estorna estoque)' })
  removeProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.comandas.removeProduct(id, itemId);
  }

  @Post(':id/close')
  @ApiOperation({ summary: '[ADMIN] Fecha a comanda (pagamento, sinal, retorno)' })
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseComandaDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.comandas.close(id, dto, userId);
  }

  @Post(':id/reopen')
  @ApiOperation({ summary: 'Reabre uma comanda fechada' })
  reopen(@Param('id', ParseUUIDPipe) id: string) {
    return this.comandas.reopen(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Exclui uma comanda aberta (estorna estoque)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.comandas.remove(id);
  }
}
