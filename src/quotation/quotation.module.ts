import { Module } from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { QuotationController } from './quotation.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  providers: [QuotationService],
  controllers: [QuotationController],
  exports: [QuotationService],
})
export class QuotationModule {}

