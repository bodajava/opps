import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactFormDto {
  @ApiProperty({ example: 'Ahmed Ali' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+201000000000' })
  @IsString()
  @MinLength(7)
  phone: string;

  @ApiProperty({ example: 'Order Inquiry' })
  @IsString()
  @MinLength(3)
  subject: string;

  @ApiProperty({ example: 'I have a question about my order...' })
  @IsString()
  @MinLength(10)
  message: string;
}
