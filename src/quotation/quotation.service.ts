import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { InventoryService } from '../inventory/inventory.service';
import { ExtractedItem } from '../ai/ai.service';
import {
  Quotation,
  QuotationItem,
  QuotationStatus,
} from './quotation.interface';

@Injectable()
export class QuotationService {
  private readonly quotationsPath = path.join(
    process.cwd(),
    'src/data/quotations.json',
  );

  constructor(private readonly inventoryService: InventoryService) { }

  // ── Persistence helpers ────────────────────────────────────────────────

  private readAll(): Quotation[] {
    try {
      const raw = fs.readFileSync(this.quotationsPath, 'utf-8');
      return JSON.parse(raw) as Quotation[];
    } catch {
      return [];
    }
  }

  private writeAll(quotations: Quotation[]): void {
    fs.writeFileSync(
      this.quotationsPath,
      JSON.stringify(quotations, null, 2),
      'utf-8',
    );
  }

  // ── Core logic ─────────────────────────────────────────────────────────

  createFromExtractedItems(extractedItems: ExtractedItem[]): Quotation {
    const items: QuotationItem[] = extractedItems.map((extracted) => {
      // 1. Try matching by name first
      let inventoryItem = this.inventoryService.findByName(extracted.name);

      // 2. Fallback: match by dimensions if name lookup failed and dimensions are provided
      if (!inventoryItem && extracted.dimensions) {
        inventoryItem = this.inventoryService.findByDimensions(
          extracted.dimensions,
        );
      }

      if (inventoryItem) {
        const totalPrice = extracted.quantity * inventoryItem.basePrice;
        const apiBase = `http://localhost:${process.env.PORT ?? 4000}`;
        // Always build dimensions from the inventory record
        const { width, depth, height } = inventoryItem.dimensions;
        const dimensions = `${width}x${depth}x${height} cm`;
        return {
          productId: inventoryItem.id,
          name: inventoryItem.name,
          quantity: extracted.quantity,
          unitPrice: inventoryItem.basePrice,
          totalPrice,
          dimensions,
          ...(inventoryItem.image
            ? { image: `${apiBase}/${inventoryItem.image}` }
            : {}),
          status: 'AVAILABLE',
        };
      }

      return {
        name: extracted.name,
        quantity: extracted.quantity,
        // For NOT_IN_INVENTORY keep whatever was extracted from the document
        ...(extracted.dimensions ? { dimensions: extracted.dimensions } : {}),
        status: 'NOT_IN_INVENTORY',
      };
    });

    const totalAmount = items
      .filter((i) => i.status === 'AVAILABLE')
      .reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);

    const now = new Date().toISOString();
    const quotation: Quotation = {
      id: uuidv4(),
      status: 'PENDING_REVIEW',
      items,
      totalAmount,
      createdAt: now,
      updatedAt: now,
    };

    const all = this.readAll();
    all.push(quotation);
    this.writeAll(all);

    return quotation;
  }

  findAll(): Quotation[] {
    return this.readAll();
  }

  findOne(id: string): Quotation {
    const quotation = this.readAll().find((q) => q.id === id);
    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }
    return quotation;
  }

  updateStatus(id: string, status: QuotationStatus): Quotation {
    const all = this.readAll();
    const index = all.findIndex((q) => q.id === id);
    if (index === -1) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }
    all[index].status = status;
    all[index].updatedAt = new Date().toISOString();
    this.writeAll(all);
    return all[index];
  }
}

