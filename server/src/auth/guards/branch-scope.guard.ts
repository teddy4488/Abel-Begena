import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

export type RequestWithBranch = Request & {
  user?: { sub?: string; role?: string; branchId?: string };
  branchId?: string;
};

/**
 * Attaches branchId to request when user is Admin with branchId (Phase 5.3).
 * Services can use request.branchId to filter data by branch.
 * SuperAdmin has no branchId and sees all data.
 */
@Injectable()
export class BranchScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithBranch>();
    const user = request.user;

    if (user?.role === 'Admin' && user.branchId) {
      request.branchId = user.branchId;
    }

    return true;
  }
}

/** Helper: return filter for branch-scoped queries. SuperAdmin (no branchId) sees all. */
export function getBranchFilter(user: { role?: string; branchId?: string } | undefined): { branchId?: string } {
  if (user?.role === 'Admin' && user.branchId) {
    return { branchId: user.branchId };
  }
  return {};
}
