import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentMethodsService } from './payment-methods.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller()
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Public()
  @Get('payment-methods')
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.paymentMethodsService.getEnabledMethods();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/payment-methods')
  @HttpCode(HttpStatus.OK)
  async adminFindAll() {
    return this.paymentMethodsService.findAll();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/payment-methods/:id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.paymentMethodsService.findByCode(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Post('admin/payment-methods')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body()
    dto: {
      code: string;
      name: string;
      description?: string;
      type: string;
      instructions?: DynamicRecord;
      isActive?: boolean;
      isEnabled?: boolean;
      sortOrder?: number;
      icon?: string;
      additionalFee?: number;
      config?: DynamicRecord;
    },
  ) {
    return this.paymentMethodsService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Patch('admin/payment-methods/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body()
    dto: Partial<{
      name: string;
      description: string;
      type: string;
      instructions: DynamicRecord;
      isActive: boolean;
      isEnabled: boolean;
      sortOrder: number;
      icon: string;
      additionalFee: number;
      config: DynamicRecord;
    }>,
  ) {
    return this.paymentMethodsService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Delete('admin/payment-methods/:id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    return this.paymentMethodsService.delete(id);
  }
}
