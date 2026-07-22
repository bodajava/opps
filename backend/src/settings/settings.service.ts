import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  StoreSetting,
  StoreSettingDocument,
} from './schemas/store-setting.schema';
import type { SettingValue } from './types/setting-value.type';

const SUPPORTED_CURRENCIES: readonly string[] = ['EGP', 'USD', 'EUR'];

const VALIDATORS: Record<string, (value: SettingValue) => string | null> = {
  currency: (v) => {
    if (typeof v !== 'string') return 'Currency must be a string';
    return SUPPORTED_CURRENCIES.some((currency) => currency === v)
      ? null
      : `Unsupported currency code: ${v}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}`;
  },
  minimum_order_value: (v) => {
    if (typeof v !== 'number' || v < 0)
      return 'Minimum order value must be a non-negative number';
    return null;
  },
  store_name: (v) => {
    if (typeof v !== 'string') return 'Store name must be a string';
    return null;
  },
  store_description: (v) => {
    if (typeof v !== 'string') return 'Store description must be a string';
    return null;
  },
  currency_symbol: (v) => {
    if (typeof v !== 'string') return 'Currency symbol must be a string';
    return null;
  },
  contact_email: (v) => {
    if (typeof v !== 'string') return 'Contact email must be a string';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Invalid email format';
    return null;
  },
  contact_phone: (v) => {
    if (typeof v !== 'string') return 'Contact phone must be a string';
    return null;
  },
  business_hours: (v) => {
    if (typeof v !== 'string') return 'Business hours must be a string';
    return null;
  },
  delivery_note: (v) => {
    if (typeof v !== 'string') return 'Delivery note must be a string';
    return null;
  },
  maintenance_mode: (v) => {
    if (typeof v !== 'boolean') return 'Maintenance mode must be a boolean';
    return null;
  },
};

function validateSettingValue(key: string, value: SettingValue): void {
  const validator = VALIDATORS[key];
  if (validator) {
    const error = validator(value);
    if (error) {
      throw new BadRequestException(`Invalid setting "${key}": ${error}`);
    }
  }
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(StoreSetting.name)
    private readonly storeSettingModel: Model<StoreSettingDocument>,
  ) {}

  async get(key: string): Promise<StoreSettingDocument | null> {
    return this.storeSettingModel.findOne({ key }).exec();
  }

  async getAll(group?: string) {
    const filter = group ? { group } : {};
    return this.storeSettingModel.find(filter).sort({ key: 1 }).exec();
  }

  async set(
    key: string,
    value: SettingValue,
    group?: string,
    description?: string,
  ): Promise<StoreSettingDocument> {
    validateSettingValue(key, value);
    const setting = await this.storeSettingModel
      .findOneAndUpdate(
        { key },
        { $set: { value, group, description } },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
    return setting;
  }

  async delete(key: string) {
    const result = await this.storeSettingModel
      .findOneAndDelete({ key })
      .exec();
    if (!result) {
      throw new NotFoundException(`Setting "${key}" not found`);
    }
    return { deleted: true };
  }

  async getStoreSettings() {
    const settings = await this.storeSettingModel.find().exec();
    const result: Record<string, SettingValue> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    return result;
  }
}
