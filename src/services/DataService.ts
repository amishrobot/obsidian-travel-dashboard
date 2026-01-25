import { App } from 'obsidian';
import { Trip, Deadline, PriceSnapshot, Deal, DashboardData } from '../models/Trip';
import { ResearchParser, ResearchData } from '../parsers/ResearchParser';
import { ItineraryParser, ItineraryData } from '../parsers/ItineraryParser';
import { PricingParser } from '../parsers/PricingParser';
import { GapsParser, GapItem } from '../parsers/GapsParser';
import { DealsParser } from '../parsers/DealsParser';

export class DataService {
    private researchParser: ResearchParser;
    private itineraryParser: ItineraryParser;
    private pricingParser: PricingParser;
    private gapsParser: GapsParser;
    private dealsParser: DealsParser;

    // Paths relative to vault root
    private basePath = 'Personal/travel';
    private researchPath = 'Personal/travel/01-research';
    private itineraryPath = 'Personal/travel/02-itineraries';
    private pricingPath = 'Personal/travel/00-source-material/pricing-snapshots';
    private gapsPath = 'Personal/travel/04-gaps/questions.md';
    private intelPath = 'Personal/travel/00-source-material/destination-intelligence.md';

    constructor(private app: App) {
        this.researchParser = new ResearchParser(app);
        this.itineraryParser = new ItineraryParser(app);
        this.pricingParser = new PricingParser(app);
        this.gapsParser = new GapsParser(app);
        this.dealsParser = new DealsParser(app);
    }

    async loadAll(): Promise<DashboardData> {
        const [research, itineraries, prices, gaps, allDeals] = await Promise.all([
            this.researchParser.parseAll(this.researchPath),
            this.itineraryParser.parseAll(this.itineraryPath),
            this.pricingParser.parseAll(this.pricingPath),
            this.gapsParser.parse(this.gapsPath),
            this.dealsParser.parse(this.intelPath),
        ]);

        const trips = this.buildTrips(research, itineraries, gaps);
        const deadlines = this.buildDeadlines(itineraries, gaps, prices);
        const deals = this.dealsParser.getCurrentSeasonDeals(allDeals);

        return {
            trips,
            deadlines,
            prices,
            deals,
            lastRefresh: new Date(),
        };
    }

    private buildTrips(
        research: ResearchData[],
        itineraries: ItineraryData[],
        gaps: GapItem[]
    ): Trip[] {
        const tripMap = new Map<string, Trip>();

        // Start with itineraries (more complete trip info)
        for (const itin of itineraries) {
            const dest = this.normalizeDestination(itin.destination);
            const urgentCount = gaps.filter(g =>
                this.normalizeDestination(g.destination) === dest &&
                g.priority === 'urgent' &&
                !g.checked
            ).length;

            const readiness = this.calculateReadiness(itin);

            tripMap.set(dest, {
                id: dest.toLowerCase().replace(/\s+/g, '-'),
                destination: itin.destination,
                countryCode: this.getCountryCode(itin.destination),
                tripDates: itin.tripDates,
                duration: itin.duration,
                travelers: itin.travelers,
                budget: itin.totalBudget || 'TBD',
                status: this.mapItineraryStatus(itin.status),
                readinessPercent: readiness,
                urgentItems: urgentCount,
                itineraryPath: itin.path,
                lastUpdated: new Date(),
            });
        }

        // Add research-only trips (no itinerary yet)
        for (const res of research) {
            const dest = this.normalizeDestination(res.destination);
            if (!tripMap.has(dest)) {
                tripMap.set(dest, {
                    id: dest.toLowerCase().replace(/\s+/g, '-'),
                    destination: res.destination,
                    countryCode: this.getCountryCode(res.destination),
                    tripDates: res.tripTiming || 'TBD',
                    duration: res.duration || 'TBD',
                    travelers: res.travelers || 1,
                    budget: 'TBD',
                    status: 'research',
                    readinessPercent: res.status === 'complete' ? 30 : 15,
                    urgentItems: 0,
                    researchPath: res.path,
                    lastUpdated: new Date(),
                });
            } else {
                // Add research path to existing trip
                const trip = tripMap.get(dest)!;
                trip.researchPath = res.path;
            }
        }

        return Array.from(tripMap.values())
            .filter(t => this.isActiveTrip(t))
            .sort((a, b) => this.compareTripDates(a.tripDates, b.tripDates));
    }

