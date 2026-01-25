import { App, TFile } from 'obsidian';

export interface ItineraryData {
    path: string;
    date: string;
    destination: string;
    tripDates: string;
    duration: string;
    travelStyle?: string;
    basedOn?: string;
    status: 'draft' | 'final' | 'booked' | 'completed';
    totalBudget?: string;
    travelers: number;
    urgentTasks: string[];
    checkedTasks: number;
    totalTasks: number;
}

export class ItineraryParser {
    constructor(private app: App) {}

    async parseAll(folderPath: string): Promise<ItineraryData[]> {
        const results: ItineraryData[] = [];
        const files = this.app.vault.getMarkdownFiles().filter(f =>
            f.path.startsWith(folderPath) &&
            !f.basename.startsWith('_') &&
            !f.basename.includes('overview')
        );

        for (const file of files) {
            const data = await this.parse(file);
            if (data) results.push(data);
        }

        return results;
    }

    async parse(file: TFile): Promise<ItineraryData | null> {
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;
        const content = await this.app.vault.read(file);

        if (!frontmatter) return null;

        const { urgentTasks, checkedTasks, totalTasks } = this.extractTasks(content);

        return {
            path: file.path,
            date: frontmatter.date || '',
            destination: frontmatter.destination || '',
            tripDates: frontmatter.trip_dates || '',
            duration: frontmatter.duration || '',
            travelStyle: frontmatter.travel_style,
            basedOn: frontmatter.based_on,
            status: this.normalizeStatus(frontmatter.status),
            totalBudget: frontmatter.total_budget_estimate,
            travelers: frontmatter.travelers || 1,
            urgentTasks,
            checkedTasks,
            totalTasks,
        };
    }

    private extractTasks(content: string): { urgentTasks: string[], checkedTasks: number, totalTasks: number } {
        const urgentTasks: string[] = [];
        let checkedTasks = 0;
        let totalTasks = 0;

        // Find URGENT section
        const urgentMatch = content.match(/###\s*URGENT[\s\S]*?(?=###|$)/i);
        if (urgentMatch) {
            const taskRegex = /- \[ \] (.+)/g;
            let match;
            while ((match = taskRegex.exec(urgentMatch[0])) !== null) {
                urgentTasks.push(match[1]);
            }
        }

        // Count all tasks
        const uncheckedMatches = content.match(/- \[ \] /g);
        const checkedMatches = content.match(/- \[x\] /gi);

        totalTasks = (uncheckedMatches?.length || 0) + (checkedMatches?.length || 0);
        checkedTasks = checkedMatches?.length || 0;

        return { urgentTasks, checkedTasks, totalTasks };
    }

    private normalizeStatus(status?: string): ItineraryData['status'] {
        if (!status) return 'draft';
        const s = status.toLowerCase();
        if (s === 'final' || s === 'finalized') return 'final';
        if (s === 'booked') return 'booked';
        if (s === 'completed' || s === 'complete') return 'completed';
        return 'draft';
    }
}
