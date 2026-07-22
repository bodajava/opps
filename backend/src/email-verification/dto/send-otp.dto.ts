import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
