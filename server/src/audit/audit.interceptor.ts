import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AUDIT_LOG_KEY, AuditLogOptions } from './decorators/audit-log.decorator';

type RequestWithUser = Request & {
  user?: { sub?: string; role?: string };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        this.logAfterSuccess(context);
      }),
    );
  }

  private logAfterSuccess(context: ExecutionContext) {
    const options = this.reflector.get<AuditLogOptions | undefined>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );
    if (!options) return;

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req?.user;
    if (!user || user.role !== 'Admin') return;

    const adminId = user.sub;
    if (!adminId) return;

    let resourceId = options.resourceIdParam
      ? (req.params?.[options.resourceIdParam] as string | undefined)
      : undefined;
    if (!resourceId && options.resourceIdBody) {
      const body = req.body as Record<string, unknown>;
      resourceId = body?.[options.resourceIdBody] as string | undefined;
    }
    if (!resourceId && req.params?.id) resourceId = req.params.id;

    const ip = (req as Request & { ip?: string }).ip ?? req.socket?.remoteAddress;
    const userAgent = req.get?.('user-agent');

    void this.auditService
      .log({
        adminId,
        action: options.action,
        resource: options.resource,
        resourceId,
        payload: this.sanitizePayload(req.body),
        ip,
        userAgent,
      })
      .catch(() => {});
  }

  private sanitizePayload(body: unknown): Record<string, unknown> | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const o = body as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const keys = ['status', 'id', 'reason', 'note', 'isPaid'];
    for (const k of keys) {
      if (k in o) out[k] = o[k];
    }
    return Object.keys(out).length ? out : undefined;
  }
}
