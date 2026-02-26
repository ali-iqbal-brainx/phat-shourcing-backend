import { Controller, Get, Param, Post } from '@nestjs/common';
import { QuotationService } from './quotation.service';
import type { Quotation } from './quotation.interface';

@Controller('quotations')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Get()
  findAll(): Quotation[] {
    return this.quotationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Quotation {
    return this.quotationService.findOne(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string): Quotation {
    return this.quotationService.updateStatus(id, 'APPROVED');
  }

  @Post(':id/reject')
  reject(@Param('id') id: string): Quotation {
    return this.quotationService.updateStatus(id, 'REJECTED');
  }
}

