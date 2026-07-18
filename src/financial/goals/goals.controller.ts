import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('financial-goals')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@UseGuards(RolesGuard)
@Controller('financial/goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Post()
  @ApiOperation({ summary: '[ADMIN] Cria uma meta de entradas por período' })
  create(@Body() dto: CreateGoalDto, @CurrentUser('id') userId: string) {
    return this.goals.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '[ADMIN] Lista metas (com progresso)' })
  findAll() {
    return this.goals.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Detalha uma meta (com progresso)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.goals.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Atualiza uma meta' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGoalDto) {
    return this.goals.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Remove uma meta' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.goals.remove(id);
  }
}
