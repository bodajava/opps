import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService } from './customers.service';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admin/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get('guest')
  @HttpCode(HttpStatus.OK)
  async getGuestCustomers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.customersService.getGuestCustomers({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  async blockCustomer(@Param('id') id: string) {
    return this.customersService.blockCustomer(id);
  }

  @Post(':id/unblock')
  @HttpCode(HttpStatus.OK)
  async unblockCustomer(@Param('id') id: string) {
    return this.customersService.unblockCustomer(id);
  }
}
