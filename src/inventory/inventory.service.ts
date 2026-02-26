import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  material: string;
  color: string;
  basePrice: number;
  currency: string;
  availableStock: number;
  image?: string;
}

@Injectable()
export class InventoryService {
  private readonly inventoryPath = path.join(
    process.cwd(),
    'src/data/inventory.json',
  );

  getAll(): InventoryItem[] {
    const raw = fs.readFileSync(this.inventoryPath, 'utf-8');
    return JSON.parse(raw) as InventoryItem[];
  }

  findByName(name: string): InventoryItem | undefined {
    const inventory = this.getAll();
    const lowerName = name.toLowerCase();

    // 1. Exact name match
    const exactMatch = inventory.find(
      (item) => item.name.toLowerCase() === lowerName,
    );
    if (exactMatch) return exactMatch;

    // 2. Partial name match (either side contains the other)
    return inventory.find(
      (item) =>
        item.name.toLowerCase().includes(lowerName) ||
        lowerName.includes(item.name.toLowerCase()),
    );
  }

  /**
   * Parse a dimension string like "300x120x75 cm" or "300x120x75"
   * and find an inventory item whose dimensions match.
   */
  findByDimensions(dimensionStr: string): InventoryItem | undefined {
    // Extract numbers from the string, e.g. "300x120x75 cm" → [300, 120, 75]
    const numbers = dimensionStr
      .replace(/cm|mm|in/gi, '')
      .split(/[x×,\s]+/)
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n));

    if (numbers.length < 3) return undefined;

    const [w, d, h] = numbers;
    const inventory = this.getAll();

    return inventory.find(
      (item) =>
        item.dimensions.width === w &&
        item.dimensions.depth === d &&
        item.dimensions.height === h,
    );
  }
}

