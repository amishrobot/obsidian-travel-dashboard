import { App, TFile } from 'obsidian';
import { Deal } from '../models/Trip';

export class DealsParser {
    constructor(private app: App) {}

    async parse(filePath: string): Promise<Deal[]> {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!file || !(file instanceof TFile)) return [];

        const content = await this.app.vault.read(file);
        return this.parseDestinationIntelligence(content);
    }

    parseDestinationIntelligence(content: string): Deal[] {
        const deals: Deal[] = [];

        // Look for the quick reference table
        const tableMatch = content.match(/\|[^\n]*Destination[^\n]*\|([\s\S]*?)(?=\n\n|\n##|$)/i);
        if (!tableMatch) return deals;

        const tableContent = tableMatch[0];
        const rows = tableContent.split('\n').filter(row =>
            row.includes('|') && !row.includes('---') && !row.includes('Destination')
        );

        for (const row of rows) {
            const cells = row.split('|').map(c => c.trim()).filter(c => c);
            if (cells.length < 5) continue;

            // Parse row: | Code | Destination | Best Months | Type | Typical RT | Deal |
            const destination = cells[1] || cells[0];
            const bestMonths = cells[2] || '';
            const tripType = cells[3] || '';
            const typicalPrice = this.parsePrice(cells[4] || '');
            const dealThreshold = this.parsePrice(cells[5] || '');

            if (destination && destination.length > 1) {
                deals.push({
                    destination,
                    emoji: this.getSeasonEmoji(bestMonths),
                    season: this.getSeason(bestMonths),
                    bestMonths,
                    typicalPrice,
                    dealThreshold,
                    tripType,
                });
            }
        }

        return deals;
    }

    private parsePrice(priceStr: string): number {
        const match = priceStr.match(/\$?([\d,]+)/);
        return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
    }

    private getSeasonEmoji(months: string): string {
        const m = months.toLowerCase();
        if (m.includes('mar') || m.includes('apr') || m.includes('may')) return '🌸';
        if (m.includes('jun') || m.includes('jul') || m.includes('aug')) return '☀️';
        if (m.includes('sep') || m.includes('oct') || m.includes('nov')) return '🍂';
        if (m.includes('dec') || m.includes('jan') || m.includes('feb')) return '❄️';
        return '🌍';
    }

    private getSeason(months: string): string {
        const m = months.toLowerCase();
        if (m.includes('mar') || m.includes('apr') || m.includes('may')) return 'Spring';
        if (m.includes('jun') || m.includes('jul') || m.includes('aug')) return 'Summer';
        if (m.includes('sep') || m.includes('oct') || m.includes('nov')) return 'Fall';
        if (m.includes('dec') || m.includes('jan') || m.includes('feb')) return 'Winter';
        return 'Year-round';
    }

    getCurrentSeasonDeals(deals: Deal[]): Deal[] {
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-11
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

        // Include current month and next 2 months
        const relevantMonths = [
            monthNames[currentMonth],
            monthNames[(currentMonth + 1) % 12],
            monthNames[(currentMonth + 2) % 12],
        ];

        return deals.filter(deal => {
            const bestMonthsLower = deal.bestMonths.toLowerCase();
            return relevantMonths.some(m => bestMonthsLower.includes(m));
        });
    }
}
