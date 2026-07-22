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
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findByUser(@CurrentUser('sub') userId: string) {
    return this.addressesService.findByUser(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(userId, dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.addressesService.delete(id, userId);
  }

  @Patch(':id/default')
  @HttpCode(HttpStatus.OK)
  async setDefault(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.addressesService.setDefault(id, userId);
  }
}
