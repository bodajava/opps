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
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Public()
  @Post('coupons/validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validateCoupon(
      dto.code,
      dto.subtotal || 0,
      dto.items,
      dto.email,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('coupons/validate-authenticated')
  @HttpCode(HttpStatus.OK)
  async validateAuthenticated(
    @Body() dto: ValidateCouponDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.couponsService.validateCoupon(
      dto.code,
      dto.subtotal || 0,
      dto.items,
      dto.email,
      userId,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/coupons')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.couponsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/coupons/:id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.couponsService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Post('admin/coupons')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Patch('admin/coupons/:id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Delete('admin/coupons/:id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    return this.couponsService.delete(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/coupons/:id/usage')
  @HttpCode(HttpStatus.OK)
  async getUsage(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.couponsService.getUsageRecords(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
