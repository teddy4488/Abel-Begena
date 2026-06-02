import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

type JwtPayload = {
  sub: string;
  role: string;
  userType?: 'website_user' | 'teacher' | 'admin' | 'student';
  branchId?: string;
  exp?: number;
  iat?: number;
};

type JwtRequest = {
  headers?: { authorization?: string };
  cookies?: Record<string, string | undefined>;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const cookieExtractor = (req: JwtRequest): string | null =>
      req.cookies?.access_token ?? null;

    const bearerExtractor = (req: JwtRequest): string | null => {
      const authHeader = req.headers?.authorization;
      if (!authHeader) {
        return null;
      }
      const [scheme, token] = authHeader.split(' ');
      if ((scheme ?? '').toLowerCase() !== 'bearer') {
        return null;
      }
      return token ?? null;
    };

    const jwtFromRequest = (req: unknown) => {
      const typedRequest = req as JwtRequest;
      return cookieExtractor(typedRequest) ?? bearerExtractor(typedRequest);
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      jwtFromRequest,
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  validate(payload: JwtPayload) {
    return payload;
  }
}
