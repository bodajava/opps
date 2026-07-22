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
import { PermissionsService } from './permissions.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: { name: string; description?: string; group?: string },
  ) {
    return this.permissionsService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query()
    query: {
      page?: number;
      limit?: number;
      search?: string;
      group?: string;
    },
  ) {
    return this.permissionsService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.permissionsService.findById(id);
  }

  @Get('group/:group')
  @HttpCode(HttpStatus.OK)
  async findByGroup(@Param('group') group: string) {
    return this.permissionsService.findByGroup(group);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; group?: string },
  ) {
    return this.permissionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.permissionsService.remove(id);
  }
}
