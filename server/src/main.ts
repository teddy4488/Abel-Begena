import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as dns from 'dns';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
dotenv.config();

// Opt-in DNS override: some networks (corporate/VPN resolvers) refuse SRV queries,
// which breaks `mongodb+srv://` lookups. Set DNS_SERVERS=8.8.8.8,1.1.1.1 to route
// Node's resolver through a public DNS. No effect when unset (e.g. production).
if (process.env.DNS_SERVERS) {
  dns.setServers(
    process.env.DNS_SERVERS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());

  app.use(cookieParser());
  app.use(helmet());
  // Let Express know it's running behind a proxy (Render) so secure cookies
  // are respected when we set SameSite=None cookies.
  const httpAdapter = app.getHttpAdapter();
  const instance: unknown = httpAdapter.getInstance?.();
  if (instance && typeof (instance as any).set === 'function') {
    (instance as any).set('trust proxy', 1);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://abelbegena.vercel.app',
    'https://abel-begena.vercel.app',
    'https://www.abelbegena.com',
  ];
  const envOrigins = process.env.FRONTEND_URI
    ?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const origins = envOrigins && envOrigins.length ? envOrigins : defaultOrigins;

  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  if ((process.env.ENABLE_SWAGGER ?? 'false') === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Abel Begena API')
      .setDescription('Backend API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim() === '' || jwtSecret.toLowerCase().includes('development')) {
      throw new Error('JWT_SECRET is missing, empty, or insecure. Set a strong JWT_SECRET before running in production.');
    }
  }

  await app.listen(process.env.PORT || 4001);
}
void bootstrap();
