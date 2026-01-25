import { App, TFile } from 'obsidian';

export interface ResearchData {
    path: string;
    date: string;
    destination: string;
    tripTiming?: string;
    duration?: string;
    travelStyle?: string;
    travelers?: number;
    status: 'draft' | 'in-progress' | 'complete';
    confidence: 'low' | 'medium' | 'high';
    dataFreshness?: string;
}

export class ResearchParser {
    constructor(private app: App) {}

    async parseAll(folderPath: string): Promise<ResearchData[]> {
        const results: ResearchData[] = [];
        const folder = this.app.vault.getAbstractFileByPath(folderPath);

        if (!folder) return results;

        const files = this.app.vault.getMarkdownFiles().filter(f =>
            f.path.startsWith(folderPath) && !f.basename.startsWith('_')
        );

        for (const file of files) {
            const data = await this.parse(file);
            if (data) results.push(data);
        }

        return results;
    }

    async parse(file: TFile): Promise<ResearchData | null> {
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;

        if (!frontmatter) return null;

        return {
            path: file.path,
            date: frontmatter.date || '',
            destination: frontmatter.destination || file.basename,
            tripTiming: frontmatter.trip_timing,
            duration: frontmatter.duration,
            travelStyle: frontmatter.travel_style,
            travelers: frontmatter.travelers,
            status: this.normalizeStatus(frontmatter.status),
            confidence: frontmatter.confidence || 'medium',
            dataFreshness: frontmatter.data_freshness,
        };
    }

    private normalizeStatus(status?: string): ResearchData['status'] {
        if (!status) return 'draft';
        const s = status.toLowerCase();
        if (s === 'complete' || s === 'completed') return 'complete';
        if (s === 'in-progress' || s === 'in progress') return 'in-progress';
        return 'draft';
    }
}
