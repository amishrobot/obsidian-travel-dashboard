import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import TravelDashboardPlugin from './main';
import { DashboardData, Trip, Deadline, PriceSnapshot, Deal, DiscoveredDeal, TravelWindow, Milestone, ActionItem } from './models/Trip';

export const VIEW_TYPE_TRAVEL_DASHBOARD = 'travel-dashboard-view';

export class TravelDashboardView extends ItemView {
    plugin: TravelDashboardPlugin;
    data: DashboardData | null = null;
    private refreshTimeout: NodeJS.Timeout | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: TravelDashboardPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_TRAVEL_DASHBOARD;
    }

    getDisplayText(): string {
        return 'Travel Dashboard';
    }

    getIcon(): string {
        return 'plane';
    }

    async onOpen() {
        await this.refresh();
    }

    async onClose() {
        // Cleanup
    }

    async refresh(): Promise<void> {
        // Debounce multiple rapid refreshes
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        return new Promise((resolve) => {
            this.refreshTimeout = setTimeout(async () => {
                this.data = await this.plugin.dataService.loadAll();
                this.render();
                resolve();
            }, 100);
        });
    }

    render() {
        const container = this.contentEl;
        container.empty();

        // MINIMAL TEST - just show basic content
        const wrapper = container.createDiv();
        wrapper.style.padding = '20px';
        wrapper.style.backgroundColor = '#f0f0f0';

        wrapper.createEl('h1', { text: 'TRAVEL DASHBOARD' });
        wrapper.createEl('p', { text: 'If you can see this, the view is working!' });

        if (this.data) {
            wrapper.createEl('p', { text: `Trips loaded: ${this.data.trips.length}` });
            wrapper.createEl('p', { text: `Deals loaded: ${this.data.deals.length}` });

            // Show trip names
            if (this.data.trips.length > 0) {
                const list = wrapper.createEl('ul');
                for (const trip of this.data.trips) {
                    list.createEl('li', { text: `${trip.destination} - ${trip.status}` });
                }
            }
        } else {
            wrapper.createEl('p', { text: 'No data loaded yet...' });
        }

        return; // Skip all the complex rendering for now

        // DEBUG: Add inline styles to verify container is working
        (container as HTMLElement).style.backgroundColor = '#f0f0f0';
        (container as HTMLElement).style.padding = '20px';

        // Header
        console.log('[TravelDashboard] Rendering header...');
        this.renderHeader(container);

        // ACTION REQUIRED section (at the very top, before hero)
        console.log('[TravelDashboard] Rendering action required...');
        this.renderActionRequiredSection(container);

        // Hero Section (next upcoming trip with countdown)
        console.log('[TravelDashboard] Rendering hero...');
        this.renderHeroSection(container);

        // Milestones (personal important dates)
        console.log('[TravelDashboard] Rendering milestones...');
        this.renderMilestonesSection(container);

        // Researching (trips in progress)
        console.log('[TravelDashboard] Rendering trips...');
        this.renderTripsSection(container);

        // Deals & Opportunities (right after trips for visibility)
        console.log('[TravelDashboard] Rendering deals...');
        this.renderDealsSection(container);

        // Deadlines
        console.log('[TravelDashboard] Rendering deadlines...');
        this.renderDeadlinesSection(container);

        // Price Tracker
        console.log('[TravelDashboard] Rendering prices...');
        this.renderPricesSection(container);

        // Quick Actions (at bottom since they just copy commands)
        console.log('[TravelDashboard] Rendering actions...');
        this.renderActionsSection(container);

        console.log('[TravelDashboard] Render complete');
    }

    private renderHeader(container: Element) {
        // DEBUG: Simplify to match working deadlines pattern
        const header = container.createDiv({
            text: '=== TRAVEL DASHBOARD ===',
            cls: 'dashboard-header',
            attr: { style: 'background: yellow; padding: 20px; font-size: 24px; font-weight: bold;' }
        });
    }

    private renderActionRequiredSection(container: Element) {
        const actionItems = this.data?.actionItems || [];

        // Only show if there are action items
        if (!actionItems.length) return;

        const section = container.createDiv({ cls: 'action-required-section' });

        // Header with fire emoji
        const header = section.createDiv({ cls: 'action-required-header' });
        header.createSpan({ text: 'ACTION REQUIRED', cls: 'action-required-title' });

        // Action items list
        const list = section.createDiv({ cls: 'action-required-list' });

        for (let i = 0; i < Math.min(actionItems.length, 5); i++) {
            const item = actionItems[i];
            const isLast = i === Math.min(actionItems.length, 5) - 1;

            const itemEl = list.createDiv({
                cls: `action-required-item action-${item.urgency}`
            });

            // Tree connector
            const connector = itemEl.createDiv({ cls: 'action-connector' });
            connector.createSpan({ text: isLast ? '└──' : '├──', cls: 'tree-branch' });

            // Content
            const content = itemEl.createDiv({ cls: 'action-content' });

            if (item.type === 'deal-match' && item.deal) {
                // Deal match: show price prominently
                const priceEl = content.createSpan({ cls: 'action-price' });
                priceEl.setText(`$${item.deal.price}`);

                content.createSpan({ cls: 'action-text' });
                content.lastElementChild?.setText(` ${item.deal.destination} fits your ${item.windowName} window`);

                const meta = content.createDiv({ cls: 'action-meta' });
                meta.createSpan({ text: `${item.daysAway} days away` });
                meta.createSpan({ text: ' - ' });
                meta.createSpan({ text: `${item.deal.percentOff}% below typical`, cls: 'action-discount' });
            } else {
                // Window with no trip
                content.createSpan({ cls: 'action-text' });
                content.lastElementChild?.setText(item.message);

                const meta = content.createDiv({ cls: 'action-meta' });
                meta.createSpan({ text: `${item.daysAway} days` });
                meta.createSpan({ text: ' - ' });
                meta.createSpan({ text: 'NO TRIP PLANNED', cls: 'action-warning' });
            }

            // Click handler
            if (item.deal) {
                itemEl.addEventListener('click', () => {
                    this.copyCommand(`/travel.research ${item.deal?.destination}`);
                });
                itemEl.style.cursor = 'pointer';
            }
        }

        // Show count if more items
        if (actionItems.length > 5) {
            const more = section.createDiv({ cls: 'action-more' });
            more.createSpan({ text: `+ ${actionItems.length - 5} more action items` });
        }
    }

    private renderHeroSection(container: Element) {
        // Mode 1: Committed trip exists - show departure countdown
        if (this.data?.committedTrip) {
            this.renderCommittedTripHero(container, this.data.committedTrip);
            return;
        }

        // Mode 2: No committed trip - show next travel window
        if (this.data?.nextWindow) {
            this.renderTravelWindowHero(container, this.data.nextWindow);
            return;
        }

        // Fallback: No data to show
    }

    private renderCommittedTripHero(container: Element, trip: Trip) {
        const parsed = this.parseTripDates(trip.dates);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let daysUntilDeparture = 0;
        let tripStatus: 'upcoming' | 'traveling' | 'departed' = 'upcoming';

        if (parsed) {
            const daysUntilStart = Math.floor((parsed.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const daysUntilEnd = Math.floor((parsed.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            daysUntilDeparture = daysUntilStart;
            if (daysUntilStart <= 0 && daysUntilEnd >= 0) {
                tripStatus = 'traveling';
            } else if (daysUntilStart < 0) {
                tripStatus = 'departed';
            }
        }

        const hero = container.createDiv({ cls: 'hero-section hero-committed' });

        const content = hero.createDiv({ cls: 'hero-content' });

        // Large destination with country emoji
        const destinationEl = content.createDiv({ cls: 'hero-destination' });
        destinationEl.createSpan({ text: trip.countryCode || '🌍', cls: 'hero-emoji' });
        destinationEl.createSpan({ text: trip.destination, cls: 'hero-destination-name' });

        // Countdown timer
        const countdownEl = content.createDiv({ cls: 'hero-countdown' });
        countdownEl.createSpan({ text: this.formatCountdown(daysUntilDeparture, tripStatus) });

        // Trip dates
        const datesEl = content.createDiv({ cls: 'hero-dates' });
        datesEl.createSpan({ text: trip.dates });
        if (trip.duration && trip.duration !== 'TBD') {
            datesEl.createSpan({ text: ` · ${trip.duration}`, cls: 'hero-duration' });
        }

        // Status badge - show COMMITTED
        const statusEl = content.createDiv({ cls: 'hero-status status-booked' });
        statusEl.createSpan({ text: 'COMMITTED' });

        // Click to open
        hero.addEventListener('click', () => {
            if (trip.filePath) {
                this.app.workspace.openLinkText(trip.filePath, '', false);
            }
        });
        hero.style.cursor = 'pointer';
    }

    private renderTravelWindowHero(container: Element, window: TravelWindow) {
        const hero = container.createDiv({ cls: 'hero-section hero-window' });
        const content = hero.createDiv({ cls: 'hero-content' });

        // Window name with calendar icon
        const titleEl = content.createDiv({ cls: 'hero-destination' });
        titleEl.createSpan({ text: '📅', cls: 'hero-emoji' });
        titleEl.createSpan({ text: window.name, cls: 'hero-destination-name' });

        // Days until window
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntil = Math.floor((window.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const countdownEl = content.createDiv({ cls: 'hero-countdown hero-window-countdown' });
        if (daysUntil > 0) {
            countdownEl.createSpan({ text: `Next travel window in ${daysUntil} days` });
        } else if (daysUntil === 0) {
            countdownEl.createSpan({ text: 'Travel window starts today!' });
        } else {
            countdownEl.createSpan({ text: 'Travel window now open' });
        }

        // Dates and duration
        const datesEl = content.createDiv({ cls: 'hero-dates' });
        datesEl.createSpan({ text: window.dates });
        if (window.duration) {
            datesEl.createSpan({ text: ` · ${window.duration}`, cls: 'hero-duration' });
        }

        // PTO and who can go
        const metaEl = content.createDiv({ cls: 'hero-window-meta' });
        metaEl.createSpan({ text: `${window.ptoNeeded} PTO needed` });
        metaEl.createSpan({ text: ' · ' });
        metaEl.createSpan({ text: window.whoCanGo });

        // If there are trips being researched for this window, show count
        const researchingTrips = this.data?.trips.filter(t =>
            !t.committed && t.status === 'researching'
        ) || [];

        if (researchingTrips.length > 0) {
            const researchEl = content.createDiv({ cls: 'hero-window-research' });
            researchEl.createSpan({
                text: `${researchingTrips.length} destination${researchingTrips.length > 1 ? 's' : ''} being researched`
            });
        }

        // Top pick badge (only show if it's the top pick)
        if (window.isTopPick) {
            const badgeEl = content.createDiv({ cls: 'hero-status status-booked' });
            badgeEl.createSpan({ text: '⭐ TOP PICK' });
        }
    }

    private renderMilestonesSection(container: Element) {
        const milestones = this.data?.milestones || [];

        // Only show milestones within the next 60 days
        const upcoming = milestones.filter(m => m.daysUntil <= 60);

        if (!upcoming.length) return;

        const section = container.createDiv({ cls: 'dashboard-section milestones-section' });
        section.createEl('h3', { text: 'COMING UP' });

        const grid = section.createDiv({ cls: 'milestones-grid' });

        for (const milestone of upcoming) {
            const card = grid.createDiv({ cls: 'milestone-card' });

            // Emoji and name
            const header = card.createDiv({ cls: 'milestone-header' });
            header.createSpan({ text: milestone.emoji, cls: 'milestone-emoji' });
            header.createSpan({ text: milestone.name, cls: 'milestone-name' });

            // Days until
            const countdown = card.createDiv({ cls: 'milestone-countdown' });
            if (milestone.daysUntil === 0) {
                countdown.createSpan({ text: 'Today!', cls: 'milestone-today' });
            } else if (milestone.daysUntil === 1) {
                countdown.createSpan({ text: 'Tomorrow!' });
            } else {
                countdown.createSpan({ text: `${milestone.daysUntil} days` });
            }

            // Date
            const dateEl = card.createDiv({ cls: 'milestone-date' });
            dateEl.createSpan({ text: milestone.date });

            // Trip ideas (if any)
            if (milestone.tripIdeas) {
                const ideas = card.createDiv({ cls: 'milestone-ideas' });
                ideas.createSpan({ text: milestone.tripIdeas });
            }

            // Urgency styling
            if (milestone.daysUntil <= 14) {
                card.addClass('milestone-urgent');
            } else if (milestone.daysUntil <= 30) {
                card.addClass('milestone-soon');
            }
        }
    }

    private findHeroTrip(trips: Trip[]): { trip: Trip; daysUntilDeparture: number; tripStatus: 'upcoming' | 'traveling' | 'departed' } | null {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let bestTrip: { trip: Trip; daysUntilDeparture: number; tripStatus: 'upcoming' | 'traveling' | 'departed' } | null = null;
        let smallestFutureDays = Infinity;

        for (const trip of trips) {
            const parsed = this.parseTripDates(trip.dates);
            if (!parsed) continue;

            const { startDate, endDate } = parsed;
            const daysUntilStart = Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const daysUntilEnd = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            // Currently traveling (between start and end dates)
            if (daysUntilStart <= 0 && daysUntilEnd >= 0) {
                return { trip, daysUntilDeparture: daysUntilStart, tripStatus: 'traveling' };
            }

            // Upcoming trip (start date in the future)
            if (daysUntilStart > 0 && daysUntilStart < smallestFutureDays) {
                smallestFutureDays = daysUntilStart;
                bestTrip = { trip, daysUntilDeparture: daysUntilStart, tripStatus: 'upcoming' };
            }

            // Recently departed (within trip window but started) - fallback if no upcoming
            if (daysUntilStart < 0 && daysUntilEnd >= 0 && !bestTrip) {
                bestTrip = { trip, daysUntilDeparture: daysUntilStart, tripStatus: 'departed' };
            }
        }

        return bestTrip;
    }

    private parseTripDates(tripDates: string): { startDate: Date; endDate: Date } | null {
        // Handle formats like "Mar 15-22, 2025" or "Mar 15 - Apr 2, 2025" or "December 10-15, 2025"
        if (!tripDates || tripDates === 'TBD') {
            return null;
        }

        const monthMap: { [key: string]: number } = {
            'jan': 0, 'january': 0,
            'feb': 1, 'february': 1,
            'mar': 2, 'march': 2,
            'apr': 3, 'april': 3,
            'may': 4,
            'jun': 5, 'june': 5,
            'jul': 6, 'july': 6,
            'aug': 7, 'august': 7,
            'sep': 8, 'september': 8,
            'oct': 9, 'october': 9,
            'nov': 10, 'november': 10,
            'dec': 11, 'december': 11
        };

        try {
            // Pattern 1: "Mar 15-22, 2025" (same month)
            const sameMonthPattern = /^(\w+)\s+(\d+)\s*-\s*(\d+),?\s*(\d{4})$/i;
            let match = tripDates.match(sameMonthPattern);
            if (match) {
                const month = monthMap[match[1].toLowerCase().substring(0, 3)];
                const startDay = parseInt(match[2]);
                const endDay = parseInt(match[3]);
                const year = parseInt(match[4]);

                if (month !== undefined) {
                    const startDate = new Date(year, month, startDay);
                    const endDate = new Date(year, month, endDay);
                    return { startDate, endDate };
                }
            }

            // Pattern 2: "Mar 15 - Apr 2, 2025" (different months)
            const diffMonthPattern = /^(\w+)\s+(\d+)\s*-\s*(\w+)\s+(\d+),?\s*(\d{4})$/i;
            match = tripDates.match(diffMonthPattern);
            if (match) {
                const startMonth = monthMap[match[1].toLowerCase().substring(0, 3)];
                const startDay = parseInt(match[2]);
                const endMonth = monthMap[match[3].toLowerCase().substring(0, 3)];
                const endDay = parseInt(match[4]);
                const year = parseInt(match[5]);

                if (startMonth !== undefined && endMonth !== undefined) {
                    const startDate = new Date(year, startMonth, startDay);
                    const endDate = new Date(year, endMonth, endDay);
                    return { startDate, endDate };
                }
            }

            // Pattern 3: "15-22 Mar 2025" (European format, same month)
            const euroSameMonthPattern = /^(\d+)\s*-\s*(\d+)\s+(\w+),?\s*(\d{4})$/i;
            match = tripDates.match(euroSameMonthPattern);
            if (match) {
                const startDay = parseInt(match[1]);
                const endDay = parseInt(match[2]);
                const month = monthMap[match[3].toLowerCase().substring(0, 3)];
                const year = parseInt(match[4]);

                if (month !== undefined) {
                    const startDate = new Date(year, month, startDay);
                    const endDate = new Date(year, month, endDay);
                    return { startDate, endDate };
                }
            }

            return null;
        } catch {
            return null;
        }
    }

    private formatCountdown(daysUntilDeparture: number, tripStatus: 'upcoming' | 'traveling' | 'departed'): string {
        if (tripStatus === 'traveling') {
            return 'Currently traveling!';
        }

        if (tripStatus === 'departed' || daysUntilDeparture < 0) {
            const daysPast = Math.abs(daysUntilDeparture);
            return `Departed ${daysPast} day${daysPast !== 1 ? 's' : ''} ago`;
        }

        if (daysUntilDeparture === 0) {
            return 'Departing today!';
        }

        if (daysUntilDeparture === 1) {
            return 'Departing tomorrow!';
        }

        return `Departing in ${daysUntilDeparture} days`;
    }

    private renderTripsSection(container: Element) {
        const tripsByStatus = this.data?.tripsByStatus;
        console.log('[TravelDashboard] renderTripsSection - tripsByStatus:', tripsByStatus);
        if (!tripsByStatus) {
            console.log('[TravelDashboard] renderTripsSection - tripsByStatus is null/undefined, returning early');
            return;
        }

        // Define which status groups to show and their display names
        const statusGroups: Array<{ status: keyof typeof tripsByStatus; label: string; showIfEmpty: boolean }> = [
            { status: 'booked', label: 'BOOKED', showIfEmpty: false },
            { status: 'planned', label: 'PLANNED', showIfEmpty: false },
            { status: 'researching', label: 'RESEARCHING', showIfEmpty: false },
            { status: 'idea', label: 'IDEAS', showIfEmpty: false },
        ];

        // Track if any trips were shown
        let anyTripsShown = false;

        for (const { status, label, showIfEmpty } of statusGroups) {
            const trips = tripsByStatus[status];
            console.log(`[TravelDashboard] renderTripsSection - ${status}: ${trips?.length || 0} trips`);
            if (!trips.length && !showIfEmpty) continue;

            const section = container.createDiv({ cls: `dashboard-section trips-${status}` });
            // DEBUG: Make section visible
            (section as HTMLElement).style.backgroundColor = 'lightgreen';
            (section as HTMLElement).style.padding = '10px';
            (section as HTMLElement).style.marginBottom = '10px';
            (section as HTMLElement).style.border = '2px solid green';
            section.createEl('h3', { text: label });

            if (!trips.length) {
                section.createDiv({ text: `No ${label.toLowerCase()} trips`, cls: 'empty-state' });
            } else {
                for (const trip of trips) {
                    console.log(`[TravelDashboard] renderTripsSection - rendering trip card: ${trip.destination}`);
                    this.renderTripCard(section, trip);
                }
                anyTripsShown = true;
            }
        }

        // If no trips at all, show a single empty state
        if (!anyTripsShown) {
            console.log('[TravelDashboard] renderTripsSection - no trips shown, showing empty state');
            const section = container.createDiv({ cls: 'dashboard-section' });
            section.createEl('h3', { text: 'TRIPS' });
            section.createDiv({ text: 'No trips yet. Run /travel.research to start planning!', cls: 'empty-state' });
        }
    }

    private renderTripCard(container: Element, trip: Trip) {
        const card = container.createDiv({ cls: 'travel-trip-card' });

        // Left side content wrapper
        const content = card.createDiv({ cls: 'trip-card-content' });

        // Header with emoji and destination
        const header = content.createDiv({ cls: 'trip-card-header' });
        header.createSpan({ text: trip.countryCode || '🌍', cls: 'trip-emoji' });
        header.createSpan({ text: trip.destination, cls: 'trip-name' });

        // Dates and duration
        const dates = content.createDiv({ cls: 'trip-dates' });
        dates.createSpan({ text: trip.dates });
        if (trip.duration && trip.duration !== 'TBD') {
            dates.createSpan({ text: ` (${trip.duration})`, cls: 'trip-duration' });
        }

        // Meta info - travelers is now a string like "6 (Josh, Adrienne, ...)"
        const meta = content.createDiv({ cls: 'trip-meta' });
        meta.createSpan({ text: trip.travelers || 'TBD' });
        if (trip.budget && trip.budget !== 'TBD') {
            meta.createSpan({ text: ' | ' });
            meta.createSpan({ text: trip.budget });
        }

        // Window badge if set
        if (trip.window) {
            const windowBadge = content.createDiv({ cls: 'trip-window' });
            windowBadge.createSpan({ text: trip.window });
        }

        // Urgent items warning
        if (trip.urgentItems > 0) {
            const urgent = content.createDiv({ cls: 'trip-urgent' });
            urgent.createSpan({ text: `⚠️ ${trip.urgentItems} open question${trip.urgentItems > 1 ? 's' : ''}` });
        }

        // Right side progress ring - only show if trip has actual tasks
        if (trip.totalTasks > 0) {
            const progressWrapper = card.createDiv({ cls: 'trip-card-progress' });
            this.renderProgressRing(progressWrapper, trip.readinessPercent);
        }

        // Click to open trip file
        card.addEventListener('click', () => {
            if (trip.filePath) {
                this.app.workspace.openLinkText(trip.filePath, '', false);
            }
        });
    }

    private renderProgressRing(container: Element, percentage: number) {
        const radius = 20;
        const circumference = 2 * Math.PI * radius; // approximately 125.6
        const strokeDashoffset = circumference * (1 - percentage / 100);

        const svgNS = 'http://www.w3.org/2000/svg';

        // Create SVG element
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'progress-ring');
        svg.setAttribute('width', '50');
        svg.setAttribute('height', '50');
        svg.setAttribute('viewBox', '0 0 50 50');

        // Create gradient definition
        const defs = document.createElementNS(svgNS, 'defs');
        const gradient = document.createElementNS(svgNS, 'linearGradient');
        gradient.setAttribute('id', `progressGradient-${percentage}`);
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');

        const stop1 = document.createElementNS(svgNS, 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#6366f1');
        gradient.appendChild(stop1);

        const stop2 = document.createElementNS(svgNS, 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#4f46e5');
        gradient.appendChild(stop2);

        defs.appendChild(gradient);
        svg.appendChild(defs);

        // Background circle (track)
        const bgCircle = document.createElementNS(svgNS, 'circle');
        bgCircle.setAttribute('class', 'progress-ring-bg');
        bgCircle.setAttribute('cx', '25');
        bgCircle.setAttribute('cy', '25');
        bgCircle.setAttribute('r', radius.toString());
        svg.appendChild(bgCircle);

        // Progress circle (fill)
        const fillCircle = document.createElementNS(svgNS, 'circle');
        fillCircle.setAttribute('class', 'progress-ring-fill');
        fillCircle.setAttribute('cx', '25');
        fillCircle.setAttribute('cy', '25');
        fillCircle.setAttribute('r', radius.toString());
        fillCircle.setAttribute('stroke', `url(#progressGradient-${percentage})`);
        fillCircle.setAttribute('stroke-dasharray', circumference.toString());
        fillCircle.setAttribute('stroke-dashoffset', strokeDashoffset.toString());
        svg.appendChild(fillCircle);

        // Center text showing percentage
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('class', 'progress-ring-text');
        text.setAttribute('x', '25');
        text.setAttribute('y', '25');
        text.textContent = `${percentage}%`;
        svg.appendChild(text);

        container.appendChild(svg);
    }

    private renderDeadlinesSection(container: Element) {
        const section = container.createDiv({ cls: 'dashboard-section' });
        section.createEl('h3', { text: 'UPCOMING DEADLINES' });

        const deadlines = this.data?.deadlines.slice(0, 5) || [];

        if (!deadlines.length) {
            section.createDiv({ text: 'No upcoming deadlines', cls: 'empty-state' });
            return;
        }

        const timeline = section.createDiv({ cls: 'deadline-timeline' });

        for (let i = 0; i < deadlines.length; i++) {
            const deadline = deadlines[i];
            const isLastItem = i === deadlines.length - 1;

            const item = timeline.createDiv({ cls: 'timeline-item' });

            // Left side: connector with node and line
            const connector = item.createDiv({ cls: 'timeline-connector' });

            // Timeline node (circular dot) with urgency class
            const urgencyClass = this.getUrgencyClass(deadline.daysRemaining);
            connector.createDiv({ cls: `timeline-node ${urgencyClass}` });

            // Timeline line (hidden on last item)
            if (!isLastItem) {
                connector.createDiv({ cls: 'timeline-line' });
            }

            // Right side: content with date and description
            const content = item.createDiv({ cls: 'timeline-content' });

            // Date display
            const dateEl = content.createDiv({ cls: 'timeline-date' });
            if (deadline.daysRemaining === 0) {
                dateEl.setText('NOW');
            } else {
                dateEl.setText(`${deadline.daysRemaining} days`);
            }

            // Description with destination
            const descEl = content.createDiv({ cls: 'timeline-desc' });
            descEl.setText(`${deadline.description} (${deadline.destination})`);
        }
    }

    private getUrgencyClass(days: number): string {
        if (days <= 7) return 'node-urgent';
        if (days <= 21) return 'node-soon';
        return 'node-upcoming';
    }

    private renderPricesSection(container: Element) {
        const section = container.createDiv({ cls: 'dashboard-section' });
        section.createEl('h3', { text: 'PRICE TRACKER' });

        const prices = this.data?.prices || [];

        if (!prices.length) {
            section.createDiv({ text: 'No pricing data', cls: 'empty-state' });
            return;
        }

        for (const price of prices) {
            this.renderPriceCard(section, price);
        }
    }

    private renderPriceCard(container: Element, price: PriceSnapshot) {
        const card = container.createDiv({ cls: 'price-tracker-card' });

        // Header
        const header = card.createDiv({ cls: 'price-header' });
        header.createSpan({ text: `${price.destination}: ${price.route}`, cls: 'price-route' });

        // Price
        const priceEl = card.createDiv({ cls: 'price-amount' });
        priceEl.createSpan({ text: `$${price.pricePerPerson.toLocaleString()}/person` });
        if (price.travelers > 1) {
            priceEl.createSpan({
                text: ` (x${price.travelers} = $${price.totalForGroup?.toLocaleString()})`,
                cls: 'price-total',
            });
        }

        // Status and trend
        const statusEl = card.createDiv({ cls: 'price-status' });
        const statusIcon = this.getPriceStatusIcon(price.status);
        const trendIcon = this.getTrendIcon(price.trend);

        statusEl.createSpan({ text: `${statusIcon} ${this.formatStatus(price.status)}` });
        if (price.trend !== 'unknown') {
            statusEl.createSpan({ text: ` | ${trendIcon}`, cls: `price-trend-${price.trend}` });
        }

        // Last updated
        const updated = card.createDiv({ cls: 'price-updated' });
        updated.createSpan({
            text: `Last check: ${price.captureDate} (${price.daysSinceCapture}d ago)`,
            cls: price.daysSinceCapture > 14 ? 'stale' : '',
        });

        // Check now button
        const checkBtn = card.createEl('button', {
            text: 'Check Now',
            cls: 'price-check-btn',
        });
        checkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyCommand(`/travel.pricing ${price.destination}`);
        });

        // Click to open source
        card.addEventListener('click', () => {
            this.app.workspace.openLinkText(price.sourcePath, '', false);
        });
    }

    private getPriceStatusIcon(status: PriceSnapshot['status']): string {
        switch (status) {
            case 'great-deal': return '🟢';
            case 'good-price': return '🟡';
            case 'normal': return '⚪';
            case 'rising': return '🟠';
            case 'high': return '🔴';
            default: return '⚪';
        }
    }

    private getTrendIcon(trend: PriceSnapshot['trend']): string {
        switch (trend) {
            case 'rising': return '↗️ Rising';
            case 'falling': return '↘️ Falling';
            case 'stable': return '→ Stable';
            default: return '';
        }
    }

    private formatStatus(status: PriceSnapshot['status']): string {
        return status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    private renderActionsSection(container: Element) {
        const section = container.createDiv({ cls: 'dashboard-section' });
        section.createEl('h3', { text: 'QUICK ACTIONS' });

        const grid = section.createDiv({ cls: 'action-button-grid' });

        const actions = [
            { icon: '🔄', label: 'Check Prices', command: '/travel.pricing' },
            { icon: '📝', label: 'New Research', command: '/travel.research' },
            { icon: '📅', label: 'Create Itinerary', command: '/travel.itinerary' },
            { icon: '✓', label: 'Validate Data', command: '/travel.validate' },
        ];

        for (const action of actions) {
            const btn = grid.createEl('button', {
                cls: 'action-btn',
            });
            btn.createSpan({ text: `${action.icon} ${action.label}` });
            btn.addEventListener('click', () => {
                this.copyCommand(action.command);
            });
        }
    }

    private renderDealsSection(container: Element) {
        const section = container.createDiv({ cls: 'dashboard-section' });
        section.createEl('h3', { text: 'DEALS & OPPORTUNITIES' });

        const discoveredDeals = this.data?.discoveredDeals || [];

        // Show discovered deals if we have them
        if (discoveredDeals.length > 0) {
            const alertDate = discoveredDeals[0]?.alertDate;
            if (alertDate) {
                const dateLabel = section.createDiv({ cls: 'deals-date-label' });
                dateLabel.createSpan({ text: `From ${alertDate} scan` });
            }

            const dealsGrid = section.createDiv({ cls: 'discovered-deals-grid' });

            for (const deal of discoveredDeals.slice(0, 8)) {
                this.renderDiscoveredDealCard(dealsGrid, deal);
            }

            // Link to full alert
            const viewAll = section.createDiv({ cls: 'deals-view-all' });
            const link = viewAll.createEl('a', { text: 'View full deal alert →' });
            link.addEventListener('click', () => {
                this.app.workspace.openLinkText(`_inbox/${alertDate}-flight-deal-alert.md`, '', false);
            });
            return;
        }

        // Fallback to seasonal deals
        const deals = this.data?.deals.slice(0, 4) || [];

        if (!deals.length) {
            const empty = section.createDiv({ cls: 'empty-state' });
            empty.createSpan({ text: 'No deals found. ' });
            empty.createEl('em', { text: 'Run /travel.deals to scan for opportunities' });
            return;
        }

        for (const deal of deals) {
            const card = section.createDiv({ cls: 'deal-card' });

            const header = card.createDiv({ cls: 'deal-header' });
            header.createSpan({ text: `${deal.emoji} ${deal.destination}`, cls: 'deal-destination' });

            const info = card.createDiv({ cls: 'deal-info' });
            info.createSpan({ text: `${deal.season} - Best: ${deal.bestMonths}` });

            const pricing = card.createDiv({ cls: 'deal-pricing' });
            pricing.createSpan({ text: `Typical: $${deal.typicalPrice}` });
            if (deal.dealThreshold) {
                pricing.createSpan({
                    text: ` | Deal: < $${deal.dealThreshold}`,
                    cls: 'deal-threshold',
                });
            }

            card.addEventListener('click', () => {
                this.copyCommand(`/travel.research ${deal.destination}`);
            });
        }
    }

    private renderDiscoveredDealCard(container: Element, deal: DiscoveredDeal) {
        const card = container.createDiv({ cls: 'discovered-deal-card' });

        // Deal indicator (green circle for great deals)
        const indicator = card.createDiv({ cls: 'deal-indicator deal-great' });

        // Main content
        const content = card.createDiv({ cls: 'deal-content' });

        // Destination with bucket list star
        const destRow = content.createDiv({ cls: 'deal-dest-row' });
        destRow.createSpan({ text: deal.destination, cls: 'deal-destination' });
        if (deal.isBucketList) {
            destRow.createSpan({ text: ' ⭐', cls: 'deal-bucket-list' });
        }

        // Price and discount
        const priceRow = content.createDiv({ cls: 'deal-price-row' });
        priceRow.createSpan({ text: `$${deal.price}`, cls: 'deal-price' });
        priceRow.createSpan({ text: ` (-${deal.percentOff}%)`, cls: 'deal-discount' });

        // Dates (condensed)
        if (deal.dates) {
            const datesRow = content.createDiv({ cls: 'deal-dates-row' });
            datesRow.createSpan({ text: deal.dates, cls: 'deal-dates' });
        }

        // Window match badge
        if (deal.windowMatch) {
            const matchBadge = content.createDiv({ cls: 'deal-window-match' });
            matchBadge.createSpan({ text: `✓ ${deal.windowMatch}` });
        }

        card.addEventListener('click', () => {
            this.copyCommand(`/travel.research ${deal.destination}`);
        });
    }

    private async copyCommand(command: string) {
        try {
            await navigator.clipboard.writeText(command);
            new Notice(`Copied: ${command}`);
        } catch {
            new Notice(`Failed to copy command`);
        }
    }
}
