import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider } from '../common/interfaces/payment-provider.interface';
import { CodProvider } from './providers/cod.provider';
import { PaymobProvider } from './providers/paymob.provider';
import { FawryProvider } from './providers/fawry.provider';
import { ManualWalletProvider } from './providers/manual-wallet.provider';

@Injectable()
export class PaymentRegistryService {
  private readonly logger = new Logger(PaymentRegistryService.name);
  private readonly providers = new Map<string, PaymentProvider>();
  private readonly defaultProvider: string;

  constructor(
    private readonly codProvider: CodProvider,
    private readonly paymobProvider: PaymobProvider,
    private readonly fawryProvider: FawryProvider,
    private readonly manualWalletProvider: ManualWalletProvider,
  ) {
    this.registerProvider('cod', this.codProvider);
    this.registerProvider('paymob', this.paymobProvider);
    this.registerProvider('fawry', this.fawryProvider);
    this.registerProvider('manual_wallet', this.manualWalletProvider);
    this.defaultProvider = 'cod';
  }

  registerProvider(name: string, provider: PaymentProvider): void {
    this.providers.set(name, provider);
    this.logger.log(`Payment provider registered: ${name}`);
  }

  getProvider(name: string): PaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Payment provider "${name}" not found`);
    }
    return provider;
  }

  getDefaultProvider(): PaymentProvider {
    return this.getProvider(this.defaultProvider);
  }

  getAvailableMethods(): string[] {
    return Array.from(this.providers.keys());
  }
}
