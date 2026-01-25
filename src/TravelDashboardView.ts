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

    async refresh() {
        // Debounce multiple rapid refreshes
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        this.refreshTimeout = setTimeout(async () => {
            this.data = await this.plugin.dataService.loadAll();
            this.render();
        }, 100);
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

        // Header with emoji and destination
        const header = card.createDiv({ cls: 'trip-card-header' });
        header.createSpan({ text: trip.countryCode || '🌍', cls: 'trip-emoji' });
        header.createSpan({ text: trip.destination, cls: 'trip-name' });

        // Dates and duration
        const dates = card.createDiv({ cls: 'trip-dates' });
        dates.createSpan({ text: trip.tripDates });
        if (trip.duration && trip.duration !== 'TBD') {
            dates.createSpan({ text: ` (${trip.duration})`, cls: 'trip-duration' });
        }

        // Meta info
        const meta = card.createDiv({ cls: 'trip-meta' });
        meta.createSpan({ text: `${trip.travelers} traveler${trip.travelers > 1 ? 's' : ''}` });
        if (trip.budget && trip.budget !== 'TBD') {
            meta.createSpan({ text: ' | ' });
            meta.createSpan({ text: trip.budget });
        }

        // Status badge
        const statusClass = `status-${trip.status}`;
        const status = card.createDiv({ cls: `trip-status ${statusClass}` });
        status.createSpan({ text: trip.status.toUpperCase() });

        // Progress bar
        const progressContainer = card.createDiv({ cls: 'trip-progress' });
        const progressBar = progressContainer.createDiv({ cls: 'progress-bar' });
        const progressFill = progressBar.createDiv({ cls: 'progress-fill' });
        progressFill.style.width = `${trip.readinessPercent}%`;
        progressContainer.createSpan({
            text: `${trip.readinessPercent}% ready`,
            cls: 'progress-text',
        });

        // Urgent items warning
        if (trip.urgentItems > 0) {
            const urgent = card.createDiv({ cls: 'trip-urgent' });
            urgent.createSpan({ text: `⚠️ ${trip.urgentItems} urgent item${trip.urgentItems > 1 ? 's' : ''}` });
        }

        // Click to open itinerary or research
        card.addEventListener('click', () => {
            const path = trip.itineraryPath || trip.researchPath;
            if (path) {
                this.app.workspace.openLinkText(path, '', false);
            }
        });
    }

    private renderDeadlinesSection(container: Element) {
        const section = container.createDiv({ cls: 'dashboard-section' });
        section.createEl('h3', { text: 'UPCOMING DEADLINES' });

        const deadlines = this.data?.deadlines.slice(0, 5) || [];

        if (!deadlines.length) {
            section.createDiv({ text: 'No upcoming deadlines', cls: 'empty-state' });
            return;
        }

        const list = section.createDiv({ cls: 'deadline-list' });

        for (const deadline of deadlines) {
            const item = list.createDiv({ cls: 'deadline-item' });

            // Urgency indicator
            const urgencyClass = this.getUrgencyClass(deadline.daysRemaining);
            const indicator = item.createDiv({ cls: `deadline-indicator ${urgencyClass}` });

            if (deadline.daysRemaining === 0) {
                indicator.createSpan({ text: 'NOW' });
            } else {
                indicator.createSpan({ text: `${deadline.daysRemaining}d` });
            }

            // Description
            const desc = item.createDiv({ cls: 'deadline-desc' });
            desc.createSpan({ text: deadline.description });
            desc.createSpan({ text: ` (${deadline.destination})`, cls: 'deadline-dest' });
        }
    }

    private getUrgencyClass(days: number): string {
        if (days <= 7) return 'urgent-red';
        if (days <= 21) return 'urgent-yellow';
        return 'urgent-green';
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

    private copyCommand(command: string) {
        navigator.clipboard.writeText(command);
        new Notice(`Copied: ${command}`);
    }
}
