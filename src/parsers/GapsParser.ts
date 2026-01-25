import { App, TFile } from 'obsidian';

export interface GapItem {
    destination: string;
    priority: 'urgent' | 'before-booking' | 'nice-to-have';
    question: string;
    checked: boolean;
}

export class GapsParser {
    constructor(private app: App) {}

    async parse(filePath: string): Promise<GapItem[]> {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!file || !(file instanceof TFile)) return [];

        const content = await this.app.vault.read(file);
        return this.parseContent(content);
    }

    parseContent(content: string): GapItem[] {
        const gaps: GapItem[] = [];

        // Split by destination headers (### Destination Name)
        const sections = content.split(/(?=###\s+[^#])/);

        for (const section of sections) {
            const headerMatch = section.match(/###\s+([^\n(]+)/);
            if (!headerMatch) continue;

            const destination = headerMatch[1].trim();
            let currentPriority: GapItem['priority'] = 'nice-to-have';

            const lines = section.split('\n');
            for (const line of lines) {
                // Detect priority sections
                if (/urgent/i.test(line) && !line.startsWith('-')) {
                    currentPriority = 'urgent';
                } else if (/before\s*booking/i.test(line) && !line.startsWith('-')) {
                    currentPriority = 'before-booking';
                } else if (/nice\s*to/i.test(line) && !line.startsWith('-')) {
                    currentPriority = 'nice-to-have';
                }

                // Parse task items
                const taskMatch = line.match(/^-\s*\[([ xX])\]\s*(.+)/);
                if (taskMatch) {
                    gaps.push({
                        destination,
                        priority: currentPriority,
                        question: taskMatch[2].trim(),
                        checked: taskMatch[1].toLowerCase() === 'x',
                    });
                }
            }
        }

        return gaps;
    }

}
