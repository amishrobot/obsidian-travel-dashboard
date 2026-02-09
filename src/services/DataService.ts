import { App } from 'obsidian';
import { Trip, TripsByStatus, Deadline, PriceSnapshot, Deal, DiscoveredDeal, DashboardData, TravelWindow, Milestone, ActionItem } from '../models/Trip';
import { TripParser } from '../parsers/TripParser';
import { PricingParser } from '../parsers/PricingParser';
import { DealsParser } from '../parsers/DealsParser';
import { TravelWindowParser } from '../parsers/TravelWindowParser';

export class DataService {
    private tripParser: TripParser;
    private pricingParser: PricingParser;
    private dealsParser: DealsParser;
    private windowParser: TravelWindowParser;

    // Paths relative to vault root
    // Unified trip model - all trip files now in Personal/travel with type: trip
    private tripPath = 'Personal/travel';
    private pricingPath = 'Personal/travel/pricing/snapshots';
    private intelPath = 'Personal/travel/pricing/destination-intelligence.md';
    private profilePath = '_state/travel-profile.md';  // Moved to _state per JoshOS convention
    private inboxPath = '_inbox';

    constructor(private app: App) {
        this.tripParser = new TripParser(app);
        this.pricingParser = new PricingParser(app);
        this.dealsParser = new DealsParser(app);
        this.windowParser = new TravelWindowParser(app);
    }

    async loadAll(): Promise<DashboardData> {
        console.log('[TravelDashboard] Loading data...');
        const [trips, prices, allDeals, travelWindows, discoveredDeals] = await Promise.all([
            this.tripParser.parseAll(this.tripPath),
            this.pricingParser.parseAll(this.pricingPath),
            this.dealsParser.parse(this.intelPath),
            this.windowParser.parse(this.profilePath),
            this.dealsParser.parseDiscoveredDeals(this.inboxPath),
        ]);
        console.log('[TravelDashboard] Loaded:', { trips: trips.length, prices: prices.length, windows: travelWindows.length, deals: discoveredDeals.length });

        // Group trips by status
        const tripsByStatus = this.groupTripsByStatus(trips);

        // Build deadlines from trips (urgent items and tasks)
        const deadlines = this.buildDeadlinesFromTrips(trips, prices);
        const deals = this.dealsParser.getCurrentSeasonDeals(allDeals);
        const milestones = await this.parseMilestones();

        // Find committed trip (soonest by date)
        const committedTrip = trips
            .filter(t => t.committed)
            .sort((a, b) => this.compareTripDates(a.dates, b.dates))[0] || null;

        // Cross-reference windows with trips
        this.windowParser.linkWindowsToTrips(travelWindows, trips);

        // Get next travel window (only if no committed trip)
        const nextWindow = committedTrip ? null : this.windowParser.getNextWindow(travelWindows);

        // Build action items (deals matching windows, windows with no trip)
        const actionItems = this.buildActionItems(travelWindows, discoveredDeals, trips);

        return {
            trips,
            tripsByStatus,
            committedTrip,
            nextWindow,
            travelWindows,
            actionItems,
            deadlines,
            milestones,
            prices,
            deals,
            discoveredDeals,
            lastRefresh: new Date(),
        };
    }

    /**
     * Group trips by their status for dashboard display
     */
    private groupTripsByStatus(trips: Trip[]): TripsByStatus {
        const grouped: TripsByStatus = {
            idea: [],
            researching: [],
            planned: [],
            booked: [],
            complete: [],
        };

        for (const trip of trips) {
            grouped[trip.status].push(trip);
        }

        // Sort each group by dates (soonest first)
        for (const status of Object.keys(grouped) as Array<keyof TripsByStatus>) {
            grouped[status].sort((a, b) => this.compareTripDates(a.dates, b.dates));
        }

        return grouped;
    }

