import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter } from '../schemas/counter.schema';

@Injectable()
export class OrderNumberHelper {
  constructor(
    @InjectModel(Counter.name) private readonly counterModel: Model<Counter>,
  ) {}

  async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear().toString();

    const counter = await this.counterModel.findOneAndUpdate(
      { name: `order_${year}` },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true },
    );

    const seq = String(counter.seq).padStart(6, '0');
    return `OPPS-${year}-${seq}`;
  }
}