    private buildDeadlines(
        itineraries: ItineraryData[],
        gaps: GapItem[],
        prices: PriceSnapshot[]
    ): Deadline[] {
        const deadlines: Deadline[] = [];
        const now = new Date();

        // Add urgent items from gaps
        for (const gap of gaps) {
            if (gap.priority === 'urgent' && !gap.checked) {
                deadlines.push({
                    id: `gap-${gap.destination}-${gap.question.slice(0, 20)}`,
                    destination: gap.destination,
                    description: gap.question,
                    date: 'ASAP',
                    daysRemaining: 0,
                    priority: 'urgent',
                    source: 'gaps',
                });
            }
        }

        // Add booking deadlines from itineraries
        for (const itin of itineraries) {
            for (const task of itin.urgentTasks) {
                // Try to extract date from task
                const dateMatch = task.match(/by\s+(\w+\s+\d+|\d+\/\d+)/i);
                const daysRemaining = dateMatch ? this.estimateDaysRemaining(dateMatch[1]) : 14;

                deadlines.push({
                    id: `itin-${itin.destination}-${task.slice(0, 20)}`,
                    destination: itin.destination,
                    description: task,
                    date: dateMatch ? dateMatch[1] : 'Soon',
                    daysRemaining,
                    priority: daysRemaining <= 14 ? 'urgent' : daysRemaining <= 30 ? 'soon' : 'upcoming',
                    source: 'itinerary',
                });
            }
        }

        // Add stale pricing alerts
        for (const price of prices) {
            if (price.daysSinceCapture > 14) {
                deadlines.push({
                    id: `price-${price.destination}`,
                    destination: price.destination,
                    description: `Update pricing (${price.daysSinceCapture} days old)`,
                    date: 'Stale',
                    daysRemaining: 0,
                    priority: 'soon',
                    source: 'pricing',
                });
            }
        }

        return deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
    }

    private calculateReadiness(itin: ItineraryData): number {
        let readiness = 0;

        // Base readiness from status
        switch (itin.status) {
            case 'draft': readiness = 40; break;
            case 'final': readiness = 70; break;
            case 'booked': readiness = 90; break;
            case 'completed': readiness = 100; break;
        }

        // Adjust based on task completion
        if (itin.totalTasks > 0) {
            const taskCompletion = itin.checkedTasks / itin.totalTasks;
            readiness = Math.round(readiness * 0.7 + taskCompletion * 30);
        }

        return Math.min(100, readiness);
    }

    private normalizeDestination(dest: string): string {
        return dest.toLowerCase()
            .replace(/,.*$/, '') // Remove country
            .replace(/\s+/g, ' ')
            .trim();
    }

    private getCountryCode(destination: string): string {
        const codes: Record<string, string> = {
            'peru': '🇵🇪',
            'mexico': '🇲🇽',
            'cabo': '🇲🇽',
            'cabo san lucas': '🇲🇽',
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
            'costa rica': '🇨🇷',
        };

        const lower = destination.toLowerCase();
        for (const [key, code] of Object.entries(codes)) {
            if (lower.includes(key)) return code;
        }
        return '🌍';
    }

    private mapItineraryStatus(status: ItineraryData['status']): Trip['status'] {
        switch (status) {
            case 'draft': return 'planning';
            case 'final': return 'planning';
            case 'booked': return 'booked';
            case 'completed': return 'complete';
            default: return 'planning';
        }
    }

    private isActiveTrip(trip: Trip): boolean {
        // Filter out completed trips and very old trips
        if (trip.status === 'complete') return false;
        // Could add date-based filtering here
        return true;
    }

    private compareTripDates(a: string, b: string): number {
        // Try to extract dates and compare
        const dateA = this.extractDate(a);
        const dateB = this.extractDate(b);
        if (dateA && dateB) return dateA.getTime() - dateB.getTime();
        if (dateA) return -1;
        if (dateB) return 1;
        return 0;
    }

    private extractDate(dateStr: string): Date | null {
        // Try ISO format first: "2026-06-27"
        const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            const date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
            if (!isNaN(date.getTime())) return date;
        }

        // Try "Month Day, Year" format: "June 27-July 5, 2026" or "June 27, 2026"
        const monthMatch = dateStr.match(/(\w+)\s+(\d+)(?:\s*-\s*\w*\s*\d+)?,?\s*(\d{4})/i);
        if (monthMatch) {
            const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december'];
            const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase());
            if (monthIndex !== -1) {
                const date = new Date(parseInt(monthMatch[3]), monthIndex, parseInt(monthMatch[2]));
                if (!isNaN(date.getTime())) return date;
            }
        }

        return null;
    }

    private estimateDaysRemaining(dateStr: string): number {
        try {
            const target = new Date(dateStr);
            const now = new Date();
            const diff = target.getTime() - now.getTime();
            return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
        } catch {
            return 30; // Default if can't parse
        }
    }
}
