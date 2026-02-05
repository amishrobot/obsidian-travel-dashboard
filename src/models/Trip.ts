/**
 * Trip status lifecycle following the trip-schema.md
 * idea --> researching --> planned --> booked --> complete
 */
export type TripStatus = 'idea' | 'researching' | 'planned' | 'booked' | 'complete';

export interface Trip {
    id: string;
    destination: string;
    countryCode?: string;
    dates: string;           // From frontmatter 'dates' field
    duration?: string;
    travelers: string;       // Now a string like "6 (Josh, Adrienne, ...)"
    budget?: string;
    status: TripStatus;
    committed: boolean;
    window?: string;         // Travel window name from profile
    readinessPercent: number;
    totalTasks: number;
    urgentItems: number;
    filePath: string;        // Path to the trip file
    created: string;         // ISO date when file was created
    updated?: string;        // ISO date when last updated
    flightConfirmation?: string;
    hotelConfirmation?: string;
    lastUpdated: Date;
}

export interface TravelWindow {
    name: string;
    dates: string;
    startDate: Date;
    endDate: Date;
    duration: string;
    ptoNeeded: string;
    whoCanGo: string;
    notes?: string;
    isTopPick?: boolean;
}

export interface ActionItem {
    type: 'deal-match' | 'window-no-trip';
    urgency: 'high' | 'medium' | 'low';
    daysAway: number;
    message: string;
    subMessage?: string;
    destination?: string;
    windowName?: string;
    deal?: DiscoveredDeal;
}

export interface Deadline {
    id: string;
    destination: string;
    description: string;
    date: string;
    daysRemaining: number;
    priority: 'urgent' | 'soon' | 'upcoming';
    source: string;
}

export interface Milestone {
    id: string;
    name: string;           // e.g., "Adrienne Day", "Anniversary"
    date: string;           // e.g., "Feb 9"
    monthDay: number[];     // [month, day] for calculation
    tripIdeas?: string;     // e.g., "Romantic getaway"
    daysUntil: number;
    emoji: string;
}

export interface PriceSnapshot {
    destination: string;
    route: string;
    pricePerPerson: number;
    totalForGroup?: number;
    travelers: number;
    captureDate: string;
    daysSinceCapture: number;
    trend: 'rising' | 'falling' | 'stable' | 'unknown';
    status: 'great-deal' | 'good-price' | 'normal' | 'rising' | 'high';
    sourcePath: string;
}

export interface Deal {
    destination: string;
    emoji: string;
    season: string;
    bestMonths: string;
    typicalPrice: number;
    dealThreshold: number;
    tripType: string;
}

export interface DiscoveredDeal {
    destination: string;
    price: number;
    typicalPrice: number;
    percentOff: number;
    dates: string;
    isBucketList: boolean;
    windowMatch?: string;  // e.g., "Spring Break", "Memorial Day"
    alertDate: string;
}

/**
 * Trips grouped by status for dashboard display
 */
export interface TripsByStatus {
    idea: Trip[];
    researching: Trip[];
    planned: Trip[];
    booked: Trip[];
    complete: Trip[];
}

export interface DashboardData {
    trips: Trip[];
    tripsByStatus: TripsByStatus;
    committedTrip: Trip | null;
    nextWindow: TravelWindow | null;
    travelWindows: TravelWindow[];
    actionItems: ActionItem[];
    deadlines: Deadline[];
    milestones: Milestone[];
    prices: PriceSnapshot[];
    deals: Deal[];
    discoveredDeals: DiscoveredDeal[];
    lastRefresh: Date;
}
