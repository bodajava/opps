import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly devMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>(
      'app.nodeEnv',
      'development',
    );
    const devConsole = this.configService.get<boolean>(
      'app.devEmailOtpConsole',
      false,
    );
    this.devMode = nodeEnv === 'development' && devConsole;

    if (!this.devMode) {
      const host = this.configService.get<string>('app.smtpHost', '');
      const user = this.configService.get<string>('app.smtpUser', '');
      const pass = this.configService.get<string>('app.smtpPassword', '');
      if (!host || !user || !pass) {
        this.logger.warn(
          'SMTP is not configured; email-only features will fail until SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are set',
        );
        return;
      }
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('app.smtpPort'),
        secure: this.configService.get<boolean>('app.smtpSecure'),
        auth: {
          user,
          pass,
        },
      });
    }
  }

  private async sendMail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const fromName = this.configService.get<string>(
      'app.emailFromName',
      'opps',
    );
    const fromAddress = this.configService.get<string>(
      'app.emailFromAddress',
      'noreply@opps.com',
    );

    if (this.devMode) {
      this.logger.log('--- DEV EMAIL (console) ---');
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`Subject: ${options.subject}`);
      this.logger.log(`Body: ${options.html}`);
      this.logger.log('--- END DEV EMAIL ---');
      return;
    }

    if (!this.transporter) {
      this.logger.warn('Email not sent: no SMTP transporter configured');
      throw new Error('Email service is not configured');
    }

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      this.logger.error(
        'Failed to send email',
        error instanceof Error ? error.message : error,
      );
      throw new Error('Failed to send email. Please try again later.');
    }
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Your OTP Code',
      html: `<p>Your OTP code is: <strong>${otp}</strong></p><p>This code expires in ${this.configService.get<number>('app.emailOtpExpiresMinutes', 10)} minutes.</p>`,
    });
  }

  async sendOrderConfirmation(
    email: string,
    order: {
      orderNumber: string;
      items: Array<DynamicRecord>;
      total: number;
    },
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html: `<h1>Order Confirmed</h1><p>Your order <strong>${order.orderNumber}</strong> has been confirmed.</p><p>Total: ${order.total}</p>`,
    });
  }

  async sendOrderStatusUpdate(
    email: string,
    order: { orderNumber: string },
    status: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Order Status Update - ${order.orderNumber}`,
      html: `<h1>Order Status Updated</h1><p>Your order <strong>${order.orderNumber}</strong> is now: <strong>${status}</strong></p>`,
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>(
      'app.appUrl',
      'http://localhost:3000',
    );
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    await this.sendMail({
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    });
  }

  async sendMailExternal(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    await this.sendMail(options);
  }
}
