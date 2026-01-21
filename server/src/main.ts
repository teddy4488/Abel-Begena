import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.use(helmet());
  // Let Express know it's running behind Render's proxy so secure cookies
  // are respected when we set SameSite=None cookies.
  app.set('trust proxy', 1);

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

  if ((process.env.ENABLE_SWAGGER ?? 'true') === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Abel Begena API')
      .setDescription('Backend API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(process.env.PORT || 4001);
}
void bootstrap();