    /**
     * Build deadlines from trips (urgent items and booking tasks)
     */
    private buildDeadlinesFromTrips(trips: Trip[], prices: PriceSnapshot[]): Deadline[] {
        const deadlines: Deadline[] = [];

        // Add urgent items from trips
        for (const trip of trips) {
            if (trip.urgentItems > 0 && trip.status !== 'complete') {
                deadlines.push({
                    id: `trip-${trip.id}-urgent`,
                    destination: trip.destination,
                    description: `${trip.urgentItems} open question${trip.urgentItems > 1 ? 's' : ''} to resolve`,
                    date: 'ASAP',
                    daysRemaining: 0,
                    priority: 'urgent',
                    source: trip.filePath,
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

    /**
     * Build action items: deals that match upcoming windows + windows with no planned trip
     */
    private buildActionItems(
        windows: TravelWindow[],
        discoveredDeals: DiscoveredDeal[],
        trips: Trip[]
    ): ActionItem[] {
        const items: ActionItem[] = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Filter to upcoming windows (next 120 days)
        const upcomingWindows = windows.filter(w => {
            const daysUntil = Math.floor((w.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntil > 0 && daysUntil <= 120;
        });

        // Check each deal for window matches
        for (const deal of discoveredDeals) {
            const dealDates = this.parseDealDates(deal.dates);
            if (!dealDates) continue;

            for (const window of upcomingWindows) {
                if (this.datesOverlap(dealDates.start, dealDates.end, window.startDate, window.endDate)) {
                    const daysAway = Math.floor((window.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                    items.push({
                        type: 'deal-match',
                        urgency: deal.percentOff >= 35 ? 'high' : deal.percentOff >= 20 ? 'medium' : 'low',
                        daysAway,
                        message: `$${deal.price} ${deal.destination} fits your ${window.name} window`,
                        subMessage: `${daysAway} days away - ${deal.percentOff}% below typical`,
                        destination: deal.destination,
                        windowName: window.name,
                        deal,
                    });
                }
            }
        }

        // Check each upcoming window for planned trips
        for (const window of upcomingWindows) {
            const daysAway = Math.floor((window.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // Check if any trip is planned for this window
            const hasPlannedTrip = trips.some(trip => {
                const tripDate = this.extractDate(trip.dates);
                if (!tripDate) return false;
                return this.datesOverlap(tripDate, tripDate, window.startDate, window.endDate);
            });

            if (!hasPlannedTrip && daysAway <= 90) {
                items.push({
                    type: 'window-no-trip',
                    urgency: daysAway <= 30 ? 'high' : daysAway <= 60 ? 'medium' : 'low',
                    daysAway,
                    message: `${window.name} window`,
                    subMessage: `${daysAway} days - NO TRIP PLANNED`,
                    windowName: window.name,
                });
            }
        }

        // Sort by urgency (high first), then by days away
        return items.sort((a, b) => {
            const urgencyOrder = { high: 0, medium: 1, low: 2 };
            if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
                return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            }
            return a.daysAway - b.daysAway;
        });
    }

    /**
     * Parse deal dates - handles multiple formats:
     * - ISO format: "2026-05-05"
     * - Range: "Feb 15-22" or "Mar 1-8"
     * - Cross-month: "Feb 15 - Mar 2"
     */
    private parseDealDates(dateStr: string): { start: Date; end: Date } | null {
        if (!dateStr) return null;

        const monthNames: Record<string, number> = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };

        // Pattern 1: ISO format "2026-05-05" (single date - assume 7-day trip)
        const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            const year = parseInt(isoMatch[1]);
            const month = parseInt(isoMatch[2]) - 1; // Convert to 0-indexed
            const day = parseInt(isoMatch[3]);
            const startDate = new Date(year, month, day);
            const endDate = new Date(year, month, day + 7); // Assume 7-day window
            return { start: startDate, end: endDate };
        }

        const year = new Date().getFullYear();

        // Pattern 2: "Feb 15-22" (same month range)
        const sameMonthMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})\s*-\s*(\d{1,2})/i);
        if (sameMonthMatch) {
            const month = monthNames[sameMonthMatch[1].toLowerCase()];
            const startDay = parseInt(sameMonthMatch[2]);
            const endDay = parseInt(sameMonthMatch[3]);
            return {
                start: new Date(year, month, startDay),
                end: new Date(year, month, endDay)
            };
        }

        // Pattern 3: "Feb 15 - Mar 2" (cross-month range)
        const diffMonthMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})/i);
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

        return null;
    }

    /**
     * Check if two date ranges overlap
     */
    private datesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
        return start1 <= end2 && end1 >= start2;
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

    /**
     * Parse Important Dates from travel-profile.md
     * Expected format:
     * | Date | Occasion | Trip Ideas |
     * |------|----------|------------|
     * | **Feb 9** | Adrienne Day | Romantic getaway |
     */
    private async parseMilestones(): Promise<Milestone[]> {
        const milestones: Milestone[] = [];

        try {
            const file = this.app.vault.getAbstractFileByPath(this.profilePath);
            if (!file || !('extension' in file)) return milestones;

            const content = await this.app.vault.read(file as any);

            // Find Important Dates section (match until next ## header or end)
            const importantDatesMatch = content.match(/## Important Dates[\s\S]*?(?=\n##|\n---\n|$)/);
            if (!importantDatesMatch) return milestones;

            const section = importantDatesMatch[0];

            // Parse markdown table rows
            // Match rows like: | **Feb 9** | Adrienne Day | Romantic getaway |
            const rowRegex = /\|\s*\*?\*?([A-Za-z]+\s+\d+)\*?\*?\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|/g;
            let match;

            const monthMap: Record<string, number> = {
                'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
            };

            const emojiMap: Record<string, string> = {
                'adrienne day': '💕',
                'anniversary': '💍',
                'birthday': '🎂',
            };

            while ((match = rowRegex.exec(section)) !== null) {
                const dateStr = match[1].trim();  // e.g., "Feb 9"
                const occasion = match[2].trim();  // e.g., "Adrienne Day"
                const tripIdeas = match[3].trim(); // e.g., "Romantic getaway"

                // Parse month and day
                const dateMatch = dateStr.match(/([A-Za-z]+)\s+(\d+)/);
                if (!dateMatch) continue;

                const monthStr = dateMatch[1].toLowerCase().substring(0, 3);
                const day = parseInt(dateMatch[2]);
                const month = monthMap[monthStr];

                if (month === undefined || isNaN(day)) continue;

                // Calculate days until (accounting for year wrap)
                const now = new Date();
                const currentYear = now.getFullYear();
                let targetDate = new Date(currentYear, month, day);

                // If date has passed this year, use next year
                if (targetDate < now) {
                    targetDate = new Date(currentYear + 1, month, day);
                }

                const daysUntil = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                // Find emoji based on occasion
                let emoji = '🎉';
                for (const [key, value] of Object.entries(emojiMap)) {
                    if (occasion.toLowerCase().includes(key)) {
                        emoji = value;
                        break;
                    }
                }

                milestones.push({
                    id: `milestone-${occasion.toLowerCase().replace(/\s+/g, '-')}`,
                    name: occasion,
                    date: dateStr,
                    monthDay: [month, day],
                    tripIdeas: tripIdeas || undefined,
                    daysUntil,
                    emoji,
                });
            }
        } catch (e) {
            console.error('Error parsing milestones:', e);
        }

        // Sort by days until
        return milestones.sort((a, b) => a.daysUntil - b.daysUntil);
    }
}
