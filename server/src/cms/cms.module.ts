import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CmsService } from './cms.service';
import { CmsController } from './cms.controller';
import {
  ContentBlock,
  ContentBlockSchema,
} from './schemas/content-block.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContentBlock.name, schema: ContentBlockSchema },
    ]),
  ],
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
