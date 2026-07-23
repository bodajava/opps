import { IsNotEmpty, IsString, Length } from 'class-validator';

export enum RegistrationStatus {
  PendingVerification = 'pending_verification',
}

export enum VerificationChannel {
  Email = 'email',
}

export class VerifyRegistrationOtpDto {
  @IsString()
  @IsNotEmpty()
  verificationFlowId: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}

export class ResendRegistrationOtpDto {
  @IsString()
  @IsNotEmpty()
  verificationFlowId: string;
}

export interface RegistrationPendingResponseDto {
  status: RegistrationStatus.PendingVerification;
  verificationChannel: VerificationChannel.Email;
  maskedDestination: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  verificationFlowId: string;
}

export interface VerifyRegistrationResponseDto {
  status: 'verified_authenticated';
  user: DynamicRecord;
  accessToken: string;
  refreshToken: string;
}
