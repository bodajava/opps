import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactFormDto } from './dto/contact-form.dto';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post()
  @HttpCode(HttpStatus.OK)
  submit(@Body() dto: ContactFormDto) {
    this.logger.log(
      `Contact form submission from ${dto.email}: ${dto.subject}`,
    );

    return {
      success: true,
      message: 'Thank you for your message. We will get back to you shortly.',
    };
  }
}
