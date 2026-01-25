import { App, TFile } from 'obsidian';
import { TravelWindow } from '../models/Trip';

export class TravelWindowParser {
    constructor(private app: App) {}

    async parse(profilePath: string): Promise<TravelWindow[]> {
        const file = this.app.vault.getAbstractFileByPath(profilePath);
        if (!file || !(file instanceof TFile)) {
            return [];
        }

        const content = await this.app.vault.read(file);
        const windows: TravelWindow[] = [];

        // Parse "Optimal Travel Windows 2026" section
        // Look for the BEST Windows table
        const bestWindowsMatch = content.match(/### BEST Windows[\s\S]*?\n\n\|.*\|[\s\S]*?(?=\n###|\n---|\n\n##|$)/i);

        if (bestWindowsMatch) {
            const tableRows = this.extractTableRows(bestWindowsMatch[0]);
            for (const row of tableRows) {
                const window = this.parseWindowRow(row);
                if (window) windows.push(window);
            }
        }

        // Also check for TOP PICK section
        const topPickMatch = content.match(/### ⭐ TOP PICK:([^\n]+)[\s\S]*?(?=\n---|\n###|$)/i);
        if (topPickMatch) {
            const topPick = this.parseTopPick(topPickMatch[0], topPickMatch[1].trim());
            if (topPick) {
                // Mark as top pick and add to front
                topPick.isTopPick = true;
                // Check if already in list, if so update it
                const existingIndex = windows.findIndex(w =>
                    w.name.toLowerCase().includes('july 4th') ||
                    w.name.toLowerCase().includes('shutdown')
                );
                if (existingIndex >= 0) {
                    windows[existingIndex] = { ...windows[existingIndex], ...topPick, isTopPick: true };
                } else {
                    windows.unshift(topPick);
                }
            }
        }

        // Sort by start date
        windows.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        return windows;
    }

    getNextWindow(windows: TravelWindow[]): TravelWindow | null {
        const now = new Date();
        // Find the first window that hasn't passed
        for (const window of windows) {
            if (window.startDate > now) {
                return window;
            }
        }
        return windows[0] || null; // Return first if all passed
    }

    private extractTableRows(tableSection: string): string[][] {
        const lines = tableSection.split('\n').filter(l => l.startsWith('|'));
        const rows: string[][] = [];

        for (let i = 2; i < lines.length; i++) { // Skip header and separator
            const cells = lines[i]
                .split('|')
                .slice(1, -1) // Remove empty first/last from split
                .map(c => c.trim());
            if (cells.length >= 4 && cells[0]) {
                rows.push(cells);
            }
        }
        return rows;
    }

    private parseWindowRow(cells: string[]): TravelWindow | null {
        // Expected columns: Window | Dates | Duration | PTO Needed | Why It Works
        if (cells.length < 4) return null;

        const name = cells[0].replace(/\*\*/g, '').trim();
        const dates = cells[1].trim();
        const duration = cells[2].replace(/\*\*/g, '').trim();
        const ptoNeeded = cells[3].replace(/\*\*/g, '').trim();
        const notes = cells[4] || '';

        const dateRange = this.parseDateRange(dates);
        if (!dateRange) return null;

        return {
            name,
            dates,
            startDate: dateRange.start,
            endDate: dateRange.end,
            duration,
            ptoNeeded,
            whoCanGo: this.inferWhoCanGo(name, notes),
            notes: notes.trim() || undefined,
        };
    }

    private parseTopPick(section: string, name: string): TravelWindow | null {
        // Extract details from the TOP PICK section
        const datesMatch = section.match(/\*\*Dates\*\*[:\s|]+([^\n|]+)/i);
        const durationMatch = section.match(/\*\*Duration\*\*[:\s|]+([^\n|]+)/i);
        const ptoMatch = section.match(/\*\*PTO Required\*\*[:\s|]+([^\n|]+)/i);
        const whyMatch = section.match(/\*\*Why it works\*\*[:\s|]+([^\n|]+)/i);

        const dates = datesMatch?.[1]?.trim() || '';
        const dateRange = this.parseDateRange(dates);

        if (!dateRange) return null;

        return {
            name,
            dates,
            startDate: dateRange.start,
            endDate: dateRange.end,
            duration: durationMatch?.[1]?.trim() || '',
            ptoNeeded: ptoMatch?.[1]?.trim() || '0',
            whoCanGo: 'Full family',
            notes: whyMatch?.[1]?.trim(),
            isTopPick: true,
        };
    }

    private parseDateRange(dateStr: string): { start: Date; end: Date } | null {
        // Handle formats like "Jun 27 - Jul 5", "May 22-25", "Sat Jun 27 - Sun Jul 5"
        const cleanDate = dateStr.replace(/\*\*/g, '').replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*/gi, '').trim();
        const year = 2026; // Default to current planning year

        const monthNames: Record<string, number> = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };

        // Pattern 1: "Jun 27 - Jul 5" (different months)
        const diffMonthMatch = cleanDate.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})/i);
        if (diffMonthMatch) {
            const startMonth = monthNames[diffMonthMatch[1].toLowerCase()];
            const startDay = parseInt(diffMonthMatch[2]);
            const endMonth = monthNames[diffMonthMatch[3].toLowerCase()];
            const endDay = parseInt(diffMonthMatch[4]);
            return {
                start: new Date(year, startMonth, startDay),
                end: new Date(year, endMonth, endDay)
            };
        }

        // Pattern 2: "May 22-25" (same month)
        const sameMonthMatch = cleanDate.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})\s*-\s*(\d{1,2})/i);
        if (sameMonthMatch) {
            const month = monthNames[sameMonthMatch[1].toLowerCase()];
            const startDay = parseInt(sameMonthMatch[2]);
            const endDay = parseInt(sameMonthMatch[3]);
            return {
                start: new Date(year, month, startDay),
                end: new Date(year, month, endDay)
            };
        }

        // Pattern 3: "Late May - Aug" (flexible month ranges)
        const flexibleMatch = cleanDate.match(/(Late|Early)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (flexibleMatch) {
            const startMonth = monthNames[flexibleMatch[2].toLowerCase()];
            const endMonth = monthNames[flexibleMatch[3].toLowerCase()];
            const startDay = flexibleMatch[1]?.toLowerCase() === 'late' ? 20 : 1;
            return {
                start: new Date(year, startMonth, startDay),
                end: new Date(year, endMonth, 28) // End of month approximation
            };
        }

        // Pattern 4: Single month with day "Jun 19"
        const singleMatch = cleanDate.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})/i);
        if (singleMatch) {
            const month = monthNames[singleMatch[1].toLowerCase()];
            const day = parseInt(singleMatch[2]);
            return {
                start: new Date(year, month, day),
                end: new Date(year, month, day)
            };
        }

        return null;
    }

    private inferWhoCanGo(name: string, notes: string): string {
        const combined = `${name} ${notes}`.toLowerCase();

        if (combined.includes('full family') || combined.includes('all kids') ||
            combined.includes('summer') || combined.includes('both schools')) {
            return 'Full family';
        }
        if (combined.includes('alpine only') || combined.includes('parents +')) {
            return 'Parents + youngest';
        }
        if (combined.includes('couple') || combined.includes('romantic')) {
            return 'Couple only';
        }
        if (combined.includes('flexible') || combined.includes('adults')) {
            return 'Adults / flexible';
        }

        return 'Full family'; // Default assumption
    }
}
