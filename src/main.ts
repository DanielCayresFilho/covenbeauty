import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // bodyParser: false → registramos os parsers com limite de tamanho.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get(ConfigService);
  const isProd = config.get<string>('NODE_ENV') === 'production';

  const apiPrefix = config.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  const swaggerEnabled =
    config.get<string>('SWAGGER_ENABLED') === 'true' || !isProd;

  // ── Segurança ──
  // CSP desligado quando o Swagger está ativo (a UI usa scripts inline);
  // como o Swagger só roda fora de produção, a API em produção mantém a CSP.
  app.use(helmet({ contentSecurityPolicy: swaggerEnabled ? false : undefined }));

  // Confia no proxy reverso (IP real do cliente para o rate limit) quando atrás de um.
  if (['1', 'true'].includes(config.get<string>('TRUST_PROXY', ''))) {
    app.set('trust proxy', 1);
  }

  // Limite de payload (mitiga DoS por corpo grande; base64 de assinatura cabe em 2mb).
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  // CORS por allowlist (env CORS_ORIGINS separada por vírgula). Sem valor: reflete (dev).
  const corsOrigins = config.get<string>('CORS_ORIGINS');
  app.enableCors({
    origin: corsOrigins
      ? corsOrigins.split(',').map((o) => o.trim())
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  if (isProd && !corsOrigins) {
    console.warn(
      '⚠️  CORS_ORIGINS não definido em produção — recomendável restringir as origens.',
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos não declarados nos DTOs
      forbidNonWhitelisted: true, // rejeita corpos com campos extras
      forbidUnknownValues: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // ── Swagger só fora de produção (ou via SWAGGER_ENABLED=true) ──
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Coven Beauty API')
      .setDescription('Backend do salão de beleza e estética místico Coven Beauty')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  const url = await app.getUrl();
  console.log(`🌙 Coven Beauty API rodando em ${url}/${apiPrefix}`);
  if (swaggerEnabled) {
    console.log(`📖 Swagger em ${url}/${apiPrefix}/docs`);
  }
}

void bootstrap();
