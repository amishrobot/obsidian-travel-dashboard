var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TravelDashboardPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/TravelDashboardView.ts
var import_obsidian = require("obsidian");
var VIEW_TYPE_TRAVEL_DASHBOARD = "travel-dashboard-view";
var TravelDashboardView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.data = null;
    this.refreshTimeout = null;
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_TRAVEL_DASHBOARD;
  }
  getDisplayText() {
    return "Travel Dashboard";
  }
  getIcon() {
    return "plane";
  }
  async onOpen() {
    await this.refresh();
  }
  async onClose() {
  }
  async refresh() {
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
    if (!this.data) {
      container.innerHTML = '<div style="padding:20px;">Loading...</div>';
      return;
    }
    let html = `<div style="padding: 16px; font-family: var(--font-interface); overflow-y: auto;">`;
    html += `<h2 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; letter-spacing: 0.05em; color: var(--text-muted);">TRAVEL DASHBOARD</h2>`;
    if (this.data.committedTrip) {
      const trip = this.data.committedTrip;
      html += `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 16px;">
                    <div style="font-size: 24px; font-weight: bold;">${trip.destination}</div>
                    <div style="opacity: 0.9; margin-top: 4px;">${trip.dates}</div>
                    <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">COMMITTED</div>
                </div>
            `;
    } else if (this.data.nextWindow) {
      const w = this.data.nextWindow;
      html += `
                <div style="background: var(--background-secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 3px solid var(--interactive-accent);">
                    <div style="font-weight: 600;">Next Window: ${w.name}</div>
                    <div style="color: var(--text-muted); font-size: 13px;">${w.dates} \xB7 ${w.duration}</div>
                </div>
            `;
    }
    if (this.data.milestones.length > 0) {
      const upcoming = this.data.milestones.filter((m) => m.daysUntil <= 90);
      if (upcoming.length > 0) {
        html += `<h3 style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin: 20px 0 8px 0; letter-spacing: 0.05em;">COMING UP</h3>`;
        for (const m of upcoming) {
          const urgency = m.daysUntil <= 14 ? "#e74c3c" : m.daysUntil <= 30 ? "#f39c12" : "var(--text-muted)";
          html += `
                        <div style="background: var(--background-secondary); padding: 10px 14px; margin-bottom: 6px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                            <span>${m.emoji} ${m.name}</span>
                            <span style="color: ${urgency}; font-weight: 500;">${m.daysUntil === 0 ? "Today!" : m.daysUntil === 1 ? "Tomorrow!" : m.daysUntil + " days"}</span>
                        </div>
                    `;
        }
      }
    }
    if (this.data.travelWindows.length > 0) {
      const now = /* @__PURE__ */ new Date();
      const upcomingWindows = this.data.travelWindows.filter((w) => w.startDate > now).slice(0, 4);
      if (upcomingWindows.length > 0) {
        html += `<h3 style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin: 20px 0 8px 0; letter-spacing: 0.05em;">TRAVEL WINDOWS</h3>`;
        for (const w of upcomingWindows) {
          const daysUntil = Math.floor((w.startDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
          const isTopPick = w.isTopPick ? "\u2B50 " : "";
          html += `
                        <div style="background: var(--background-secondary); padding: 12px 14px; margin-bottom: 6px; border-radius: 6px;${w.isTopPick ? " border-left: 3px solid #f39c12;" : ""}">
                            <div style="font-weight: 600;">${isTopPick}${w.name}</div>
                            <div style="color: var(--text-muted); font-size: 12px; margin-top: 4px;">${w.dates} \xB7 ${w.duration} \xB7 ${w.ptoNeeded} PTO</div>
                            <div style="color: var(--text-faint); font-size: 11px; margin-top: 2px;">${daysUntil} days away \xB7 ${w.whoCanGo}</div>
                        </div>
                    `;
        }
      }
    }
    const statuses = ["booked", "planned", "researching", "idea"];
    for (const status of statuses) {
      const trips = this.data.tripsByStatus[status];
      if (trips.length > 0) {
        html += `<h3 style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin: 20px 0 8px 0; letter-spacing: 0.05em;">${status.toUpperCase()}</h3>`;
        for (const trip of trips) {
          const borderColor = status === "booked" ? "#4CAF50" : status === "planned" ? "#2196F3" : status === "researching" ? "#FF9800" : "#9E9E9E";
          html += `
                        <div style="background: var(--background-secondary); padding: 12px 16px; margin-bottom: 8px; border-radius: 8px; border-left: 3px solid ${borderColor}; cursor: pointer;" onclick="app.workspace.openLinkText('${trip.filePath}', '', false)">
                            <div style="font-weight: 600; font-size: 15px;">${trip.countryCode || "\u{1F30D}"} ${trip.destination}</div>
                            <div style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">${trip.dates}${trip.duration ? " \xB7 " + trip.duration : ""}</div>
                            <div style="color: var(--text-muted); font-size: 12px; margin-top: 2px;">${trip.travelers}</div>
                        </div>
                    `;
        }
      }
    }
    if (this.data.discoveredDeals.length > 0) {
      html += `<h3 style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin: 20px 0 8px 0; letter-spacing: 0.05em;">DEALS</h3>`;
      for (const deal of this.data.discoveredDeals.slice(0, 5)) {
        html += `
                    <div style="background: var(--background-secondary); padding: 10px 14px; margin-bottom: 6px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                        <span>${deal.destination}</span>
                        <span style="color: #4CAF50; font-weight: 600;">$${deal.price} <span style="font-size: 11px; opacity: 0.7;">(-${deal.percentOff}%)</span></span>
                    </div>
                `;
      }
    }
    html += `<h3 style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin: 20px 0 8px 0; letter-spacing: 0.05em;">DEADLINES</h3>`;
    if (this.data.deadlines.length === 0) {
      html += `<p style="color: var(--text-muted); font-size: 13px;">No upcoming deadlines</p>`;
    } else {
      for (const d of this.data.deadlines.slice(0, 5)) {
        html += `<div style="padding: 8px 0; border-bottom: 1px solid var(--background-modifier-border); font-size: 13px;">${d.description} \xB7 ${d.destination}</div>`;
      }
    }
    if (this.data.prices.length > 0) {
      html += `<h3 style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin: 20px 0 8px 0; letter-spacing: 0.05em;">PRICES</h3>`;
      for (const p of this.data.prices) {
        html += `
                    <div style="background: var(--background-secondary); padding: 10px 14px; margin-bottom: 6px; border-radius: 6px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>${p.destination}</span>
                            <span style="font-weight: 600;">$${p.pricePerPerson}/person</span>
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${p.route} \xB7 ${p.daysSinceCapture}d ago</div>
                    </div>
                `;
      }
    }
    html += `</div>`;
    container.innerHTML = html;
  }
  renderHeader(container) {
    const header = container.createDiv({ cls: "dashboard-header" });
    header.createEl("h2", { text: "TRAVEL DASHBOARD" });
    const refreshBtn = header.createEl("button", {
      cls: "refresh-btn",
      attr: { "aria-label": "Refresh" }
    });
    refreshBtn.innerHTML = "\u27F3";
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.addClass("spinning");
      await this.refresh();
      refreshBtn.removeClass("spinning");
      new import_obsidian.Notice("Travel data refreshed");
    });
  }
  renderActionRequiredSection(container) {
    var _a, _b, _c;
    const actionItems = ((_a = this.data) == null ? void 0 : _a.actionItems) || [];
    if (!actionItems.length)
      return;
    const section = container.createDiv({ cls: "action-required-section" });
    const header = section.createDiv({ cls: "action-required-header" });
    header.createSpan({ text: "ACTION REQUIRED", cls: "action-required-title" });
    const list = section.createDiv({ cls: "action-required-list" });
    for (let i = 0; i < Math.min(actionItems.length, 5); i++) {
      const item = actionItems[i];
      const isLast = i === Math.min(actionItems.length, 5) - 1;
      const itemEl = list.createDiv({
        cls: `action-required-item action-${item.urgency}`
      });
      const connector = itemEl.createDiv({ cls: "action-connector" });
      connector.createSpan({ text: isLast ? "\u2514\u2500\u2500" : "\u251C\u2500\u2500", cls: "tree-branch" });
      const content = itemEl.createDiv({ cls: "action-content" });
      if (item.type === "deal-match" && item.deal) {
        const priceEl = content.createSpan({ cls: "action-price" });
        priceEl.setText(`$${item.deal.price}`);
        content.createSpan({ cls: "action-text" });
        (_b = content.lastElementChild) == null ? void 0 : _b.setText(` ${item.deal.destination} fits your ${item.windowName} window`);
        const meta = content.createDiv({ cls: "action-meta" });
        meta.createSpan({ text: `${item.daysAway} days away` });
        meta.createSpan({ text: " - " });
        meta.createSpan({ text: `${item.deal.percentOff}% below typical`, cls: "action-discount" });
      } else {
        content.createSpan({ cls: "action-text" });
        (_c = content.lastElementChild) == null ? void 0 : _c.setText(item.message);
        const meta = content.createDiv({ cls: "action-meta" });
        meta.createSpan({ text: `${item.daysAway} days` });
        meta.createSpan({ text: " - " });
        meta.createSpan({ text: "NO TRIP PLANNED", cls: "action-warning" });
      }
      if (item.deal) {
        itemEl.addEventListener("click", () => {
          var _a2;
          this.copyCommand(`/travel.research ${(_a2 = item.deal) == null ? void 0 : _a2.destination}`);
        });
        itemEl.style.cursor = "pointer";
      }
    }
    if (actionItems.length > 5) {
      const more = section.createDiv({ cls: "action-more" });
      more.createSpan({ text: `+ ${actionItems.length - 5} more action items` });
    }
  }
  renderHeroSection(container) {
    var _a, _b;
    if ((_a = this.data) == null ? void 0 : _a.committedTrip) {
      this.renderCommittedTripHero(container, this.data.committedTrip);
      return;
    }
    if ((_b = this.data) == null ? void 0 : _b.nextWindow) {
      this.renderTravelWindowHero(container, this.data.nextWindow);
      return;
    }
  }
  renderCommittedTripHero(container, trip) {
    const parsed = this.parseTripDates(trip.dates);
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    let daysUntilDeparture = 0;
    let tripStatus = "upcoming";
    if (parsed) {
      const daysUntilStart = Math.floor((parsed.startDate.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
      const daysUntilEnd = Math.floor((parsed.endDate.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
      daysUntilDeparture = daysUntilStart;
      if (daysUntilStart <= 0 && daysUntilEnd >= 0) {
        tripStatus = "traveling";
      } else if (daysUntilStart < 0) {
        tripStatus = "departed";
      }
    }
    const hero = container.createDiv({ cls: "hero-section hero-committed" });
    const content = hero.createDiv({ cls: "hero-content" });
    const destinationEl = content.createDiv({ cls: "hero-destination" });
    destinationEl.createSpan({ text: trip.countryCode || "\u{1F30D}", cls: "hero-emoji" });
    destinationEl.createSpan({ text: trip.destination, cls: "hero-destination-name" });
    const countdownEl = content.createDiv({ cls: "hero-countdown" });
    countdownEl.createSpan({ text: this.formatCountdown(daysUntilDeparture, tripStatus) });
    const datesEl = content.createDiv({ cls: "hero-dates" });
    datesEl.createSpan({ text: trip.dates });
    if (trip.duration && trip.duration !== "TBD") {
      datesEl.createSpan({ text: ` \xB7 ${trip.duration}`, cls: "hero-duration" });
    }
    const statusEl = content.createDiv({ cls: "hero-status status-booked" });
    statusEl.createSpan({ text: "COMMITTED" });
    hero.addEventListener("click", () => {
      if (trip.filePath) {
        this.app.workspace.openLinkText(trip.filePath, "", false);
      }
    });
    hero.style.cursor = "pointer";
  }
  renderTravelWindowHero(container, window) {
    var _a;
    const hero = container.createDiv({ cls: "hero-section hero-window" });
    const content = hero.createDiv({ cls: "hero-content" });
    const titleEl = content.createDiv({ cls: "hero-destination" });
    titleEl.createSpan({ text: "\u{1F4C5}", cls: "hero-emoji" });
    titleEl.createSpan({ text: window.name, cls: "hero-destination-name" });
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.floor((window.startDate.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
    const countdownEl = content.createDiv({ cls: "hero-countdown hero-window-countdown" });
    if (daysUntil > 0) {
      countdownEl.createSpan({ text: `Next travel window in ${daysUntil} days` });
    } else if (daysUntil === 0) {
      countdownEl.createSpan({ text: "Travel window starts today!" });
    } else {
      countdownEl.createSpan({ text: "Travel window now open" });
    }
    const datesEl = content.createDiv({ cls: "hero-dates" });
    datesEl.createSpan({ text: window.dates });
    if (window.duration) {
      datesEl.createSpan({ text: ` \xB7 ${window.duration}`, cls: "hero-duration" });
    }
    const metaEl = content.createDiv({ cls: "hero-window-meta" });
    metaEl.createSpan({ text: `${window.ptoNeeded} PTO needed` });
    metaEl.createSpan({ text: " \xB7 " });
    metaEl.createSpan({ text: window.whoCanGo });
    const researchingTrips = ((_a = this.data) == null ? void 0 : _a.trips.filter(
      (t) => !t.committed && t.status === "researching"
    )) || [];
    if (researchingTrips.length > 0) {
      const researchEl = content.createDiv({ cls: "hero-window-research" });
      researchEl.createSpan({
        text: `${researchingTrips.length} destination${researchingTrips.length > 1 ? "s" : ""} being researched`
      });
    }
    if (window.isTopPick) {
      const badgeEl = content.createDiv({ cls: "hero-status status-booked" });
      badgeEl.createSpan({ text: "\u2B50 TOP PICK" });
    }
  }
  renderMilestonesSection(container) {
    var _a;
    const milestones = ((_a = this.data) == null ? void 0 : _a.milestones) || [];
    const upcoming = milestones.filter((m) => m.daysUntil <= 60);
    if (!upcoming.length)
      return;
    const section = container.createDiv({ cls: "dashboard-section milestones-section" });
    section.createEl("h3", { text: "COMING UP" });
    const grid = section.createDiv({ cls: "milestones-grid" });
    for (const milestone of upcoming) {
      const card = grid.createDiv({ cls: "milestone-card" });
      const header = card.createDiv({ cls: "milestone-header" });
      header.createSpan({ text: milestone.emoji, cls: "milestone-emoji" });
      header.createSpan({ text: milestone.name, cls: "milestone-name" });
      const countdown = card.createDiv({ cls: "milestone-countdown" });
      if (milestone.daysUntil === 0) {
        countdown.createSpan({ text: "Today!", cls: "milestone-today" });
      } else if (milestone.daysUntil === 1) {
        countdown.createSpan({ text: "Tomorrow!" });
      } else {
        countdown.createSpan({ text: `${milestone.daysUntil} days` });
      }
      const dateEl = card.createDiv({ cls: "milestone-date" });
      dateEl.createSpan({ text: milestone.date });
      if (milestone.tripIdeas) {
        const ideas = card.createDiv({ cls: "milestone-ideas" });
        ideas.createSpan({ text: milestone.tripIdeas });
      }
      if (milestone.daysUntil <= 14) {
        card.addClass("milestone-urgent");
      } else if (milestone.daysUntil <= 30) {
        card.addClass("milestone-soon");
      }
    }
  }
  findHeroTrip(trips) {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    let bestTrip = null;
    let smallestFutureDays = Infinity;
    for (const trip of trips) {
      const parsed = this.parseTripDates(trip.dates);
      if (!parsed)
        continue;
      const { startDate, endDate } = parsed;
      const daysUntilStart = Math.floor((startDate.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
      const daysUntilEnd = Math.floor((endDate.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
      if (daysUntilStart <= 0 && daysUntilEnd >= 0) {
        return { trip, daysUntilDeparture: daysUntilStart, tripStatus: "traveling" };
      }
      if (daysUntilStart > 0 && daysUntilStart < smallestFutureDays) {
        smallestFutureDays = daysUntilStart;
        bestTrip = { trip, daysUntilDeparture: daysUntilStart, tripStatus: "upcoming" };
      }
      if (daysUntilStart < 0 && daysUntilEnd >= 0 && !bestTrip) {
        bestTrip = { trip, daysUntilDeparture: daysUntilStart, tripStatus: "departed" };
      }
    }
    return bestTrip;
  }
  parseTripDates(tripDates) {
    if (!tripDates || tripDates === "TBD") {
      return null;
    }
    const monthMap = {
      "jan": 0,
      "january": 0,
      "feb": 1,
      "february": 1,
      "mar": 2,
      "march": 2,
      "apr": 3,
      "april": 3,
      "may": 4,
      "jun": 5,
      "june": 5,
      "jul": 6,
      "july": 6,
      "aug": 7,
      "august": 7,
      "sep": 8,
      "september": 8,
      "oct": 9,
      "october": 9,
      "nov": 10,
      "november": 10,
      "dec": 11,
      "december": 11
    };
    try {
      const sameMonthPattern = /^(\w+)\s+(\d+)\s*-\s*(\d+),?\s*(\d{4})$/i;
      let match = tripDates.match(sameMonthPattern);
      if (match) {
        const month = monthMap[match[1].toLowerCase().substring(0, 3)];
        const startDay = parseInt(match[2]);
        const endDay = parseInt(match[3]);
        const year = parseInt(match[4]);
        if (month !== void 0) {
          const startDate = new Date(year, month, startDay);
          const endDate = new Date(year, month, endDay);
          return { startDate, endDate };
        }
      }
      const diffMonthPattern = /^(\w+)\s+(\d+)\s*-\s*(\w+)\s+(\d+),?\s*(\d{4})$/i;
      match = tripDates.match(diffMonthPattern);
      if (match) {
        const startMonth = monthMap[match[1].toLowerCase().substring(0, 3)];
        const startDay = parseInt(match[2]);
        const endMonth = monthMap[match[3].toLowerCase().substring(0, 3)];
        const endDay = parseInt(match[4]);
        const year = parseInt(match[5]);
        if (startMonth !== void 0 && endMonth !== void 0) {
          const startDate = new Date(year, startMonth, startDay);
          const endDate = new Date(year, endMonth, endDay);
          return { startDate, endDate };
        }
      }
      const euroSameMonthPattern = /^(\d+)\s*-\s*(\d+)\s+(\w+),?\s*(\d{4})$/i;
      match = tripDates.match(euroSameMonthPattern);
      if (match) {
        const startDay = parseInt(match[1]);
        const endDay = parseInt(match[2]);
        const month = monthMap[match[3].toLowerCase().substring(0, 3)];
        const year = parseInt(match[4]);
        if (month !== void 0) {
          const startDate = new Date(year, month, startDay);
          const endDate = new Date(year, month, endDay);
          return { startDate, endDate };
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  formatCountdown(daysUntilDeparture, tripStatus) {
    if (tripStatus === "traveling") {
      return "Currently traveling!";
    }
    if (tripStatus === "departed" || daysUntilDeparture < 0) {
      const daysPast = Math.abs(daysUntilDeparture);
      return `Departed ${daysPast} day${daysPast !== 1 ? "s" : ""} ago`;
    }
    if (daysUntilDeparture === 0) {
      return "Departing today!";
    }
    if (daysUntilDeparture === 1) {
      return "Departing tomorrow!";
    }
    return `Departing in ${daysUntilDeparture} days`;
  }
  renderTripsSection(container) {
    var _a;
    const tripsByStatus = (_a = this.data) == null ? void 0 : _a.tripsByStatus;
    console.log("[TravelDashboard] renderTripsSection - tripsByStatus:", tripsByStatus);
    console.log("[TravelDashboard] renderTripsSection - planned trips:", tripsByStatus == null ? void 0 : tripsByStatus.planned);
    if (!tripsByStatus) {
      console.log("[TravelDashboard] renderTripsSection - NO tripsByStatus, returning");
      return;
    }
    const statusGroups = [
      { status: "booked", label: "BOOKED", showIfEmpty: false },
      { status: "planned", label: "PLANNED", showIfEmpty: false },
      { status: "researching", label: "RESEARCHING", showIfEmpty: false },
      { status: "idea", label: "IDEAS", showIfEmpty: false }
    ];
    let anyTripsShown = false;
    for (const { status, label, showIfEmpty } of statusGroups) {
      const trips = tripsByStatus[status];
      if (!trips.length && !showIfEmpty)
        continue;
      const section = container.createDiv({ cls: `dashboard-section trips-${status}` });
      section.createEl("h3", { text: label });
      if (!trips.length) {
        section.createDiv({ text: `No ${label.toLowerCase()} trips`, cls: "empty-state" });
      } else {
        for (const trip of trips) {
          this.renderTripCard(section, trip);
        }
        anyTripsShown = true;
      }
    }
    if (!anyTripsShown) {
      const section = container.createDiv({ cls: "dashboard-section" });
      section.createEl("h3", { text: "TRIPS" });
      section.createDiv({ text: "No trips yet. Run /travel.research to start planning!", cls: "empty-state" });
    }
  }
  renderTripCard(container, trip) {
    const card = container.createDiv({ cls: "travel-trip-card" });
    const content = card.createDiv({ cls: "trip-card-content" });
    const header = content.createDiv({ cls: "trip-card-header" });
    header.createSpan({ text: trip.countryCode || "\u{1F30D}", cls: "trip-emoji" });
    header.createSpan({ text: trip.destination, cls: "trip-name" });
    const dates = content.createDiv({ cls: "trip-dates" });
    dates.createSpan({ text: trip.dates });
    if (trip.duration && trip.duration !== "TBD") {
      dates.createSpan({ text: ` (${trip.duration})`, cls: "trip-duration" });
    }
    const meta = content.createDiv({ cls: "trip-meta" });
    meta.createSpan({ text: trip.travelers || "TBD" });
    if (trip.budget && trip.budget !== "TBD") {
      meta.createSpan({ text: " | " });
      meta.createSpan({ text: trip.budget });
    }
    if (trip.window) {
      const windowBadge = content.createDiv({ cls: "trip-window" });
      windowBadge.createSpan({ text: trip.window });
    }
    if (trip.urgentItems > 0) {
      const urgent = content.createDiv({ cls: "trip-urgent" });
      urgent.createSpan({ text: `\u26A0\uFE0F ${trip.urgentItems} open question${trip.urgentItems > 1 ? "s" : ""}` });
    }
    if (trip.totalTasks > 0) {
      const progressWrapper = card.createDiv({ cls: "trip-card-progress" });
      this.renderProgressRing(progressWrapper, trip.readinessPercent);
    }
    card.addEventListener("click", () => {
      if (trip.filePath) {
        this.app.workspace.openLinkText(trip.filePath, "", false);
      }
    });
  }
  renderProgressRing(container, percentage) {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - percentage / 100);
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "progress-ring");
    svg.setAttribute("width", "50");
    svg.setAttribute("height", "50");
    svg.setAttribute("viewBox", "0 0 50 50");
    const defs = document.createElementNS(svgNS, "defs");
    const gradient = document.createElementNS(svgNS, "linearGradient");
    gradient.setAttribute("id", `progressGradient-${percentage}`);
    gradient.setAttribute("x1", "0%");
    gradient.setAttribute("y1", "0%");
    gradient.setAttribute("x2", "100%");
    gradient.setAttribute("y2", "100%");
    const stop1 = document.createElementNS(svgNS, "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "#6366f1");
    gradient.appendChild(stop1);
    const stop2 = document.createElementNS(svgNS, "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "#4f46e5");
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);
    const bgCircle = document.createElementNS(svgNS, "circle");
    bgCircle.setAttribute("class", "progress-ring-bg");
    bgCircle.setAttribute("cx", "25");
    bgCircle.setAttribute("cy", "25");
    bgCircle.setAttribute("r", radius.toString());
    svg.appendChild(bgCircle);
    const fillCircle = document.createElementNS(svgNS, "circle");
    fillCircle.setAttribute("class", "progress-ring-fill");
    fillCircle.setAttribute("cx", "25");
    fillCircle.setAttribute("cy", "25");
    fillCircle.setAttribute("r", radius.toString());
    fillCircle.setAttribute("stroke", `url(#progressGradient-${percentage})`);
    fillCircle.setAttribute("stroke-dasharray", circumference.toString());
    fillCircle.setAttribute("stroke-dashoffset", strokeDashoffset.toString());
    svg.appendChild(fillCircle);
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("class", "progress-ring-text");
    text.setAttribute("x", "25");
    text.setAttribute("y", "25");
    text.textContent = `${percentage}%`;
    svg.appendChild(text);
    container.appendChild(svg);
  }
  renderDeadlinesSection(container) {
    var _a;
    const section = container.createDiv({ cls: "dashboard-section" });
    section.createEl("h3", { text: "UPCOMING DEADLINES" });
    const deadlines = ((_a = this.data) == null ? void 0 : _a.deadlines.slice(0, 5)) || [];
    if (!deadlines.length) {
      section.createDiv({ text: "No upcoming deadlines", cls: "empty-state" });
      return;
    }
    const timeline = section.createDiv({ cls: "deadline-timeline" });
    for (let i = 0; i < deadlines.length; i++) {
      const deadline = deadlines[i];
      const isLastItem = i === deadlines.length - 1;
      const item = timeline.createDiv({ cls: "timeline-item" });
      const connector = item.createDiv({ cls: "timeline-connector" });
      const urgencyClass = this.getUrgencyClass(deadline.daysRemaining);
      connector.createDiv({ cls: `timeline-node ${urgencyClass}` });
      if (!isLastItem) {
        connector.createDiv({ cls: "timeline-line" });
      }
      const content = item.createDiv({ cls: "timeline-content" });
      const dateEl = content.createDiv({ cls: "timeline-date" });
      if (deadline.daysRemaining === 0) {
        dateEl.setText("NOW");
      } else {
        dateEl.setText(`${deadline.daysRemaining} days`);
      }
      const descEl = content.createDiv({ cls: "timeline-desc" });
      descEl.setText(`${deadline.description} (${deadline.destination})`);
    }
  }
  getUrgencyClass(days) {
    if (days <= 7)
      return "node-urgent";
    if (days <= 21)
      return "node-soon";
    return "node-upcoming";
  }
  renderPricesSection(container) {
    var _a;
    const section = container.createDiv({ cls: "dashboard-section" });
    section.createEl("h3", { text: "PRICE TRACKER" });
    const prices = ((_a = this.data) == null ? void 0 : _a.prices) || [];
    if (!prices.length) {
      section.createDiv({ text: "No pricing data", cls: "empty-state" });
      return;
    }
    for (const price of prices) {
      this.renderPriceCard(section, price);
    }
  }
  renderPriceCard(container, price) {
    var _a;
    const card = container.createDiv({ cls: "price-tracker-card" });
    const header = card.createDiv({ cls: "price-header" });
    header.createSpan({ text: `${price.destination}: ${price.route}`, cls: "price-route" });
    const priceEl = card.createDiv({ cls: "price-amount" });
    priceEl.createSpan({ text: `$${price.pricePerPerson.toLocaleString()}/person` });
    if (price.travelers > 1) {
      priceEl.createSpan({
        text: ` (x${price.travelers} = $${(_a = price.totalForGroup) == null ? void 0 : _a.toLocaleString()})`,
        cls: "price-total"
      });
    }
    const statusEl = card.createDiv({ cls: "price-status" });
    const statusIcon = this.getPriceStatusIcon(price.status);
    const trendIcon = this.getTrendIcon(price.trend);
    statusEl.createSpan({ text: `${statusIcon} ${this.formatStatus(price.status)}` });
    if (price.trend !== "unknown") {
      statusEl.createSpan({ text: ` | ${trendIcon}`, cls: `price-trend-${price.trend}` });
    }
    const updated = card.createDiv({ cls: "price-updated" });
    updated.createSpan({
      text: `Last check: ${price.captureDate} (${price.daysSinceCapture}d ago)`,
      cls: price.daysSinceCapture > 14 ? "stale" : ""
    });
    const checkBtn = card.createEl("button", {
      text: "Check Now",
      cls: "price-check-btn"
    });
    checkBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.copyCommand(`/travel.pricing ${price.destination}`);
    });
    card.addEventListener("click", () => {
      this.app.workspace.openLinkText(price.sourcePath, "", false);
    });
  }
  getPriceStatusIcon(status) {
    switch (status) {
      case "great-deal":
        return "\u{1F7E2}";
      case "good-price":
        return "\u{1F7E1}";
      case "normal":
        return "\u26AA";
      case "rising":
        return "\u{1F7E0}";
      case "high":
        return "\u{1F534}";
      default:
        return "\u26AA";
    }
  }
  getTrendIcon(trend) {
    switch (trend) {
      case "rising":
        return "\u2197\uFE0F Rising";
      case "falling":
        return "\u2198\uFE0F Falling";
      case "stable":
        return "\u2192 Stable";
      default:
        return "";
    }
  }
  formatStatus(status) {
    return status.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  renderActionsSection(container) {
    const section = container.createDiv({ cls: "dashboard-section" });
    section.createEl("h3", { text: "QUICK ACTIONS" });
    const grid = section.createDiv({ cls: "action-button-grid" });
    const actions = [
      { icon: "\u{1F504}", label: "Check Prices", command: "/travel.pricing" },
      { icon: "\u{1F4DD}", label: "New Research", command: "/travel.research" },
      { icon: "\u{1F4C5}", label: "Create Itinerary", command: "/travel.itinerary" },
      { icon: "\u2713", label: "Validate Data", command: "/travel.validate" }
    ];
    for (const action of actions) {
      const btn = grid.createEl("button", {
        cls: "action-btn"
      });
      btn.createSpan({ text: `${action.icon} ${action.label}` });
      btn.addEventListener("click", () => {
        this.copyCommand(action.command);
      });
    }
  }
  renderDealsSection(container) {
    var _a, _b, _c;
    const section = container.createDiv({ cls: "dashboard-section" });
    section.createEl("h3", { text: "DEALS & OPPORTUNITIES" });
    const discoveredDeals = ((_a = this.data) == null ? void 0 : _a.discoveredDeals) || [];
    if (discoveredDeals.length > 0) {
      const alertDate = (_b = discoveredDeals[0]) == null ? void 0 : _b.alertDate;
      if (alertDate) {
        const dateLabel = section.createDiv({ cls: "deals-date-label" });
        dateLabel.createSpan({ text: `From ${alertDate} scan` });
      }
      const dealsGrid = section.createDiv({ cls: "discovered-deals-grid" });
      for (const deal of discoveredDeals.slice(0, 8)) {
        this.renderDiscoveredDealCard(dealsGrid, deal);
      }
      const viewAll = section.createDiv({ cls: "deals-view-all" });
      const link = viewAll.createEl("a", { text: "View full deal alert \u2192" });
      link.addEventListener("click", () => {
        this.app.workspace.openLinkText(`_inbox/${alertDate}-flight-deal-alert.md`, "", false);
      });
      return;
    }
    const deals = ((_c = this.data) == null ? void 0 : _c.deals.slice(0, 4)) || [];
    if (!deals.length) {
      const empty = section.createDiv({ cls: "empty-state" });
      empty.createSpan({ text: "No deals found. " });
      empty.createEl("em", { text: "Run /travel.deals to scan for opportunities" });
      return;
    }
    for (const deal of deals) {
      const card = section.createDiv({ cls: "deal-card" });
      const header = card.createDiv({ cls: "deal-header" });
      header.createSpan({ text: `${deal.emoji} ${deal.destination}`, cls: "deal-destination" });
      const info = card.createDiv({ cls: "deal-info" });
      info.createSpan({ text: `${deal.season} - Best: ${deal.bestMonths}` });
      const pricing = card.createDiv({ cls: "deal-pricing" });
      pricing.createSpan({ text: `Typical: $${deal.typicalPrice}` });
      if (deal.dealThreshold) {
        pricing.createSpan({
          text: ` | Deal: < $${deal.dealThreshold}`,
          cls: "deal-threshold"
        });
      }
      card.addEventListener("click", () => {
        this.copyCommand(`/travel.research ${deal.destination}`);
      });
    }
  }
  renderDiscoveredDealCard(container, deal) {
    const card = container.createDiv({ cls: "discovered-deal-card" });
    const indicator = card.createDiv({ cls: "deal-indicator deal-great" });
    const content = card.createDiv({ cls: "deal-content" });
    const destRow = content.createDiv({ cls: "deal-dest-row" });
    destRow.createSpan({ text: deal.destination, cls: "deal-destination" });
    if (deal.isBucketList) {
      destRow.createSpan({ text: " \u2B50", cls: "deal-bucket-list" });
    }
    const priceRow = content.createDiv({ cls: "deal-price-row" });
    priceRow.createSpan({ text: `$${deal.price}`, cls: "deal-price" });
    priceRow.createSpan({ text: ` (-${deal.percentOff}%)`, cls: "deal-discount" });
    if (deal.dates) {
      const datesRow = content.createDiv({ cls: "deal-dates-row" });
      datesRow.createSpan({ text: deal.dates, cls: "deal-dates" });
    }
    if (deal.windowMatch) {
      const matchBadge = content.createDiv({ cls: "deal-window-match" });
      matchBadge.createSpan({ text: `\u2713 ${deal.windowMatch}` });
    }
    card.addEventListener("click", () => {
      this.copyCommand(`/travel.research ${deal.destination}`);
    });
  }
  async copyCommand(command) {
    try {
      await navigator.clipboard.writeText(command);
      new import_obsidian.Notice(`Copied: ${command}`);
    } catch (e) {
      new import_obsidian.Notice(`Failed to copy command`);
    }
  }
};

// src/parsers/TripParser.ts
var TripParser = class {
  constructor(app) {
    this.app = app;
  }
  async parseAll(folderPath) {
    const results = [];
    const allFiles = this.app.vault.getMarkdownFiles();
    console.log(`[TripParser] Total markdown files: ${allFiles.length}`);
    const files = allFiles.filter(
      (f) => f.path.startsWith(folderPath) && !f.basename.startsWith("_") && !f.path.includes("/pricing/")
      // Exclude pricing subfolder
    );
    console.log(`[TripParser] Files in ${folderPath}: ${files.length}`, files.map((f) => f.path));
    for (const file of files) {
      const trip = await this.parse(file);
      console.log(`[TripParser] Parsed ${file.path}:`, trip ? `\u2713 ${trip.destination}` : "\u2717 not a trip");
      if (trip)
        results.push(trip);
    }
    return results;
  }
  async parse(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache == null ? void 0 : cache.frontmatter;
    if (!frontmatter || frontmatter.type !== "trip") {
      return null;
    }
    const content = await this.app.vault.read(file);
    const { checkedTasks, totalTasks, urgentItems } = this.extractTasks(content);
    const status = this.normalizeStatus(frontmatter.status);
    const readiness = this.calculateReadiness(status, checkedTasks, totalTasks);
    return {
      id: file.basename.toLowerCase().replace(/\s+/g, "-"),
      destination: frontmatter.destination || file.basename,
      countryCode: this.getCountryCode(frontmatter.destination || ""),
      dates: frontmatter.dates || "TBD",
      duration: frontmatter.duration,
      travelers: String(frontmatter.travelers || ""),
      budget: frontmatter.budget,
      status,
      committed: frontmatter.committed === true,
      window: frontmatter.window,
      readinessPercent: readiness,
      totalTasks,
      urgentItems,
      filePath: file.path,
      created: frontmatter.created || "",
      updated: frontmatter.updated,
      flightConfirmation: frontmatter.flight_confirmation,
      hotelConfirmation: frontmatter.hotel_confirmation,
      lastUpdated: new Date(file.stat.mtime)
    };
  }
  normalizeStatus(status) {
    if (!status)
      return "idea";
    const s = status.toLowerCase();
    if (s === "idea")
      return "idea";
    if (s === "researching" || s === "research")
      return "researching";
    if (s === "planned" || s === "planning" || s === "draft" || s === "final")
      return "planned";
    if (s === "booked")
      return "booked";
    if (s === "complete" || s === "completed")
      return "complete";
    return "idea";
  }
  extractTasks(content) {
    let urgentItems = 0;
    const openQuestionsMatch = content.match(/## Open Questions[\s\S]*?(?=\n##|$)/i);
    if (openQuestionsMatch) {
      const uncheckedRegex = /- \[ \] /g;
      const matches = openQuestionsMatch[0].match(uncheckedRegex);
      urgentItems = (matches == null ? void 0 : matches.length) || 0;
    }
    const bookingChecklistMatch = content.match(/## (?:Booking )?Checklist[\s\S]*?(?=\n##|$)/i);
    if (bookingChecklistMatch) {
      const uncheckedRegex = /- \[ \] /g;
      const matches = bookingChecklistMatch[0].match(uncheckedRegex);
      urgentItems += (matches == null ? void 0 : matches.length) || 0;
    }
    const uncheckedMatches = content.match(/- \[ \] /g);
    const checkedMatches = content.match(/- \[x\] /gi);
    const totalTasks = ((uncheckedMatches == null ? void 0 : uncheckedMatches.length) || 0) + ((checkedMatches == null ? void 0 : checkedMatches.length) || 0);
    const checkedTasks = (checkedMatches == null ? void 0 : checkedMatches.length) || 0;
    return { checkedTasks, totalTasks, urgentItems };
  }
  calculateReadiness(status, checkedTasks, totalTasks) {
    const baseReadiness = {
      "idea": 10,
      "researching": 30,
      "planned": 60,
      "booked": 90,
      "complete": 100
    };
    let readiness = baseReadiness[status];
    if (totalTasks > 0 && status !== "complete") {
      const taskCompletion = checkedTasks / totalTasks;
      const statusRange = this.getStatusRange(status);
      readiness = statusRange.min + Math.round(taskCompletion * (statusRange.max - statusRange.min));
    }
    return Math.min(100, readiness);
  }
  getStatusRange(status) {
    switch (status) {
      case "idea":
        return { min: 0, max: 20 };
      case "researching":
        return { min: 20, max: 45 };
      case "planned":
        return { min: 45, max: 75 };
      case "booked":
        return { min: 75, max: 100 };
      case "complete":
        return { min: 100, max: 100 };
    }
  }
  getCountryCode(destination) {
    const codes = {
      "peru": "\u{1F1F5}\u{1F1EA}",
      "mexico": "\u{1F1F2}\u{1F1FD}",
      "cabo": "\u{1F1F2}\u{1F1FD}",
      "cabo san lucas": "\u{1F1F2}\u{1F1FD}",
      "costa rica": "\u{1F1E8}\u{1F1F7}",
      "japan": "\u{1F1EF}\u{1F1F5}",
      "iceland": "\u{1F1EE}\u{1F1F8}",
      "france": "\u{1F1EB}\u{1F1F7}",
      "paris": "\u{1F1EB}\u{1F1F7}",
      "italy": "\u{1F1EE}\u{1F1F9}",
      "spain": "\u{1F1EA}\u{1F1F8}",
      "uk": "\u{1F1EC}\u{1F1E7}",
      "england": "\u{1F1EC}\u{1F1E7}",
      "greece": "\u{1F1EC}\u{1F1F7}",
      "portugal": "\u{1F1F5}\u{1F1F9}",
      "germany": "\u{1F1E9}\u{1F1EA}",
      "australia": "\u{1F1E6}\u{1F1FA}",
      "new zealand": "\u{1F1F3}\u{1F1FF}",
      "thailand": "\u{1F1F9}\u{1F1ED}",
      "vietnam": "\u{1F1FB}\u{1F1F3}",
      "croatia": "\u{1F1ED}\u{1F1F7}",
      "norway": "\u{1F1F3}\u{1F1F4}",
      "sweden": "\u{1F1F8}\u{1F1EA}",
      "netherlands": "\u{1F1F3}\u{1F1F1}",
      "amsterdam": "\u{1F1F3}\u{1F1F1}",
      "switzerland": "\u{1F1E8}\u{1F1ED}",
      "austria": "\u{1F1E6}\u{1F1F9}",
      "ireland": "\u{1F1EE}\u{1F1EA}",
      "scotland": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
      "canada": "\u{1F1E8}\u{1F1E6}",
      "hawaii": "\u{1F1FA}\u{1F1F8}",
      "caribbean": "\u{1F3DD}\uFE0F",
      "bali": "\u{1F1EE}\u{1F1E9}",
      "indonesia": "\u{1F1EE}\u{1F1E9}",
      "philippines": "\u{1F1F5}\u{1F1ED}",
      "singapore": "\u{1F1F8}\u{1F1EC}",
      "hong kong": "\u{1F1ED}\u{1F1F0}",
      "south korea": "\u{1F1F0}\u{1F1F7}",
      "korea": "\u{1F1F0}\u{1F1F7}",
      "taiwan": "\u{1F1F9}\u{1F1FC}",
      "china": "\u{1F1E8}\u{1F1F3}",
      "india": "\u{1F1EE}\u{1F1F3}",
      "morocco": "\u{1F1F2}\u{1F1E6}",
      "egypt": "\u{1F1EA}\u{1F1EC}",
      "south africa": "\u{1F1FF}\u{1F1E6}",
      "brazil": "\u{1F1E7}\u{1F1F7}",
      "argentina": "\u{1F1E6}\u{1F1F7}",
      "chile": "\u{1F1E8}\u{1F1F1}",
      "colombia": "\u{1F1E8}\u{1F1F4}",
      "ecuador": "\u{1F1EA}\u{1F1E8}",
      "galapagos": "\u{1F1EA}\u{1F1E8}"
    };
    const lower = destination.toLowerCase();
    for (const [key, code] of Object.entries(codes)) {
      if (lower.includes(key))
        return code;
    }
    return "\u{1F30D}";
  }
};

// src/parsers/PricingParser.ts
var PricingParser = class {
  constructor(app) {
    this.app = app;
  }
  async parseAll(folderPath) {
    const results = [];
    const files = this.app.vault.getMarkdownFiles().filter(
      (f) => f.path.startsWith(folderPath) && (f.basename.includes("flights") || f.basename.includes("hotels"))
    );
    for (const file of files) {
      const data = await this.parse(file);
      if (data)
        results.push(data);
    }
    return results;
  }
  async parse(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache == null ? void 0 : cache.frontmatter;
    const content = await this.app.vault.read(file);
    const destination = (frontmatter == null ? void 0 : frontmatter.destination) || this.extractDestinationFromFilename(file.basename);
    const route = (frontmatter == null ? void 0 : frontmatter.route) || this.extractRoute(content);
    const pricePerPerson = this.extractCurrentPrice(content);
    const travelers = (frontmatter == null ? void 0 : frontmatter.travelers) || this.extractTravelers(content) || 1;
    const captureDate = (frontmatter == null ? void 0 : frontmatter.date) || this.extractLatestDate(content);
    const trend = this.determineTrend(content);
    const status = this.determineStatus(content, pricePerPerson);
    if (!pricePerPerson)
      return null;
    const daysSinceCapture = this.calculateDaysSince(captureDate);
    return {
      destination,
      route,
      pricePerPerson,
      totalForGroup: pricePerPerson * travelers,
      travelers,
      captureDate,
      daysSinceCapture,
      trend,
      status,
      sourcePath: file.path
    };
  }
  extractDestinationFromFilename(basename) {
    const match = basename.match(/^([a-z-]+)-(?:flights|hotels)/i);
    if (match) {
      return match[1].split("-").map(
        (w) => w.charAt(0).toUpperCase() + w.slice(1)
      ).join(" ");
    }
    return basename;
  }
  extractRoute(content) {
    const match = content.match(/([A-Z]{3})\s*[-→]\s*([A-Z]{3})/);
    return match ? `${match[1]}-${match[2]}` : "";
  }
  extractCurrentPrice(content) {
    const patterns = [
      /current[:\s]+\$?([\d,]+)/i,
      /price[:\s]+\$?([\d,]+)/i,
      /\$?([\d,]+)\s*\/\s*person/i,
      /\$?([\d,]+)\s*per\s*person/i,
      /baseline[:\s]+\$?([\d,]+)/i
    ];
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return parseInt(match[1].replace(/,/g, ""), 10);
      }
    }
    const tableMatch = content.match(/\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*\$?([\d,]+)/);
    if (tableMatch) {
      return parseInt(tableMatch[1].replace(/,/g, ""), 10);
    }
    return 0;
  }
  extractTravelers(content) {
    const match = content.match(/(\d+)\s*travelers?/i);
    return match ? parseInt(match[1], 10) : 1;
  }
  extractLatestDate(content) {
    const dates = content.match(/\d{4}-\d{2}-\d{2}/g) || [];
    if (dates.length === 0)
      return "";
    return dates.sort().reverse()[0];
  }
  calculateDaysSince(dateStr) {
    if (!dateStr)
      return 999;
    const date = new Date(dateStr);
    const now = /* @__PURE__ */ new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1e3 * 60 * 60 * 24));
  }
  determineTrend(content) {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes("\u2197") || lowerContent.includes("rising") || lowerContent.includes("increasing")) {
      return "rising";
    }
    if (lowerContent.includes("\u2198") || lowerContent.includes("falling") || lowerContent.includes("decreasing")) {
      return "falling";
    }
    if (lowerContent.includes("stable") || lowerContent.includes("steady")) {
      return "stable";
    }
    return "unknown";
  }
  determineStatus(content, price) {
    const greatDealMatch = content.match(/great\s*deal[:\s<]+\$?([\d,]+)/i);
    const goodPriceMatch = content.match(/good\s*price[:\s<]+\$?([\d,]+)/i);
    const highMatch = content.match(/high[:\s>]+\$?([\d,]+)/i);
    if (greatDealMatch) {
      const threshold = parseInt(greatDealMatch[1].replace(/,/g, ""), 10);
      if (price < threshold)
        return "great-deal";
    }
    if (goodPriceMatch) {
      const threshold = parseInt(goodPriceMatch[1].replace(/,/g, ""), 10);
      if (price < threshold)
        return "good-price";
    }
    if (highMatch) {
      const threshold = parseInt(highMatch[1].replace(/,/g, ""), 10);
      if (price > threshold)
        return "high";
    }
    return "normal";
  }
};

// src/parsers/DealsParser.ts
var import_obsidian2 = require("obsidian");
var DealsParser = class {
  constructor(app) {
    this.app = app;
  }
  async parseDiscoveredDeals(inboxPath) {
    const inboxFolder = this.app.vault.getAbstractFileByPath(inboxPath);
    if (!inboxFolder)
      return [];
    const files = this.app.vault.getFiles().filter((f) => f.path.startsWith(inboxPath) && f.name.includes("flight-deal-alert")).sort((a, b) => b.stat.mtime - a.stat.mtime);
    if (files.length === 0)
      return [];
    const latestAlert = files[0];
    const content = await this.app.vault.read(latestAlert);
    return this.parseAlertContent(content, latestAlert.name);
  }
  parseAlertContent(content, filename) {
    const deals = [];
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    const alertDate = dateMatch ? dateMatch[1] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const greatDealsSection = content.match(/## (?:🟢\s*)?Great Deals Found[^\n]*[\s\S]*?(?=\n## (?:🎆|All|Asia|Good|Best|\d)|---\s*$|$)/i);
    if (!greatDealsSection)
      return deals;
    const dealBlocks = greatDealsSection[0].split(/###\s+(?:\d+\.\s*)?/).filter((b) => b.trim());
    for (const block of dealBlocks) {
      if (!block.trim())
        continue;
      const headerMatch = block.match(/^([^-\n]+)\s*-\s*\$([0-9,]+)\s*RT\s*\((\d+)%\s*off!?\)(\s*⭐\s*BUCKET LIST)?/i);
      if (!headerMatch)
        continue;
      const destination = headerMatch[1].trim();
      const price = parseInt(headerMatch[2].replace(/,/g, ""));
      const percentOff = parseInt(headerMatch[3]);
      const isBucketList = !!headerMatch[4];
      const datesMatch = block.match(/\*\*(?:Best )?[Dd]ates?\*\*:\s*([^\n]+)/i);
      const dates = datesMatch ? datesMatch[1].trim() : "";
      const typicalMatch = block.match(/\*\*Typical price\*\*:\s*~?\$([0-9,]+)/i);
      const typicalPrice = typicalMatch ? parseInt(typicalMatch[1].replace(/,/g, "")) : Math.round(price / (1 - percentOff / 100));
      let windowMatch;
      const oldStyleMatch = block.match(/✅\s*\*\*([^*]+)\*\*|✅\s+([^\n]+?)(?:\s*-|$)/i);
      const newStyleMatch = block.match(/\*\*Window match\*\*:\s*([^\n]+)/i);
      if (newStyleMatch) {
        const matchText = newStyleMatch[1].trim();
        if (matchText.startsWith("Close to ")) {
          windowMatch = matchText.replace("Close to ", "").replace(/\s*\([^)]+\)/, "").trim();
        } else if (!matchText.includes("Requires PTO")) {
          windowMatch = matchText;
        }
      } else if (oldStyleMatch) {
        windowMatch = (oldStyleMatch[1] || oldStyleMatch[2] || "").trim();
      }
      deals.push({
        destination,
        price,
        typicalPrice,
        percentOff,
        dates,
        isBucketList,
        windowMatch: windowMatch || void 0,
        alertDate
      });
    }
    return deals;
  }
  async parse(filePath) {
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (!file || !(file instanceof import_obsidian2.TFile))
      return [];
    const content = await this.app.vault.read(file);
    return this.parseDestinationIntelligence(content);
  }
  parseDestinationIntelligence(content) {
    const deals = [];
    const tableMatch = content.match(/\|[^\n]*Destination[^\n]*\|([\s\S]*?)(?=\n\n|\n##|$)/i);
    if (!tableMatch)
      return deals;
    const tableContent = tableMatch[0];
    const rows = tableContent.split("\n").filter(
      (row) => row.includes("|") && !row.includes("---") && !row.includes("Destination")
    );
    for (const row of rows) {
      const cells = row.split("|").map((c) => c.trim()).filter((c) => c);
      if (cells.length < 5)
        continue;
      const destination = cells[1] || cells[0];
      const bestMonths = cells[2] || "";
      const tripType = cells[3] || "";
      const typicalPrice = this.parsePrice(cells[4] || "");
      const dealThreshold = this.parsePrice(cells[5] || "");
      if (destination && destination.length > 1) {
        deals.push({
          destination,
          emoji: this.getSeasonEmoji(bestMonths),
          season: this.getSeason(bestMonths),
          bestMonths,
          typicalPrice,
          dealThreshold,
          tripType
        });
      }
    }
    return deals;
  }
  parsePrice(priceStr) {
    const match = priceStr.match(/\$?([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
  }
  getSeasonEmoji(months) {
    const m = months.toLowerCase();
    if (m.includes("mar") || m.includes("apr") || m.includes("may"))
      return "\u{1F338}";
    if (m.includes("jun") || m.includes("jul") || m.includes("aug"))
      return "\u2600\uFE0F";
    if (m.includes("sep") || m.includes("oct") || m.includes("nov"))
      return "\u{1F342}";
    if (m.includes("dec") || m.includes("jan") || m.includes("feb"))
      return "\u2744\uFE0F";
    return "\u{1F30D}";
  }
  getSeason(months) {
    const m = months.toLowerCase();
    if (m.includes("mar") || m.includes("apr") || m.includes("may"))
      return "Spring";
    if (m.includes("jun") || m.includes("jul") || m.includes("aug"))
      return "Summer";
    if (m.includes("sep") || m.includes("oct") || m.includes("nov"))
      return "Fall";
    if (m.includes("dec") || m.includes("jan") || m.includes("feb"))
      return "Winter";
    return "Year-round";
  }
  getCurrentSeasonDeals(deals) {
    const now = /* @__PURE__ */ new Date();
    const currentMonth = now.getMonth();
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const relevantMonths = [
      monthNames[currentMonth],
      monthNames[(currentMonth + 1) % 12],
      monthNames[(currentMonth + 2) % 12]
    ];
    return deals.filter((deal) => {
      const bestMonthsLower = deal.bestMonths.toLowerCase();
      return relevantMonths.some((m) => bestMonthsLower.includes(m));
    });
  }
};

// src/parsers/TravelWindowParser.ts
var import_obsidian3 = require("obsidian");
var TravelWindowParser = class {
  constructor(app) {
    this.app = app;
  }
  async parse(profilePath) {
    const file = this.app.vault.getAbstractFileByPath(profilePath);
    if (!file || !(file instanceof import_obsidian3.TFile)) {
      return [];
    }
    const content = await this.app.vault.read(file);
    const windows = [];
    const bestWindowsMatch = content.match(/### BEST Windows[\s\S]*?\n\n\|.*\|[\s\S]*?(?=\n###|\n---|\n\n##|$)/i);
    if (bestWindowsMatch) {
      const tableRows = this.extractTableRows(bestWindowsMatch[0]);
      for (const row of tableRows) {
        const window = this.parseWindowRow(row);
        if (window)
          windows.push(window);
      }
    }
    const topPickMatch = content.match(/### ⭐ TOP PICK:([^\n]+)[\s\S]*?(?=\n---|\n###|$)/i);
    if (topPickMatch) {
      const topPick = this.parseTopPick(topPickMatch[0], topPickMatch[1].trim());
      if (topPick) {
        topPick.isTopPick = true;
        const existingIndex = windows.findIndex(
          (w) => w.name.toLowerCase().includes("july 4th") || w.name.toLowerCase().includes("shutdown")
        );
        if (existingIndex >= 0) {
          windows[existingIndex] = { ...windows[existingIndex], ...topPick, isTopPick: true };
        } else {
          windows.unshift(topPick);
        }
      }
    }
    windows.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    return windows;
  }
  getNextWindow(windows) {
    const now = /* @__PURE__ */ new Date();
    for (const window of windows) {
      if (window.startDate > now) {
        return window;
      }
    }
    return windows[0] || null;
  }
  extractTableRows(tableSection) {
    const lines = tableSection.split("\n").filter((l) => l.startsWith("|"));
    const rows = [];
    for (let i = 2; i < lines.length; i++) {
      const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length >= 4 && cells[0]) {
        rows.push(cells);
      }
    }
    return rows;
  }
  parseWindowRow(cells) {
    if (cells.length < 4)
      return null;
    const name = cells[0].replace(/\*\*/g, "").trim();
    const dates = cells[1].trim();
    const duration = cells[2].replace(/\*\*/g, "").trim();
    const ptoNeeded = cells[3].replace(/\*\*/g, "").trim();
    const notes = cells[4] || "";
    const dateRange = this.parseDateRange(dates);
    if (!dateRange)
      return null;
    return {
      name,
      dates,
      startDate: dateRange.start,
      endDate: dateRange.end,
      duration,
      ptoNeeded,
      whoCanGo: this.inferWhoCanGo(name, notes),
      notes: notes.trim() || void 0
    };
  }
  parseTopPick(section, name) {
    var _a, _b, _c, _d;
    const datesMatch = section.match(/\*\*Dates\*\*[:\s|]+([^\n|]+)/i);
    const durationMatch = section.match(/\*\*Duration\*\*[:\s|]+([^\n|]+)/i);
    const ptoMatch = section.match(/\*\*PTO Required\*\*[:\s|]+([^\n|]+)/i);
    const whyMatch = section.match(/\*\*Why it works\*\*[:\s|]+([^\n|]+)/i);
    const dates = ((_a = datesMatch == null ? void 0 : datesMatch[1]) == null ? void 0 : _a.trim()) || "";
    const dateRange = this.parseDateRange(dates);
    if (!dateRange)
      return null;
    return {
      name,
      dates,
      startDate: dateRange.start,
      endDate: dateRange.end,
      duration: ((_b = durationMatch == null ? void 0 : durationMatch[1]) == null ? void 0 : _b.trim()) || "",
      ptoNeeded: ((_c = ptoMatch == null ? void 0 : ptoMatch[1]) == null ? void 0 : _c.trim()) || "0",
      whoCanGo: "Full family",
      notes: (_d = whyMatch == null ? void 0 : whyMatch[1]) == null ? void 0 : _d.trim(),
      isTopPick: true
    };
  }
  parseDateRange(dateStr) {
    var _a;
    const cleanDate = dateStr.replace(/\*\*/g, "").replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*/gi, "").trim();
    const year = 2026;
    const monthNames = {
      "jan": 0,
      "feb": 1,
      "mar": 2,
      "apr": 3,
      "may": 4,
      "jun": 5,
      "jul": 6,
      "aug": 7,
      "sep": 8,
      "oct": 9,
      "nov": 10,
      "dec": 11
    };
    const diffMonthMatch = cleanDate.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})/i);
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
    const sameMonthMatch = cleanDate.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})\s*-\s*(\d{1,2})/i);
    if (sameMonthMatch) {
      const month = monthNames[sameMonthMatch[1].toLowerCase()];
      const startDay = parseInt(sameMonthMatch[2]);
      const endDay = parseInt(sameMonthMatch[3]);
      return {
        start: new Date(year, month, startDay),
        end: new Date(year, month, endDay)
      };
    }
    const flexibleMatch = cleanDate.match(/(Late|Early)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
    if (flexibleMatch) {
      const startMonth = monthNames[flexibleMatch[2].toLowerCase()];
      const endMonth = monthNames[flexibleMatch[3].toLowerCase()];
      const startDay = ((_a = flexibleMatch[1]) == null ? void 0 : _a.toLowerCase()) === "late" ? 20 : 1;
      return {
        start: new Date(year, startMonth, startDay),
        end: new Date(year, endMonth, 28)
        // End of month approximation
      };
    }
    const singleMatch = cleanDate.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})/i);
    if (singleMatch) {
      const month = monthNames[singleMatch[1].toLowerCase()];
      const day = parseInt(singleMatch[2]);
      return {
        start: new Date(year, month, day),
        end: new Date(year, month, day)
      };
    }
    return null;
  }
  inferWhoCanGo(name, notes) {
    const combined = `${name} ${notes}`.toLowerCase();
    if (combined.includes("full family") || combined.includes("all kids") || combined.includes("summer") || combined.includes("both schools")) {
      return "Full family";
    }
    if (combined.includes("alpine only") || combined.includes("parents +")) {
      return "Parents + youngest";
    }
    if (combined.includes("couple") || combined.includes("romantic")) {
      return "Couple only";
    }
    if (combined.includes("flexible") || combined.includes("adults")) {
      return "Adults / flexible";
    }
    return "Full family";
  }
};

// src/services/DataService.ts
var DataService = class {
  constructor(app) {
    this.app = app;
    // Paths relative to vault root
    // Unified trip model - all trip files now in Personal/travel with type: trip
    this.tripPath = "Personal/travel";
    this.pricingPath = "Personal/travel/pricing/snapshots";
    this.intelPath = "Personal/travel/pricing/destination-intelligence.md";
    this.profilePath = "_state/travel-profile.md";
    // Moved to _state per JoshOS convention
    this.inboxPath = "_inbox";
    this.tripParser = new TripParser(app);
    this.pricingParser = new PricingParser(app);
    this.dealsParser = new DealsParser(app);
    this.windowParser = new TravelWindowParser(app);
  }
  async loadAll() {
    console.log("[TravelDashboard] Loading data...");
    const [trips, prices, allDeals, travelWindows, discoveredDeals] = await Promise.all([
      this.tripParser.parseAll(this.tripPath),
      this.pricingParser.parseAll(this.pricingPath),
      this.dealsParser.parse(this.intelPath),
      this.windowParser.parse(this.profilePath),
      this.dealsParser.parseDiscoveredDeals(this.inboxPath)
    ]);
    console.log("[TravelDashboard] Loaded:", { trips: trips.length, prices: prices.length, windows: travelWindows.length, deals: discoveredDeals.length });
    const tripsByStatus = this.groupTripsByStatus(trips);
    const deadlines = this.buildDeadlinesFromTrips(trips, prices);
    const deals = this.dealsParser.getCurrentSeasonDeals(allDeals);
    const milestones = await this.parseMilestones();
    const committedTrip = trips.filter((t) => t.committed).sort((a, b) => this.compareTripDates(a.dates, b.dates))[0] || null;
    const nextWindow = committedTrip ? null : this.windowParser.getNextWindow(travelWindows);
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
      lastRefresh: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Group trips by their status for dashboard display
   */
  groupTripsByStatus(trips) {
    const grouped = {
      idea: [],
      researching: [],
      planned: [],
      booked: [],
      complete: []
    };
    for (const trip of trips) {
      grouped[trip.status].push(trip);
    }
    for (const status of Object.keys(grouped)) {
      grouped[status].sort((a, b) => this.compareTripDates(a.dates, b.dates));
    }
    return grouped;
  }
  /**
   * Build deadlines from trips (urgent items and booking tasks)
   */
  buildDeadlinesFromTrips(trips, prices) {
    const deadlines = [];
    for (const trip of trips) {
      if (trip.urgentItems > 0 && trip.status !== "complete") {
        deadlines.push({
          id: `trip-${trip.id}-urgent`,
          destination: trip.destination,
          description: `${trip.urgentItems} open question${trip.urgentItems > 1 ? "s" : ""} to resolve`,
          date: "ASAP",
          daysRemaining: 0,
          priority: "urgent",
          source: trip.filePath
        });
      }
    }
    for (const price of prices) {
      if (price.daysSinceCapture > 14) {
        deadlines.push({
          id: `price-${price.destination}`,
          destination: price.destination,
          description: `Update pricing (${price.daysSinceCapture} days old)`,
          date: "Stale",
          daysRemaining: 0,
          priority: "soon",
          source: "pricing"
        });
      }
    }
    return deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }
  /**
   * Build action items: deals that match upcoming windows + windows with no planned trip
   */
  buildActionItems(windows, discoveredDeals, trips) {
    const items = [];
    const now = /* @__PURE__ */ new Date();
    now.setHours(0, 0, 0, 0);
    const upcomingWindows = windows.filter((w) => {
      const daysUntil = Math.floor((w.startDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 120;
    });
    for (const deal of discoveredDeals) {
      const dealDates = this.parseDealDates(deal.dates);
      if (!dealDates)
        continue;
      for (const window of upcomingWindows) {
        if (this.datesOverlap(dealDates.start, dealDates.end, window.startDate, window.endDate)) {
          const daysAway = Math.floor((window.startDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
          items.push({
            type: "deal-match",
            urgency: deal.percentOff >= 35 ? "high" : deal.percentOff >= 20 ? "medium" : "low",
            daysAway,
            message: `$${deal.price} ${deal.destination} fits your ${window.name} window`,
            subMessage: `${daysAway} days away - ${deal.percentOff}% below typical`,
            destination: deal.destination,
            windowName: window.name,
            deal
          });
        }
      }
    }
    for (const window of upcomingWindows) {
      const daysAway = Math.floor((window.startDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      const hasPlannedTrip = trips.some((trip) => {
        const tripDate = this.extractDate(trip.dates);
        if (!tripDate)
          return false;
        return this.datesOverlap(tripDate, tripDate, window.startDate, window.endDate);
      });
      if (!hasPlannedTrip && daysAway <= 90) {
        items.push({
          type: "window-no-trip",
          urgency: daysAway <= 30 ? "high" : daysAway <= 60 ? "medium" : "low",
          daysAway,
          message: `${window.name} window`,
          subMessage: `${daysAway} days - NO TRIP PLANNED`,
          windowName: window.name
        });
      }
    }
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
  parseDealDates(dateStr) {
    if (!dateStr)
      return null;
    const monthNames = {
      "jan": 0,
      "feb": 1,
      "mar": 2,
      "apr": 3,
      "may": 4,
      "jun": 5,
      "jul": 6,
      "aug": 7,
      "sep": 8,
      "oct": 9,
      "nov": 10,
      "dec": 11
    };
    const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const year2 = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1;
      const day = parseInt(isoMatch[3]);
      const startDate = new Date(year2, month, day);
      const endDate = new Date(year2, month, day + 7);
      return { start: startDate, end: endDate };
    }
    const year = (/* @__PURE__ */ new Date()).getFullYear();
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
  datesOverlap(start1, end1, start2, end2) {
    return start1 <= end2 && end1 >= start2;
  }
  compareTripDates(a, b) {
    const dateA = this.extractDate(a);
    const dateB = this.extractDate(b);
    if (dateA && dateB)
      return dateA.getTime() - dateB.getTime();
    if (dateA)
      return -1;
    if (dateB)
      return 1;
    return 0;
  }
  extractDate(dateStr) {
    const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
      if (!isNaN(date.getTime()))
        return date;
    }
    const monthMatch = dateStr.match(/(\w+)\s+(\d+)(?:\s*-\s*\w*\s*\d+)?,?\s*(\d{4})/i);
    if (monthMatch) {
      const monthNames = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december"
      ];
      const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase());
      if (monthIndex !== -1) {
        const date = new Date(parseInt(monthMatch[3]), monthIndex, parseInt(monthMatch[2]));
        if (!isNaN(date.getTime()))
          return date;
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
  async parseMilestones() {
    const milestones = [];
    try {
      const file = this.app.vault.getAbstractFileByPath(this.profilePath);
      if (!file || !("extension" in file))
        return milestones;
      const content = await this.app.vault.read(file);
      const importantDatesMatch = content.match(/## Important Dates[\s\S]*?(?=\n##|\n---\n|$)/);
      if (!importantDatesMatch)
        return milestones;
      const section = importantDatesMatch[0];
      const rowRegex = /\|\s*\*?\*?([A-Za-z]+\s+\d+)\*?\*?\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|/g;
      let match;
      const monthMap = {
        "jan": 0,
        "feb": 1,
        "mar": 2,
        "apr": 3,
        "may": 4,
        "jun": 5,
        "jul": 6,
        "aug": 7,
        "sep": 8,
        "oct": 9,
        "nov": 10,
        "dec": 11
      };
      const emojiMap = {
        "adrienne day": "\u{1F495}",
        "anniversary": "\u{1F48D}",
        "birthday": "\u{1F382}"
      };
      while ((match = rowRegex.exec(section)) !== null) {
        const dateStr = match[1].trim();
        const occasion = match[2].trim();
        const tripIdeas = match[3].trim();
        const dateMatch = dateStr.match(/([A-Za-z]+)\s+(\d+)/);
        if (!dateMatch)
          continue;
        const monthStr = dateMatch[1].toLowerCase().substring(0, 3);
        const day = parseInt(dateMatch[2]);
        const month = monthMap[monthStr];
        if (month === void 0 || isNaN(day))
          continue;
        const now = /* @__PURE__ */ new Date();
        const currentYear = now.getFullYear();
        let targetDate = new Date(currentYear, month, day);
        if (targetDate < now) {
          targetDate = new Date(currentYear + 1, month, day);
        }
        const daysUntil = Math.floor((targetDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
        let emoji = "\u{1F389}";
        for (const [key, value] of Object.entries(emojiMap)) {
          if (occasion.toLowerCase().includes(key)) {
            emoji = value;
            break;
          }
        }
        milestones.push({
          id: `milestone-${occasion.toLowerCase().replace(/\s+/g, "-")}`,
          name: occasion,
          date: dateStr,
          monthDay: [month, day],
          tripIdeas: tripIdeas || void 0,
          daysUntil,
          emoji
        });
      }
    } catch (e) {
      console.error("Error parsing milestones:", e);
    }
    return milestones.sort((a, b) => a.daysUntil - b.daysUntil);
  }
};

// src/main.ts
var TravelDashboardPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.refreshTimeout = null;
  }
  async onload() {
    console.log("Loading Travel Dashboard plugin");
    this.dataService = new DataService(this.app);
    this.registerView(
      VIEW_TYPE_TRAVEL_DASHBOARD,
      (leaf) => new TravelDashboardView(leaf, this)
    );
    this.addRibbonIcon("plane", "Travel Dashboard", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-travel-dashboard",
      name: "Open Travel Dashboard",
      callback: () => this.activateView()
    });
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file.path.startsWith("Personal/travel")) {
          this.refreshDashboard();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file.path.startsWith("Personal/travel")) {
          this.refreshDashboard();
        }
      })
    );
  }
  async onunload() {
    console.log("Unloading Travel Dashboard plugin");
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_TRAVEL_DASHBOARD);
    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_TRAVEL_DASHBOARD,
          active: true
        });
      }
    }
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
  async refreshDashboard() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.refreshTimeout = setTimeout(() => {
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TRAVEL_DASHBOARD);
      for (const leaf of leaves) {
        const view = leaf.view;
        if (view && view.refresh) {
          view.refresh();
        }
      }
    }, 500);
  }
};
