import { App, TFile } from 'obsidian';
import { Trip, TripStatus } from '../models/Trip';

/**
 * Parses unified trip files from Personal/travel/*.md
 * following the trip-schema.md format
 */
export class TripParser {
    constructor(private app: App) {}

    async parseAll(folderPath: string): Promise<Trip[]> {
        const results: Trip[] = [];
        const files = this.app.vault.getMarkdownFiles().filter(f =>
            f.path.startsWith(folderPath) &&
            !f.basename.startsWith('_') &&
            !f.path.includes('/pricing/') // Exclude pricing subfolder
        );

        for (const file of files) {
            const trip = await this.parse(file);
            if (trip) results.push(trip);
        }

        return results;
    }

    async parse(file: TFile): Promise<Trip | null> {
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;

        // Must have type: trip to be recognized
        if (!frontmatter || frontmatter.type !== 'trip') {
            return null;
        }

        const content = await this.app.vault.read(file);
        const { checkedTasks, totalTasks, urgentItems } = this.extractTasks(content);

        const status = this.normalizeStatus(frontmatter.status);
        const readiness = this.calculateReadiness(status, checkedTasks, totalTasks);

        return {
            id: file.basename.toLowerCase().replace(/\s+/g, '-'),
            destination: frontmatter.destination || file.basename,
            countryCode: this.getCountryCode(frontmatter.destination || ''),
            dates: frontmatter.dates || 'TBD',
            duration: frontmatter.duration,
            travelers: String(frontmatter.travelers || ''),
            budget: frontmatter.budget,
            status,
            committed: frontmatter.committed === true,
            window: frontmatter.window,
            readinessPercent: readiness,
            totalTasks,
            urgentItems,
            filePath: file.path,
            created: frontmatter.created || '',
            updated: frontmatter.updated,
            flightConfirmation: frontmatter.flight_confirmation,
            hotelConfirmation: frontmatter.hotel_confirmation,
            lastUpdated: new Date(file.stat.mtime),
        };
    }

    private normalizeStatus(status?: string): TripStatus {
        if (!status) return 'idea';
        const s = status.toLowerCase();
        
        // Map to valid status values
        if (s === 'idea') return 'idea';
        if (s === 'researching' || s === 'research') return 'researching';
        if (s === 'planned' || s === 'planning' || s === 'draft' || s === 'final') return 'planned';
        if (s === 'booked') return 'booked';
        if (s === 'complete' || s === 'completed') return 'complete';
        
        return 'idea';
    }

    private extractTasks(content: string): { checkedTasks: number; totalTasks: number; urgentItems: number } {
        let urgentItems = 0;

        // Find Open Questions section for urgent items
        const openQuestionsMatch = content.match(/## Open Questions[\s\S]*?(?=\n##|$)/i);
        if (openQuestionsMatch) {
            const uncheckedRegex = /- \[ \] /g;
            const matches = openQuestionsMatch[0].match(uncheckedRegex);
            urgentItems = matches?.length || 0;
        }

        // Also check for Booking Checklist urgent items
        const bookingChecklistMatch = content.match(/## (?:Booking )?Checklist[\s\S]*?(?=\n##|$)/i);
        if (bookingChecklistMatch) {
            const uncheckedRegex = /- \[ \] /g;
            const matches = bookingChecklistMatch[0].match(uncheckedRegex);
            urgentItems += matches?.length || 0;
        }

        // Count all tasks in the document
        const uncheckedMatches = content.match(/- \[ \] /g);
        const checkedMatches = content.match(/- \[x\] /gi);

        const totalTasks = (uncheckedMatches?.length || 0) + (checkedMatches?.length || 0);
        const checkedTasks = checkedMatches?.length || 0;

        return { checkedTasks, totalTasks, urgentItems };
    }

    private calculateReadiness(status: TripStatus, checkedTasks: number, totalTasks: number): number {
        // Base readiness by status
        const baseReadiness: Record<TripStatus, number> = {
            'idea': 10,
            'researching': 30,
            'planned': 60,
            'booked': 90,
            'complete': 100,
        };

        let readiness = baseReadiness[status];

        // Adjust based on task completion within the status range
        if (totalTasks > 0 && status !== 'complete') {
            const taskCompletion = checkedTasks / totalTasks;
            const statusRange = this.getStatusRange(status);
            readiness = statusRange.min + Math.round(taskCompletion * (statusRange.max - statusRange.min));
        }

        return Math.min(100, readiness);
    }

    private getStatusRange(status: TripStatus): { min: number; max: number } {
        switch (status) {
            case 'idea': return { min: 0, max: 20 };
            case 'researching': return { min: 20, max: 45 };
            case 'planned': return { min: 45, max: 75 };
            case 'booked': return { min: 75, max: 100 };
            case 'complete': return { min: 100, max: 100 };
        }
    }

    private getCountryCode(destination: string): string {
        const codes: Record<string, string> = {
            'peru': '🇵🇪',
            'mexico': '🇲🇽',
            'cabo': '🇲🇽',
            'cabo san lucas': '🇲🇽',
            'costa rica': '🇨🇷',
            'japan': '🇯🇵',
            'iceland': '🇮🇸',
            'france': '🇫🇷',
            'paris': '🇫🇷',
            'italy': '🇮🇹',
            'spain': '🇪🇸',
            'uk': '🇬🇧',
            'england': '🇬🇧',
            'greece': '🇬🇷',
            'portugal': '🇵🇹',
            'germany': '🇩🇪',
            'australia': '🇦🇺',
            'new zealand': '🇳🇿',
            'thailand': '🇹🇭',
            'vietnam': '🇻🇳',
            'croatia': '🇭🇷',
            'norway': '🇳🇴',
            'sweden': '🇸🇪',
            'netherlands': '🇳🇱',
            'amsterdam': '🇳🇱',
            'switzerland': '🇨🇭',
            'austria': '🇦🇹',
            'ireland': '🇮🇪',
            'scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
            'canada': '🇨🇦',
            'hawaii': '🇺🇸',
            'caribbean': '🏝️',
            'bali': '🇮🇩',
            'indonesia': '🇮🇩',
            'philippines': '🇵🇭',
            'singapore': '🇸🇬',
            'hong kong': '🇭🇰',
            'south korea': '🇰🇷',
            'korea': '🇰🇷',
            'taiwan': '🇹🇼',
            'china': '🇨🇳',
            'india': '🇮🇳',
            'morocco': '🇲🇦',
            'egypt': '🇪🇬',
            'south africa': '🇿🇦',
            'brazil': '🇧🇷',
            'argentina': '🇦🇷',
            'chile': '🇨🇱',
            'colombia': '🇨🇴',
            'ecuador': '🇪🇨',
            'galapagos': '🇪🇨',
        };

        const lower = destination.toLowerCase();
        for (const [key, code] of Object.entries(codes)) {
            if (lower.includes(key)) return code;
        }
        return '🌍';
    }
}
