import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);
  const logger = new Logger('Bootstrap');

  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const port = configService.get<number>('app.port', 4001);
  const corsOrigins = configService.get<string[]>('app.corsOrigins', [
    'http://localhost:3000',
  ]);
  const swaggerEnabled = configService.get<boolean>('app.swaggerEnabled', true);
  const swaggerPath = configService.get<string>('app.swaggerPath', 'docs');
  const appName = configService.get<string>('app.appName', 'opps');
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.use(helmet());
  app.use(cookieParser(configService.get<string>('app.cookieSecret')));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(`${appName} API`)
      .setDescription(`The ${appName} e-commerce API documentation`)
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document);
    logger.log(`Swagger documentation available at /${swaggerPath}`);
  }

  await app.listen(port);
  logger.log(`Server running on port ${port} in ${nodeEnv} mode`);
  logger.log(`API base URL: http://localhost:${port}/${apiPrefix}`);
}

void bootstrap();
