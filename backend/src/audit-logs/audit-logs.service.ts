import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(
    action: string,
    entity: string,
    entityId: string,
    performedBy?: string,
    performedByEmail?: string,
    performedByName?: string,
    previousValues?: DynamicRecord,
    newValues?: DynamicRecord,
    ip?: string,
    userAgent?: string,
    metadata?: DynamicRecord,
  ) {
    const entry = await this.auditLogModel.create({
      action,
      entity,
      entityId,
      performedBy: performedBy ?? undefined,
      performedByEmail,
      performedByName,
      previousValues,
      newValues,
      ip,
      userAgent,
      metadata,
    });

    this.logger.debug(`Audit log: ${action} on ${entity}(${entityId})`);
    return entry;
  }

  async findAll(query: QueryAuditLogsDto) {
    const {
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
      action,
      entity,
      entityId,
      performedBy,
      dateFrom,
      dateTo,
    } = query;

    const filter: DynamicRecord = {};

    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (entityId) filter.entityId = entityId;
    if (performedBy) filter.performedBy = performedBy;

    if (dateFrom || dateTo) {
      const createdAtFilter: Record<string, Date> = {};
      if (dateFrom) createdAtFilter.$gte = new Date(dateFrom);
      if (dateTo) createdAtFilter.$lte = new Date(dateTo);
      filter.createdAt = createdAtFilter;
    }

    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('performedBy', 'fullName email')
        .exec(),
      this.auditLogModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const log = await this.auditLogModel
      .findById(id)
      .populate('performedBy', 'fullName email')
      .exec();

    if (!log) {
      throw new NotFoundException(`Audit log with id "${id}" not found`);
    }

    return log;
  }

  async getRecent(limit = 50) {
    return this.auditLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('performedBy', 'fullName email')
      .exec();
  }

  async getByEntity(entity: string, entityId: string) {
    return this.auditLogModel
      .find({ entity, entityId })
      .sort({ createdAt: -1 })
      .populate('performedBy', 'fullName email')
      .exec();
  }
}
