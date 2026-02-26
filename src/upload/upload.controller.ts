import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AiService } from '../ai/ai.service';
import { QuotationService } from '../quotation/quotation.service';
import { Quotation } from '../quotation/quotation.interface';

// pdf-parse doesn't have official types — require it
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buf: Buffer,
) => Promise<{ text: string }>;

@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly aiService: AiService,
    private readonly quotationService: QuotationService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('text') bodyText: string | undefined,
  ): Promise<Quotation> {
    let documentText = '';

    if (file) {
      const mimetype = file.mimetype;
      const originalName = file.originalname.toLowerCase();

      if (
        mimetype === 'application/pdf' ||
        originalName.endsWith('.pdf')
      ) {
        try {
          const parsed = await pdfParse(file.buffer);
          documentText = parsed.text;
        } catch (err) {
          this.logger.error('PDF parsing failed', err);
          throw new BadRequestException('Failed to parse PDF file');
        }
      } else {
        // Plain text or other text-based file
        documentText = file.buffer.toString('utf-8');
      }
    } else if (bodyText && bodyText.trim()) {
      documentText = bodyText.trim();
    } else {
      throw new BadRequestException(
        'Provide either a file upload or a "text" field in the request body',
      );
    }

    this.logger.log(`Processing document (${documentText.length} chars)`);

    // Step 1: AI extraction
    const extraction = await this.aiService.extractItems(documentText);
    this.logger.log(`Extracted ${extraction.items.length} item(s) from document`);

    if (extraction.items.length === 0) {
      throw new BadRequestException(
        'No product items could be extracted from the document',
      );
    }

    // Step 2: Build quotation
    const quotation = this.quotationService.createFromExtractedItems(
      extraction.items,
    );

    this.logger.log(`Quotation created: ${quotation.id}`);
    return quotation;
  }
}

