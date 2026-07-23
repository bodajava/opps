import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  orderEmail,
  passwordResetEmail,
  registrationOtpEmail,
  welcomeEmail,
} from '../email/email-template';

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
    text: string;
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
      this.logger.log('Development email rendered without delivery');
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
        text: options.text,
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
    const template = registrationOtpEmail({
      otp,
      expiresMinutes: this.configService.get<number>(
        'app.emailOtpExpiresMinutes',
        10,
      ),
      appUrl: this.configService.get<string>('app.appUrl', ''),
      supportEmail:
        this.configService.get<string>('app.supportEmail') || undefined,
    });
    await this.sendMail({
      to: email,
      ...template,
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
    const template = orderEmail({
      orderNumber: order.orderNumber,
      total: order.total,
      appUrl: this.configService.get<string>('app.appUrl', ''),
      supportEmail:
        this.configService.get<string>('app.supportEmail') || undefined,
    });
    await this.sendMail({
      to: email,
      ...template,
    });
  }

  async sendOrderStatusUpdate(
    email: string,
    order: { orderNumber: string },
    status: string,
  ): Promise<void> {
    const template = orderEmail({
      orderNumber: order.orderNumber,
      total: 0,
      status,
      appUrl: this.configService.get<string>('app.appUrl', ''),
      supportEmail:
        this.configService.get<string>('app.supportEmail') || undefined,
    });
    await this.sendMail({
      to: email,
      ...template,
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>(
      'app.appUrl',
      'http://localhost:3000',
    );
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    const template = passwordResetEmail({
      resetUrl,
      appUrl,
      supportEmail:
        this.configService.get<string>('app.supportEmail') || undefined,
    });
    await this.sendMail({
      to: email,
      ...template,
    });
  }

  async sendWelcome(email: string, name?: string): Promise<void> {
    const template = welcomeEmail({
      name,
      appUrl: this.configService.get<string>('app.appUrl', ''),
      supportEmail:
        this.configService.get<string>('app.supportEmail') || undefined,
    });
    await this.sendMail({ to: email, ...template });
  }

  async sendMailExternal(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    await this.sendMail({
      ...options,
      text: options.html.replace(/<[^>]+>/g, ' '),
    });
  }
}
