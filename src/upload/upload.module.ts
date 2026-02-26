import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { AiModule } from '../ai/ai.module';
import { QuotationModule } from '../quotation/quotation.module';

@Module({
  imports: [AiModule, QuotationModule],
  controllers: [UploadController],
})
export class UploadModule {}

