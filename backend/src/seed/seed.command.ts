import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SeedModuleRoot } from './seed.module';
import { SeedService } from './seed.service';

export class SeedCommand {
  static async run() {
    const logger = new Logger('SeedCommand');
    logger.log('Starting seed process...');

    const mongodbUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/opps';

    const app = await NestFactory.createApplicationContext(
      SeedModuleRoot.forRoot(mongodbUri),
    );
    const seedService = app.get(SeedService);

    try {
      await seedService.seed();
      logger.log('Seed completed successfully');
    } catch (error) {
      logger.error('Seed failed', error);
      process.exit(1);
    } finally {
      await app.close();
      process.exit(0);
    }
  }
}

if (require.main === module) {
  void SeedCommand.run();
}
