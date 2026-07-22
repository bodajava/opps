import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true, collection: 'roles' })
export class Role {
  @Prop({
    required: true,
    unique: true,
    enum: [
      'super_admin',
      'admin',
      'order_manager',
      'product_manager',
      'inventory_manager',
      'finance_viewer',
      'support_agent',
      'customer',
    ],
  })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: false })
  isSystem: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
