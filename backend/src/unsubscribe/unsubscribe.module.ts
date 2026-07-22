import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UnsubscribeController } from './unsubscribe.controller';
import { UnsubscribeService } from './unsubscribe.service';
import {
  UnsubscribeToken,
  UnsubscribeTokenSchema,
} from './schemas/unsubscribe-token.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UnsubscribeTokenService } from '../common/services/unsubscribe.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UnsubscribeToken.name, schema: UnsubscribeTokenSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [UnsubscribeController],
  providers: [UnsubscribeService, UnsubscribeTokenService],
  exports: [UnsubscribeService],
})
export class UnsubscribeModule {}
