import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ required: true, index: true })
  action: string;

  @Prop({ index: true })
  entity?: string;

  @Prop({ index: true })
  entityId?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  })
  performedBy?: string;

  @Prop()
  performedByEmail?: string;

  @Prop()
  performedByName?: string;

  @Prop({ type: Object })
  previousValues?: DynamicRecord;

  @Prop({ type: Object })
  newValues?: DynamicRecord;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  metadata?: DynamicRecord;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ createdAt: -1 });
