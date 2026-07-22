import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  fullName: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  password: string;

  @IsString()
  @Matches(/^01[0-9]{9}$/, {
    message: 'Please provide a valid Egyptian phone number',
  })
  phone: string;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
}
