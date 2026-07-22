import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { UnsubscribeService } from './unsubscribe.service';

@Public()
@Controller('unsubscribe')
export class UnsubscribeController {
  constructor(private readonly unsubscribeService: UnsubscribeService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async checkToken(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    const email = await this.unsubscribeService.getEmailFromToken(token);
    if (!email) {
      throw new BadRequestException('Invalid or expired unsubscribe token');
    }
    return { email, valid: true };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Body() body: { token: string }) {
    if (!body.token) {
      throw new BadRequestException('Token is required');
    }
    const success = await this.unsubscribeService.consumeToken(body.token);
    if (!success) {
      throw new BadRequestException('Invalid or expired unsubscribe token');
    }
    return { message: 'Successfully unsubscribed from marketing emails' };
  }
}
