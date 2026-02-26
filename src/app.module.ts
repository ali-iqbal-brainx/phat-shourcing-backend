import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InventoryModule } from './inventory/inventory.module';
import { AiModule } from './ai/ai.module';
import { QuotationModule } from './quotation/quotation.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    InventoryModule,
    AiModule,
    QuotationModule,
    UploadModule,
  ],
})
export class AppModule {}
