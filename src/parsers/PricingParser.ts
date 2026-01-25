import { App, TFile } from 'obsidian';
import { PriceSnapshot } from '../models/Trip';

export class PricingParser {
    constructor(private app: App) {}

    async parseAll(folderPath: string): Promise<PriceSnapshot[]> {
        const results: PriceSnapshot[] = [];
        const files = this.app.vault.getMarkdownFiles().filter(f =>
            f.path.startsWith(folderPath) &&
            (f.basename.includes('flights') || f.basename.includes('hotels'))
        );

        for (const file of files) {
            const data = await this.parse(file);
            if (data) results.push(data);
        }

        return results;
    }

    async parse(file: TFile): Promise<PriceSnapshot | null> {
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;
        const content = await this.app.vault.read(file);

        const destination = frontmatter?.destination || this.extractDestinationFromFilename(file.basename);
        const route = frontmatter?.route || this.extractRoute(content);
        const pricePerPerson = this.extractCurrentPrice(content);
        const travelers = frontmatter?.travelers || this.extractTravelers(content) || 1;
        const captureDate = frontmatter?.date || this.extractLatestDate(content);
        const trend = this.determineTrend(content);
        const status = this.determineStatus(content, pricePerPerson);

        if (!pricePerPerson) return null;

        const daysSinceCapture = this.calculateDaysSince(captureDate);

        return {
            destination,
            route,
            pricePerPerson,
            totalForGroup: pricePerPerson * travelers,
            travelers,
            captureDate,
            daysSinceCapture,
            trend,
            status,
            sourcePath: file.path,
        };
    }

    private extractDestinationFromFilename(basename: string): string {
        // peru-flights-2026-01 -> Peru
        const match = basename.match(/^([a-z-]+)-(?:flights|hotels)/i);
        if (match) {
            return match[1].split('-').map(w =>
                w.charAt(0).toUpperCase() + w.slice(1)
            ).join(' ');
        }
        return basename;
    }

    private extractRoute(content: string): string {
        // Look for route patterns like "SLC-LIM" or "SLC → LIM"
        const match = content.match(/([A-Z]{3})\s*[-→]\s*([A-Z]{3})/);
        return match ? `${match[1]}-${match[2]}` : '';
    }

    private extractCurrentPrice(content: string): number {
        // Look for current price patterns
        const patterns = [
            /current[:\s]+\$?([\d,]+)/i,
            /price[:\s]+\$?([\d,]+)/i,
            /\$?([\d,]+)\s*\/\s*person/i,
            /\$?([\d,]+)\s*per\s*person/i,
            /baseline[:\s]+\$?([\d,]+)/i,
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                return parseInt(match[1].replace(/,/g, ''), 10);
            }
        }

        // Try to find price in a table
        const tableMatch = content.match(/\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*\$?([\d,]+)/);
        if (tableMatch) {
            return parseInt(tableMatch[1].replace(/,/g, ''), 10);
        }

        return 0;
    }

    private extractTravelers(content: string): number {
        const match = content.match(/(\d+)\s*travelers?/i);
        return match ? parseInt(match[1], 10) : 1;
    }

    private extractLatestDate(content: string): string {
        // Find most recent date in YYYY-MM-DD format
        const dates = content.match(/\d{4}-\d{2}-\d{2}/g) || [];
        if (dates.length === 0) return '';
        return dates.sort().reverse()[0];
    }

    private calculateDaysSince(dateStr: string): number {
        if (!dateStr) return 999;
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    private determineTrend(content: string): PriceSnapshot['trend'] {
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('↗') || lowerContent.includes('rising') || lowerContent.includes('increasing')) {
            return 'rising';
        }
        if (lowerContent.includes('↘') || lowerContent.includes('falling') || lowerContent.includes('decreasing')) {
            return 'falling';
        }
        if (lowerContent.includes('stable') || lowerContent.includes('steady')) {
            return 'stable';
        }
        return 'unknown';
    }

    private determineStatus(content: string, price: number): PriceSnapshot['status'] {
        // Try to find alert thresholds
        const greatDealMatch = content.match(/great\s*deal[:\s<]+\$?([\d,]+)/i);
        const goodPriceMatch = content.match(/good\s*price[:\s<]+\$?([\d,]+)/i);
        const highMatch = content.match(/high[:\s>]+\$?([\d,]+)/i);

        if (greatDealMatch) {
            const threshold = parseInt(greatDealMatch[1].replace(/,/g, ''), 10);
            if (price < threshold) return 'great-deal';
        }
        if (goodPriceMatch) {
            const threshold = parseInt(goodPriceMatch[1].replace(/,/g, ''), 10);
            if (price < threshold) return 'good-price';
        }
        if (highMatch) {
            const threshold = parseInt(highMatch[1].replace(/,/g, ''), 10);
            if (price > threshold) return 'high';
        }

        return 'normal';
    }
}
