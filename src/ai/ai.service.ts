import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface ExtractedItem {
  name: string;
  quantity: number;
  dimensions?: string;
}

export interface AIExtractionResult {
  items: ExtractedItem[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log(`OpenAI client initialized with model: ${this.model}`);
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not set — using mock fallback parser',
      );
    }
  }

  async extractItems(documentText: string): Promise<AIExtractionResult> {
    if (this.openai) {
      try {
        return await this.extractWithOpenAI(documentText);
      } catch (err) {
        this.logger.error('OpenAI extraction failed, falling back to mock', err);
        return this.extractWithMock(documentText);
      }
    }
    return this.extractWithMock(documentText);
  }

  private async extractWithOpenAI(text: string): Promise<AIExtractionResult> {
    const prompt = `You are a procurement assistant. Analyze the following requirement document and extract a list of products/items requested.

Return ONLY a valid JSON object in this exact format (no markdown, no explanation):
{
  "items": [
    {
      "name": "product name",
      "quantity": number,
      "dimensions": "WxDxH cm"
    }
  ]
}

Rules:
- Extract product name, quantity, and dimensions.
- If quantity is not specified, default to 1.
- Be precise with product names.

Document:
"""
${text}
"""`;

    const response = await this.openai!.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content ?? '{"items":[]}';
    const parsed = JSON.parse(content) as AIExtractionResult;
    return parsed;
  }

  /**
   * Mock fallback parser.
   * Handles sentences like:
   *   "We need 5 Executive Office Desk and 10 Ergonomic Office Chair."
   *   "Please provide 3 Conference Table Large (300x120x75 cm)."
   */
  private extractWithMock(text: string): AIExtractionResult {
    const items: ExtractedItem[] = [];
    const lines = text.split(/[\n.]+/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Pattern: number followed by product name
      // e.g. "5 Executive Office Desk" or "need 5 Executive Office Desk"
      const matches = trimmed.matchAll(/(\d+)\s+([A-Za-z][A-Za-z\s]+?)(?:\s*\(([^)]+)\))?(?=\s+and\s|\s*[,.]|$)/gi);

      for (const match of matches) {
        const quantity = parseInt(match[1], 10);
        const name = match[2].trim();
        const dimensions = match[3]?.trim();

        if (name.length > 2) {
          items.push({
            name,
            quantity,
            ...(dimensions ? { dimensions } : {}),
          });
        }
      }
    }

    // Deduplicate by name (case-insensitive)
    const seen = new Set<string>();
    const unique: ExtractedItem[] = [];
    for (const item of items) {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    this.logger.log(`Mock parser extracted ${unique.length} item(s)`);
    return { items: unique };
  }
}

