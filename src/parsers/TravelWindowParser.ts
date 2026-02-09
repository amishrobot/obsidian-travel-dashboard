import { App, TFile } from 'obsidian';
import { TravelWindow, WindowCategory } from '../models/Trip';

export class TravelWindowParser {
    constructor(private app: App) {}

    async parse(profilePath: string): Promise<TravelWindow[]> {
        const file = this.app.vault.getAbstractFileByPath(profilePath);
        if (!file || !(file instanceof TFile)) {
            return [];
        }

        const content = await this.app.vault.read(file);
        const windows: TravelWindow[] = [];

        // Parse TOP PICK section
        const topPickMatch = content.match(/### ⭐ TOP PICK:([^\n]+)[\s\S]*?(?=\n---|\n###|$)/i);
        if (topPickMatch) {
            const topPick = this.parseTopPick(topPickMatch[0], topPickMatch[1].trim());
            if (topPick) {
                windows.push(topPick);
            }
        }

        // Parse BEST Windows table
        const bestWindowsMatch = content.match(/### BEST Windows[\s\S]*?\n\n\|.*\|[\s\S]*?(?=\n###|\n---|\n\n##|$)/i);
        if (bestWindowsMatch) {
            const tableRows = this.extractTableRows(bestWindowsMatch[0]);
            for (const row of tableRows) {
                const window = this.parseBestWindowRow(row);
                if (window) {
                    // Don't duplicate top pick
                    const isDupe = windows.some(w =>
                        w.name.toLowerCase().includes('july 4th') &&
                        window.name.toLowerCase().includes('july 4th')
                    );
                    if (!isDupe) windows.push(window);
                }
            }
        }

        // Parse Great Windows table (Work + Alpine Only)
        const greatWindowsMatch = content.match(/### Great Windows[\s\S]*?\n\n\|.*\|[\s\S]*?(?=\n###|\n---|\n\n##|$)/i);
        if (greatWindowsMatch) {
            const tableRows = this.extractTableRows(greatWindowsMatch[0]);
            for (const row of tableRows) {
                const window = this.parseGreatWindowRow(row);
                if (window) windows.push(window);
            }
        }

        // Parse Long Weekend Trips table
        const longWeekendMatch = content.match(/### Long Weekend Trips[\s\S]*?\n\n\|.*\|[\s\S]*?(?=\n###|\n---|\n\n##|$)/i);
        if (longWeekendMatch) {
            const tableRows = this.extractTableRows(longWeekendMatch[0]);
            for (const row of tableRows) {
                const window = this.parseLongWeekendRow(row);
                if (window) windows.push(window);
            }
        }

        // Parse Romantic / Couple Trip Windows table
        const romanticMatch = content.match(/### Romantic \/ Couple Trip Windows[\s\S]*?\n\n\|.*\|[\s\S]*?(?=\n###|\n---|\n\n##|$)/i);
        if (romanticMatch) {
            const tableRows = this.extractTableRows(romanticMatch[0]);
            for (const row of tableRows) {
                const window = this.parseRomanticWindowRow(row);
                if (window) windows.push(window);
            }
        }

        // Deduplicate by name (keep the more specific entry)
        const deduped = this.deduplicateWindows(windows);

        // Sort by start date
        deduped.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        return deduped;
    }

    getNextWindow(windows: TravelWindow[]): TravelWindow | null {
        const now = new Date();
        for (const window of windows) {
            if (window.startDate > now) {
                return window;
            }
        }
        return windows[0] || null;
    }

    /**
     * Cross-reference windows with trips to mark which windows have trips planned
     */
    linkWindowsToTrips(windows: TravelWindow[], trips: Array<{ destination: string; dates: string }>): void {
        for (const window of windows) {
            for (const trip of trips) {
                const tripDate = this.extractTripStartDate(trip.dates);
                if (!tripDate) continue;

                if (this.datesOverlap(tripDate, tripDate, window.startDate, window.endDate)) {
                    window.linkedTripName = trip.destination;
                    break;
                }
            }
        }
    }

    private extractTableRows(tableSection: string): string[][] {
        const lines = tableSection.split('\n').filter(l => l.startsWith('|'));
        const rows: string[][] = [];

        for (let i = 2; i < lines.length; i++) { // Skip header and separator
            const cells = lines[i]
                .split('|')
                .slice(1, -1) // Remove empty first/last from split
                .map(c => c.trim());
            if (cells.length >= 3 && cells[0]) {
                rows.push(cells);
            }
        }
        return rows;
    }

    /**
     * BEST Windows table: Window | Dates | Duration | PTO Needed | Why It Works
     */
    private parseBestWindowRow(cells: string[]): TravelWindow | null {
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
            category: 'best',
        };
    }

    /**
     * Great Windows table: Window | Dates | Who | PTO Needed | Notes
     */
    private parseGreatWindowRow(cells: string[]): TravelWindow | null {
        if (cells.length < 4) return null;

        const name = cells[0].replace(/\*\*/g, '').trim();
        const dates = cells[1].trim();
        const who = cells[2].trim();
        const ptoNeeded = cells[3].replace(/\*\*/g, '').trim();
        const notes = cells[4] || '';

        const dateRange = this.parseDateRange(dates);
        if (!dateRange) return null;

        return {
            name,
            dates,
            startDate: dateRange.start,
            endDate: dateRange.end,
            duration: this.calculateDuration(dateRange.start, dateRange.end),
            ptoNeeded,
            whoCanGo: who || 'Parents + youngest',
            notes: notes.trim() || undefined,
            category: 'great',
        };
    }

    /**
     * Long Weekend Trips table: Window | Dates | PTO | Total Days Off
     */
    private parseLongWeekendRow(cells: string[]): TravelWindow | null {
        if (cells.length < 4) return null;

        const name = cells[0].replace(/\*\*/g, '').trim();
        const dates = cells[1].trim();
        const ptoNeeded = cells[2].trim();
        const totalDaysOff = cells[3].trim();

        const dateRange = this.parseDateRange(dates);
        if (!dateRange) return null;

        return {
            name,
            dates,
            startDate: dateRange.start,
            endDate: dateRange.end,
            duration: totalDaysOff.replace(/\s*\(.*\)/, '') + ' days',
            ptoNeeded,
            whoCanGo: 'Adults / flexible',
            category: 'long-weekend',
        };
    }

    /**
     * Romantic / Couple Trip Windows table: Occasion | 2026 Dates | PTO Needed | Strategy
     */
    private parseRomanticWindowRow(cells: string[]): TravelWindow | null {
        if (cells.length < 3) return null;

        const name = cells[0].replace(/\*\*/g, '').trim();
        const dates = cells[1].trim();
        const ptoNeeded = cells[2].trim();
        const strategy = cells[3] || '';

        const dateRange = this.parseDateRange(dates);
        if (!dateRange) return null;

        return {
            name,
            dates,
            startDate: dateRange.start,
            endDate: dateRange.end,
            duration: this.calculateDuration(dateRange.start, dateRange.end),
            ptoNeeded,
            whoCanGo: 'Couple only',
            notes: strategy.trim() || undefined,
            category: 'romantic',
        };
    }

    private parseTopPick(section: string, name: string): TravelWindow | null {
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
            category: 'top-pick',
        };
    }

    private parseDateRange(dateStr: string): { start: Date; end: Date } | null {
        const cleanDate = dateStr.replace(/\*\*/g, '').replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*/gi, '').trim();
        const year = 2026;

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

        // Pattern 2: "May 22-25" or "Feb 13-16" (same month)
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
                end: new Date(year, endMonth, 28)
            };
        }

        // Pattern 4: "Feb 6-9 (Fri-Mon)" — with parenthetical day names
        const parenMatch = cleanDate.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})\s*-\s*(\d{1,2})\s*\(/i);
        if (parenMatch) {
            const month = monthNames[parenMatch[1].toLowerCase()];
            const startDay = parseInt(parenMatch[2]);
            const endDay = parseInt(parenMatch[3]);
            return {
                start: new Date(year, month, startDay),
                end: new Date(year, month, endDay)
            };
        }

        // Pattern 5: "Oct 16-18" or single date "Jun 19"
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

    private calculateDuration(start: Date, end: Date): string {
        const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return `${days} days`;
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

        return 'Full family';
    }

    /**
     * Deduplicate windows that appear in multiple tables (e.g., Memorial Day in both BEST and Long Weekend)
     * Keep the more detailed entry (longer notes, or higher-tier category)
     */
    private deduplicateWindows(windows: TravelWindow[]): TravelWindow[] {
        const seen = new Map<string, TravelWindow>();
        const categoryPriority: Record<WindowCategory, number> = {
            'top-pick': 0,
            'best': 1,
            'great': 2,
            'romantic': 3,
            'long-weekend': 4,
        };

        for (const w of windows) {
            const key = w.name.toLowerCase().replace(/[^a-z]/g, '');
            const existing = seen.get(key);
            if (!existing || categoryPriority[w.category] < categoryPriority[existing.category]) {
                seen.set(key, w);
            }
        }

        return Array.from(seen.values());
    }

    private extractTripStartDate(dateStr: string): Date | null {
        if (!dateStr || dateStr === 'TBD') return null;

        const monthNames: Record<string, number> = {
            'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
            'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5,
            'jul': 6, 'july': 6, 'aug': 7, 'august': 7, 'sep': 8, 'september': 8,
            'oct': 9, 'october': 9, 'nov': 10, 'november': 10, 'dec': 11, 'december': 11,
        };

        // ISO format
        const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
        }

        // "Month Day, Year" or "Month Day-Day, Year"
        const monthMatch = dateStr.match(/(\w+)\s+(\d+)(?:\s*-\s*\w*\s*\d+)?,?\s*(\d{4})/i);
        if (monthMatch) {
            const month = monthNames[monthMatch[1].toLowerCase().substring(0, 3)];
            if (month !== undefined) {
                return new Date(parseInt(monthMatch[3]), month, parseInt(monthMatch[2]));
            }
        }

        return null;
    }

    private datesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
        return start1 <= end2 && end1 >= start2;
    }
}
