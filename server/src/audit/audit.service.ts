import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

export interface CreateAuditLogDto {
  adminId: string;
  action: string;
  resource: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export interface FindRecentOptions {
  limit?: number;
  offset?: number;
  adminId?: string;
  resource?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  async log(dto: CreateAuditLogDto) {
    const doc = await this.auditModel.create({
      adminId: new Types.ObjectId(dto.adminId),
      action: dto.action,
      resource: dto.resource,
      resourceId: dto.resourceId,
      payload: dto.payload,
      ip: dto.ip,
      userAgent: dto.userAgent,
      timestamp: new Date(),
    });
    return doc.toObject();
  }

  async findRecent(options: FindRecentOptions = {}) {
    const { limit = 50, offset = 0, adminId, resource, from, to } = options;
    const filter: Record<string, unknown> = {};
    if (adminId) filter.adminId = new Types.ObjectId(adminId);
    if (resource) filter.resource = resource;
    if (from || to) {
      filter.timestamp = {};
      if (from) (filter.timestamp as Record<string, Date>).$gte = from;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        (filter.timestamp as Record<string, Date>).$lte = end;
      }
    }
    const [items, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .populate('adminId', 'email firstName lastName')
        .lean()
        .exec(),
      this.auditModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }

  async exportCsv(options: { from?: Date; to?: Date; adminId?: string } = {}) {
    const filter: Record<string, unknown> = {};
    if (options.adminId) filter.adminId = new Types.ObjectId(options.adminId);
    if (options.from || options.to) {
      filter.timestamp = {};
      if (options.from) (filter.timestamp as Record<string, Date>).$gte = options.from;
      if (options.to) {
        const end = new Date(options.to);
        end.setHours(23, 59, 59, 999);
        (filter.timestamp as Record<string, Date>).$lte = end;
      }
    }
    const logs = await this.auditModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(10000)
      .populate('adminId', 'email firstName lastName')
      .lean()
      .exec();
    const header = 'timestamp,adminId,adminEmail,action,resource,resourceId,ip,userAgent';
    const rows = logs.map((log: any) => {
      const admin = log.adminId;
      const email = admin?.email ?? (log.adminId?.toString?.() ?? '');
      const escaped = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      };
      return [
        log.timestamp?.toISOString?.() ?? '',
        log.adminId?.toString?.() ?? '',
        email,
        escaped(log.action),
        escaped(log.resource),
        escaped(log.resourceId),
        escaped(log.ip),
        escaped(log.userAgent),
      ].join(',');
    });
    return header + '\n' + rows.join('\n');
  }
}
