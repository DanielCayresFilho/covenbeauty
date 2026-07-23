import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RecurringBlocksService } from './recurring-blocks.service';
import { CreateRecurringBlockDto } from './dto/recurring-block.dto';
import { AuthUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('recurring-blocks')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('recurring-blocks')
export class RecurringBlocksController {
  constructor(private readonly blocks: RecurringBlocksService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um bloqueio fixo (ex.: todo sábado 09h-11h)' })
  create(@Body() dto: CreateRecurringBlockDto, @CurrentUser() user: AuthUser) {
    return this.blocks.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os bloqueios fixos' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.blocks.findAll(user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um bloqueio fixo' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.blocks.remove(id, user);
  }
}
