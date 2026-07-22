import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesService } from './roles.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: { name: string; description?: string; permissions?: string[] },
  ) {
    return this.rolesService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: { page?: number; limit?: number; search?: string },
  ) {
    return this.rolesService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body()
    dto: { name?: string; description?: string; permissions?: string[] },
  ) {
    return this.rolesService.update(id, dto);
  }

  @Patch(':id/permissions')
  @HttpCode(HttpStatus.OK)
  async assignPermissions(
    @Param('id') id: string,
    @Body() dto: { permissions: string[] },
  ) {
    return this.rolesService.assignPermissions(id, dto.permissions);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
