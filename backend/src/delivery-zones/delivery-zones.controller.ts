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
import { DeliveryZonesService } from './delivery-zones.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller()
export class DeliveryZonesController {
  constructor(private readonly deliveryZonesService: DeliveryZonesService) {}

  @Public()
  @Get('delivery-zones')
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('active') active?: string) {
    return this.deliveryZonesService.findAll(active === 'true');
  }

  @Public()
  @Get('delivery-zones/:id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.deliveryZonesService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/delivery-zones')
  @HttpCode(HttpStatus.OK)
  async adminFindAll() {
    return this.deliveryZonesService.findAll(false);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Post('admin/delivery-zones')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDeliveryZoneDto) {
    return this.deliveryZonesService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Patch('admin/delivery-zones/:id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateDeliveryZoneDto) {
    return this.deliveryZonesService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Delete('admin/delivery-zones/:id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    return this.deliveryZonesService.delete(id);
  }
}
