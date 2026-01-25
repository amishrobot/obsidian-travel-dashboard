export interface Trip {
    id: string;
    destination: string;
    countryCode?: string;
    tripDates: string;
    duration: string;
    travelers: number;
    budget: string;
    status: 'research' | 'planning' | 'booked' | 'traveling' | 'complete';
    committed: boolean;
    readinessPercent: number;
    totalTasks: number;
    urgentItems: number;
    researchPath?: string;
    itineraryPath?: string;
    lastUpdated: Date;
}

export interface TravelWindow {
    name: string;
    dates: string;
    startDate: Date;
    duration: string;
    ptoNeeded: string;
    whoCanGo: string;
    notes?: string;
    isTopPick?: boolean;
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

export interface DashboardData {
    trips: Trip[];
    committedTrip: Trip | null;
    nextWindow: TravelWindow | null;
    deadlines: Deadline[];
    milestones: Milestone[];
    prices: PriceSnapshot[];
    deals: Deal[];
    discoveredDeals: DiscoveredDeal[];
    lastRefresh: Date;
}
