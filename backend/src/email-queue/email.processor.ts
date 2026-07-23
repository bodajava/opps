import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { EmailService } from '../common/providers/email.service';
import { EmailDeduplicationRepository } from '../redis/email-deduplication.repository';
import { EmailDeduplicationState } from '../redis/redis.types';
import { EmailJob, EmailJobKind } from './email-job.types';
import { EmailPayloadCipherService } from './email-payload-cipher.service';

@Processor(process.env.EMAIL_QUEUE_NAME || 'opps-email', {
  concurrency: Number(process.env.EMAIL_QUEUE_CONCURRENCY || 5),
})
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly email: EmailService,
    private readonly deduplication: EmailDeduplicationRepository,
    private readonly config: ConfigService,
    private readonly cipher: EmailPayloadCipherService,
  ) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    const payload = job.data;
    const ttl = this.config.get<number>(
      'app.emailDeduplicationTtlSeconds',
      300,
    );
    await this.deduplication.mark(
      payload.kind,
      payload.recipient,
      payload.operationId,
      EmailDeduplicationState.Processing,
      ttl,
    );
    try {
      switch (payload.kind) {
        case EmailJobKind.Otp:
          await this.email.sendOTP(
            payload.recipient,
            this.cipher.decrypt(payload.encryptedOtp),
          );
          break;
        case EmailJobKind.PasswordReset:
          await this.email.sendPasswordReset(
            payload.recipient,
            payload.resetToken,
          );
          break;
        case EmailJobKind.OrderConfirmation:
          await this.email.sendOrderConfirmation(payload.recipient, {
            orderNumber: payload.orderNumber,
            items: [],
            total: payload.total,
          });
          break;
        case EmailJobKind.PaymentConfirmation:
          await this.email.sendMailExternal({
            to: payload.recipient,
            subject: 'Payment confirmed',
            html: `<p>Payment ${payload.paymentReference} confirmed. Amount: ${payload.amount}</p>`,
          });
          break;
        case EmailJobKind.Campaign:
        case EmailJobKind.TestEmail:
          await this.email.sendMailExternal({
            to: payload.recipient,
            subject: payload.subject,
            html: payload.html,
          });
          break;
        case EmailJobKind.Welcome:
          await this.email.sendWelcome(payload.recipient, payload.name);
          break;
      }
      await this.deduplication.mark(
        payload.kind,
        payload.recipient,
        payload.operationId,
        EmailDeduplicationState.Sent,
        604800,
      );
      this.logger.log(`Email job completed: ${job.id || 'unassigned'}`);
    } catch (error) {
      await this.deduplication.mark(
        payload.kind,
        payload.recipient,
        payload.operationId,
        EmailDeduplicationState.Failed,
        ttl,
      );
      throw error;
    }
  }
}
