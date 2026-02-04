import { App, TFile } from 'obsidian';
import { Deal, DiscoveredDeal } from '../models/Trip';

export class DealsParser {
    constructor(private app: App) {}

    async parseDiscoveredDeals(inboxPath: string): Promise<DiscoveredDeal[]> {
        // Find the most recent flight-deal-alert file in inbox
        const inboxFolder = this.app.vault.getAbstractFileByPath(inboxPath);
        if (!inboxFolder) return [];

        const files = this.app.vault.getFiles()
            .filter(f => f.path.startsWith(inboxPath) && f.name.includes('flight-deal-alert'))
            .sort((a, b) => b.stat.mtime - a.stat.mtime);

        if (files.length === 0) return [];

        const latestAlert = files[0];
        const content = await this.app.vault.read(latestAlert);

        return this.parseAlertContent(content, latestAlert.name);
    }

    private parseAlertContent(content: string, filename: string): DiscoveredDeal[] {
        const deals: DiscoveredDeal[] = [];

        // Extract date from filename (e.g., "2026-01-24-flight-deal-alert.md")
        const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
        const alertDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

        // Find the "Great Deals Found" section - handle multiple formats
        // Format 1: "## 🟢 Great Deals Found"
        // Format 2: "## Great Deals Found (>20% off typical)"
        const greatDealsSection = content.match(/## (?:🟢\s*)?Great Deals Found[^\n]*[\s\S]*?(?=\n## (?:🎆|All|Asia|Good|Best|\d)|---\s*$|$)/i);
        if (!greatDealsSection) return deals;

        // Split into individual deal blocks by ### headers
        // Format: "### Destination - $XXX RT (XX% off!)" or "### N. Destination - $XXX RT"
        const dealBlocks = greatDealsSection[0].split(/###\s+(?:\d+\.\s*)?/).filter(b => b.trim());

        for (const block of dealBlocks) {
            if (!block.trim()) continue;

            // Parse destination and price from header
            // Handles: "Croatia (Split) - $234 RT (75% off!)"
            const headerMatch = block.match(/^([^-\n]+)\s*-\s*\$([0-9,]+)\s*RT\s*\((\d+)%\s*off!?\)(\s*⭐\s*BUCKET LIST)?/i);
            if (!headerMatch) continue;

            const destination = headerMatch[1].trim();
            const price = parseInt(headerMatch[2].replace(/,/g, ''));
            const percentOff = parseInt(headerMatch[3]);
            const isBucketList = !!headerMatch[4];

            // Parse dates - handle multiple formats:
            // Format 1: "**Best dates**: Feb 15-22"
            // Format 2: "- **Dates**: 2026-05-05"
            const datesMatch = block.match(/\*\*(?:Best )?[Dd]ates?\*\*:\s*([^\n]+)/i);
            const dates = datesMatch ? datesMatch[1].trim() : '';

            // Parse typical price - handle multiple formats:
            // Format 1: "**Typical price**: ~$950"
            // Format 2: "- **Typical price**: $950"
            const typicalMatch = block.match(/\*\*Typical price\*\*:\s*~?\$([0-9,]+)/i);
            const typicalPrice = typicalMatch ? parseInt(typicalMatch[1].replace(/,/g, '')) : Math.round(price / (1 - percentOff / 100));

            // Parse window match - handle multiple formats:
            // Format 1: "✅ **July 4th** - matches"
            // Format 2: "- **Window match**: Close to Spring Break (Apr 6-10)"
            // Format 3: "- **Window match**: Requires PTO"
            let windowMatch: string | undefined;
            const oldStyleMatch = block.match(/✅\s*\*\*([^*]+)\*\*|✅\s+([^\n]+?)(?:\s*-|$)/i);
            const newStyleMatch = block.match(/\*\*Window match\*\*:\s*([^\n]+)/i);

            if (newStyleMatch) {
                const matchText = newStyleMatch[1].trim();
                // Extract window name from "Close to Spring Break (Apr 6-10)"
                if (matchText.startsWith('Close to ')) {
                    windowMatch = matchText.replace('Close to ', '').replace(/\s*\([^)]+\)/, '').trim();
                } else if (!matchText.includes('Requires PTO')) {
                    windowMatch = matchText;
                }
            } else if (oldStyleMatch) {
                windowMatch = (oldStyleMatch[1] || oldStyleMatch[2] || '').trim();
            }

            deals.push({
                destination,
                price,
                typicalPrice,
                percentOff,
                dates,
                isBucketList,
                windowMatch: windowMatch || undefined,
                alertDate,
            });
        }

        return deals;
    }

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
