export enum EmailJobKind {
  Otp = 'otp',
  PasswordReset = 'password_reset',
  OrderConfirmation = 'order_confirmation',
  PaymentConfirmation = 'payment_confirmation',
  Campaign = 'campaign',
  TestEmail = 'test_email',
  Welcome = 'welcome',
}

interface EmailJobBase {
  recipient: string;
  operationId: string;
}

export interface OtpEmailJob extends EmailJobBase {
  kind: EmailJobKind.Otp;
  encryptedOtp: string;
}

export interface PasswordResetEmailJob extends EmailJobBase {
  kind: EmailJobKind.PasswordReset;
  resetToken: string;
}

export interface OrderConfirmationEmailJob extends EmailJobBase {
  kind: EmailJobKind.OrderConfirmation;
  orderNumber: string;
  total: number;
}

export interface PaymentConfirmationEmailJob extends EmailJobBase {
  kind: EmailJobKind.PaymentConfirmation;
  paymentReference: string;
  amount: number;
}

export interface CampaignEmailJob extends EmailJobBase {
  kind: EmailJobKind.Campaign;
  campaignId: string;
  subject: string;
  html: string;
}

export interface TestEmailJob extends EmailJobBase {
  kind: EmailJobKind.TestEmail;
  subject: string;
  html: string;
}

export interface WelcomeEmailJob extends EmailJobBase {
  kind: EmailJobKind.Welcome;
  name?: string;
}

export type EmailJob =
  | OtpEmailJob
  | PasswordResetEmailJob
  | OrderConfirmationEmailJob
  | PaymentConfirmationEmailJob
  | CampaignEmailJob
  | TestEmailJob
  | WelcomeEmailJob;
