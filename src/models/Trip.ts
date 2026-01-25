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

export interface DashboardData {
    trips: Trip[];
    committedTrip: Trip | null;
    nextWindow: TravelWindow | null;
    deadlines: Deadline[];
    prices: PriceSnapshot[];
    deals: Deal[];
    lastRefresh: Date;
}
