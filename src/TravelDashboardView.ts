import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import TravelDashboardPlugin from './main';
import { DashboardData, Trip, Deadline, PriceSnapshot, Deal } from './models/Trip';

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
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('travel-dashboard');

        if (!this.data) {
            container.createEl('div', { text: 'Loading...', cls: 'travel-loading' });
            return;
        }

        // Header
        this.renderHeader(container);

        // Hero Section (next upcoming trip with countdown)
        this.renderHeroSection(container);

        // Quick Actions (at the top for easy access)
        this.renderActionsSection(container);

        // Active Trips
        this.renderTripsSection(container);

        // Deadlines
        this.renderDeadlinesSection(container);

        // Price Tracker
        this.renderPricesSection(container);

        // Deals
        this.renderDealsSection(container);
    }

    private renderHeader(container: Element) {
        const header = container.createDiv({ cls: 'dashboard-header' });
        header.createEl('h2', { text: 'TRAVEL DASHBOARD' });

        const refreshBtn = header.createEl('button', {
            cls: 'refresh-btn',
            attr: { 'aria-label': 'Refresh' },
        });
        refreshBtn.innerHTML = '⟳';
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.addClass('spinning');
            await this.refresh();
            refreshBtn.removeClass('spinning');
            new Notice('Travel data refreshed');
        });
    }

    private renderHeroSection(container: Element) {
        if (!this.data?.trips.length) {
            return;
        }

        // Find the next upcoming trip (or currently traveling)
        const heroTrip = this.findHeroTrip(this.data.trips);
        if (!heroTrip) {
            return;
        }

        const { trip, daysUntilDeparture, tripStatus } = heroTrip;

        const hero = container.createDiv({ cls: 'hero-section' });

        // Travel-themed decoration (airplane icon)
        const decoration = hero.createDiv({ cls: 'hero-decoration' });
        decoration.innerHTML = '&#9992;'; // Airplane symbol

        // Main content wrapper
        const content = hero.createDiv({ cls: 'hero-content' });

        // Large destination with country emoji
        const destinationEl = content.createDiv({ cls: 'hero-destination' });
        destinationEl.createSpan({ text: trip.countryCode || '🌍', cls: 'hero-emoji' });
        destinationEl.createSpan({ text: trip.destination, cls: 'hero-destination-name' });

        // Countdown timer
        const countdownEl = content.createDiv({ cls: 'hero-countdown' });
        countdownEl.createSpan({ text: this.formatCountdown(daysUntilDeparture, tripStatus) });

        // Trip dates prominently displayed
        const datesEl = content.createDiv({ cls: 'hero-dates' });
        datesEl.createSpan({ text: trip.tripDates });
        if (trip.duration && trip.duration !== 'TBD') {
            datesEl.createSpan({ text: ` · ${trip.duration}`, cls: 'hero-duration' });
        }

        // Status badge
        const statusClass = `status-${trip.status}`;
        const statusEl = content.createDiv({ cls: `hero-status ${statusClass}` });
        statusEl.createSpan({ text: trip.status.toUpperCase() });

        // Make the hero section clickable
        hero.addEventListener('click', () => {
            const path = trip.itineraryPath || trip.researchPath;
            if (path) {
                this.app.workspace.openLinkText(path, '', false);
            }
        });

        // Add clickable cursor style
        hero.style.cursor = 'pointer';
    }

    private findHeroTrip(trips: Trip[]): { trip: Trip; daysUntilDeparture: number; tripStatus: 'upcoming' | 'traveling' | 'departed' } | null {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let bestTrip: { trip: Trip; daysUntilDeparture: number; tripStatus: 'upcoming' | 'traveling' | 'departed' } | null = null;
        let smallestFutureDays = Infinity;

        for (const trip of trips) {
            const parsed = this.parseTripDates(trip.tripDates);
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
        const section = container.createDiv({ cls: 'dashboard-section' });
        section.createEl('h3', { text: 'ACTIVE TRIPS' });

        if (!this.data?.trips.length) {
            section.createDiv({ text: 'No active trips', cls: 'empty-state' });
            return;
        }

        for (const trip of this.data.trips) {
            this.renderTripCard(section, trip);
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
        dates.createSpan({ text: trip.tripDates });
        if (trip.duration && trip.duration !== 'TBD') {
            dates.createSpan({ text: ` (${trip.duration})`, cls: 'trip-duration' });
        }

        // Meta info
        const meta = content.createDiv({ cls: 'trip-meta' });
        meta.createSpan({ text: `${trip.travelers} traveler${trip.travelers > 1 ? 's' : ''}` });
        if (trip.budget && trip.budget !== 'TBD') {
            meta.createSpan({ text: ' | ' });
            meta.createSpan({ text: trip.budget });
        }

        // Status badge
        const statusClass = `status-${trip.status}`;
        const status = content.createDiv({ cls: `trip-status ${statusClass}` });
        status.createSpan({ text: trip.status.toUpperCase() });

        // Urgent items warning
        if (trip.urgentItems > 0) {
            const urgent = content.createDiv({ cls: 'trip-urgent' });
            urgent.createSpan({ text: `⚠️ ${trip.urgentItems} urgent item${trip.urgentItems > 1 ? 's' : ''}` });
        }

        // Right side progress ring - only show if trip has actual tasks
        if (trip.totalTasks > 0) {
            const progressWrapper = card.createDiv({ cls: 'trip-card-progress' });
            this.renderProgressRing(progressWrapper, trip.readinessPercent);
        }

        // Click to open itinerary or research
        card.addEventListener('click', () => {
            const path = trip.itineraryPath || trip.researchPath;
            if (path) {
                this.app.workspace.openLinkText(path, '', false);
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

        const deals = this.data?.deals.slice(0, 4) || [];

        if (!deals.length) {
            section.createDiv({ text: 'No seasonal deals found', cls: 'empty-state' });
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

    private async copyCommand(command: string) {
        try {
            await navigator.clipboard.writeText(command);
            new Notice(`Copied: ${command}`);
        } catch {
            new Notice(`Failed to copy command`);
        }
    }
}
