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
    this.refreshTimeout = setTimeout(async () => {
      this.data = await this.plugin.dataService.loadAll();
      this.render();
    }, 100);
  }
  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("travel-dashboard");
    if (!this.data) {
      container.createEl("div", { text: "Loading...", cls: "travel-loading" });
      return;
    }
    this.renderHeader(container);
    this.renderActionsSection(container);
    this.renderTripsSection(container);
    this.renderDeadlinesSection(container);
    this.renderPricesSection(container);
    this.renderDealsSection(container);
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
  renderTripsSection(container) {
    var _a;
    const section = container.createDiv({ cls: "dashboard-section" });
    section.createEl("h3", { text: "ACTIVE TRIPS" });
    if (!((_a = this.data) == null ? void 0 : _a.trips.length)) {
      section.createDiv({ text: "No active trips", cls: "empty-state" });
      return;
    }
    for (const trip of this.data.trips) {
      this.renderTripCard(section, trip);
    }
  }
  renderTripCard(container, trip) {
    const card = container.createDiv({ cls: "travel-trip-card" });
    const header = card.createDiv({ cls: "trip-card-header" });
    header.createSpan({ text: trip.countryCode || "\u{1F30D}", cls: "trip-emoji" });
    header.createSpan({ text: trip.destination, cls: "trip-name" });
    const dates = card.createDiv({ cls: "trip-dates" });
    dates.createSpan({ text: trip.tripDates });
    if (trip.duration && trip.duration !== "TBD") {
      dates.createSpan({ text: ` (${trip.duration})`, cls: "trip-duration" });
    }
    const meta = card.createDiv({ cls: "trip-meta" });
    meta.createSpan({ text: `${trip.travelers} traveler${trip.travelers > 1 ? "s" : ""}` });
    if (trip.budget && trip.budget !== "TBD") {
      meta.createSpan({ text: " | " });
      meta.createSpan({ text: trip.budget });
    }
    const statusClass = `status-${trip.status}`;
    const status = card.createDiv({ cls: `trip-status ${statusClass}` });
    status.createSpan({ text: trip.status.toUpperCase() });
    const progressContainer = card.createDiv({ cls: "trip-progress" });
    const progressBar = progressContainer.createDiv({ cls: "progress-bar" });
    const progressFill = progressBar.createDiv({ cls: "progress-fill" });
    progressFill.style.width = `${trip.readinessPercent}%`;
    progressContainer.createSpan({
      text: `${trip.readinessPercent}% ready`,
      cls: "progress-text"
    });
    if (trip.urgentItems > 0) {
      const urgent = card.createDiv({ cls: "trip-urgent" });
      urgent.createSpan({ text: `\u26A0\uFE0F ${trip.urgentItems} urgent item${trip.urgentItems > 1 ? "s" : ""}` });
    }
    card.addEventListener("click", () => {
      const path = trip.itineraryPath || trip.researchPath;
      if (path) {
        this.app.workspace.openLinkText(path, "", false);
      }
    });
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
    const list = section.createDiv({ cls: "deadline-list" });
    for (const deadline of deadlines) {
      const item = list.createDiv({ cls: "deadline-item" });
      const urgencyClass = this.getUrgencyClass(deadline.daysRemaining);
      const indicator = item.createDiv({ cls: `deadline-indicator ${urgencyClass}` });
      if (deadline.daysRemaining === 0) {
        indicator.createSpan({ text: "NOW" });
      } else {
        indicator.createSpan({ text: `${deadline.daysRemaining}d` });
      }
      const desc = item.createDiv({ cls: "deadline-desc" });
      desc.createSpan({ text: deadline.description });
      desc.createSpan({ text: ` (${deadline.destination})`, cls: "deadline-dest" });
    }
  }
  getUrgencyClass(days) {
    if (days <= 7)
      return "urgent-red";
    if (days <= 21)
      return "urgent-yellow";
    return "urgent-green";
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
    var _a;
    const section = container.createDiv({ cls: "dashboard-section" });
    section.createEl("h3", { text: "DEALS & OPPORTUNITIES" });
    const deals = ((_a = this.data) == null ? void 0 : _a.deals.slice(0, 4)) || [];
    if (!deals.length) {
      section.createDiv({ text: "No seasonal deals found", cls: "empty-state" });
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
  copyCommand(command) {
    navigator.clipboard.writeText(command);
    new import_obsidian.Notice(`Copied: ${command}`);
  }
};

// src/parsers/ResearchParser.ts
var ResearchParser = class {
  constructor(app) {
    this.app = app;
  }
  async parseAll(folderPath) {
    const results = [];
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folder)
      return results;
    const files = this.app.vault.getMarkdownFiles().filter(
      (f) => f.path.startsWith(folderPath) && !f.basename.startsWith("_")
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
    if (!frontmatter)
      return null;
    return {
      path: file.path,
      date: frontmatter.date || "",
      destination: frontmatter.destination || file.basename,
      tripTiming: frontmatter.trip_timing,
      duration: frontmatter.duration,
      travelStyle: frontmatter.travel_style,
      travelers: frontmatter.travelers,
      status: this.normalizeStatus(frontmatter.status),
      confidence: frontmatter.confidence || "medium",
      dataFreshness: frontmatter.data_freshness
    };
  }
  normalizeStatus(status) {
    if (!status)
      return "draft";
    const s = status.toLowerCase();
    if (s === "complete" || s === "completed")
      return "complete";
    if (s === "in-progress" || s === "in progress")
      return "in-progress";
    return "draft";
  }
};

// src/parsers/ItineraryParser.ts
var ItineraryParser = class {
  constructor(app) {
    this.app = app;
  }
  async parseAll(folderPath) {
    const results = [];
    const files = this.app.vault.getMarkdownFiles().filter(
      (f) => f.path.startsWith(folderPath) && !f.basename.startsWith("_") && !f.basename.includes("overview")
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
    if (!frontmatter)
      return null;
    const { urgentTasks, checkedTasks, totalTasks } = this.extractTasks(content);
    return {
      path: file.path,
      date: frontmatter.date || "",
      destination: frontmatter.destination || "",
      tripDates: frontmatter.trip_dates || "",
      duration: frontmatter.duration || "",
      travelStyle: frontmatter.travel_style,
      basedOn: frontmatter.based_on,
      status: this.normalizeStatus(frontmatter.status),
      totalBudget: frontmatter.total_budget_estimate,
      travelers: frontmatter.travelers || 1,
      urgentTasks,
      checkedTasks,
      totalTasks
    };
  }
  extractTasks(content) {
    const urgentTasks = [];
    let checkedTasks = 0;
    let totalTasks = 0;
    const urgentMatch = content.match(/###\s*URGENT[\s\S]*?(?=###|$)/i);
    if (urgentMatch) {
      const taskRegex = /- \[ \] (.+)/g;
      let match;
      while ((match = taskRegex.exec(urgentMatch[0])) !== null) {
        urgentTasks.push(match[1]);
      }
    }
    const uncheckedMatches = content.match(/- \[ \] /g);
    const checkedMatches = content.match(/- \[x\] /gi);
    totalTasks = ((uncheckedMatches == null ? void 0 : uncheckedMatches.length) || 0) + ((checkedMatches == null ? void 0 : checkedMatches.length) || 0);
    checkedTasks = (checkedMatches == null ? void 0 : checkedMatches.length) || 0;
    return { urgentTasks, checkedTasks, totalTasks };
  }
  normalizeStatus(status) {
    if (!status)
      return "draft";
    const s = status.toLowerCase();
    if (s === "final" || s === "finalized")
      return "final";
    if (s === "booked")
      return "booked";
    if (s === "completed" || s === "complete")
      return "completed";
    return "draft";
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

// src/parsers/GapsParser.ts
var import_obsidian2 = require("obsidian");
var GapsParser = class {
  constructor(app) {
    this.app = app;
  }
  async parse(filePath) {
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (!file || !(file instanceof import_obsidian2.TFile))
      return [];
    const content = await this.app.vault.read(file);
    return this.parseContent(content);
  }
  parseContent(content) {
    const gaps = [];
    const sections = content.split(/(?=###\s+[^#])/);
    for (const section of sections) {
      const headerMatch = section.match(/###\s+([^\n(]+)/);
      if (!headerMatch)
        continue;
      const destination = headerMatch[1].trim();
      let currentPriority = "nice-to-have";
      const lines = section.split("\n");
      for (const line of lines) {
        if (/urgent/i.test(line) && !line.startsWith("-")) {
          currentPriority = "urgent";
        } else if (/before\s*booking/i.test(line) && !line.startsWith("-")) {
          currentPriority = "before-booking";
        } else if (/nice\s*to/i.test(line) && !line.startsWith("-")) {
          currentPriority = "nice-to-have";
        }
        const taskMatch = line.match(/^-\s*\[([ xX])\]\s*(.+)/);
        if (taskMatch) {
          gaps.push({
            destination,
            priority: currentPriority,
            question: taskMatch[2].trim(),
            checked: taskMatch[1].toLowerCase() === "x"
          });
        }
      }
    }
    return gaps;
  }
  extractUrgentDeadlines(gaps) {
    const now = /* @__PURE__ */ new Date();
    return gaps.filter((g) => g.priority === "urgent" && !g.checked).map((g, i) => ({
      id: `gap-${i}`,
      destination: g.destination,
      description: g.question,
      date: "ASAP",
      daysRemaining: 0,
      priority: "urgent",
      source: "gaps"
    }));
  }
};

// src/parsers/DealsParser.ts
var import_obsidian3 = require("obsidian");
var DealsParser = class {
  constructor(app) {
    this.app = app;
  }
  async parse(filePath) {
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (!file || !(file instanceof import_obsidian3.TFile))
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

// src/services/DataService.ts
var DataService = class {
  constructor(app) {
    this.app = app;
    // Paths relative to vault root
    this.basePath = "Personal/travel";
    this.researchPath = "Personal/travel/01-research";
    this.itineraryPath = "Personal/travel/02-itineraries";
    this.pricingPath = "Personal/travel/00-source-material/pricing-snapshots";
    this.gapsPath = "Personal/travel/04-gaps/questions.md";
    this.intelPath = "Personal/travel/00-source-material/destination-intelligence.md";
    this.profilePath = "Personal/travel/travel-profile.md";
    this.researchParser = new ResearchParser(app);
    this.itineraryParser = new ItineraryParser(app);
    this.pricingParser = new PricingParser(app);
    this.gapsParser = new GapsParser(app);
    this.dealsParser = new DealsParser(app);
  }
  async loadAll() {
    const [research, itineraries, prices, gaps, allDeals] = await Promise.all([
      this.researchParser.parseAll(this.researchPath),
      this.itineraryParser.parseAll(this.itineraryPath),
      this.pricingParser.parseAll(this.pricingPath),
      this.gapsParser.parse(this.gapsPath),
      this.dealsParser.parse(this.intelPath)
    ]);
    const trips = this.buildTrips(research, itineraries, gaps);
    const deadlines = this.buildDeadlines(itineraries, gaps, prices);
    const deals = this.dealsParser.getCurrentSeasonDeals(allDeals);
    return {
      trips,
      deadlines,
      prices,
      deals,
      lastRefresh: /* @__PURE__ */ new Date()
    };
  }
  buildTrips(research, itineraries, gaps) {
    const tripMap = /* @__PURE__ */ new Map();
    for (const itin of itineraries) {
      const dest = this.normalizeDestination(itin.destination);
      const urgentCount = gaps.filter(
        (g) => this.normalizeDestination(g.destination) === dest && g.priority === "urgent" && !g.checked
      ).length;
      const readiness = this.calculateReadiness(itin);
      tripMap.set(dest, {
        id: dest.toLowerCase().replace(/\s+/g, "-"),
        destination: itin.destination,
        countryCode: this.getCountryCode(itin.destination),
        tripDates: itin.tripDates,
        duration: itin.duration,
        travelers: itin.travelers,
        budget: itin.totalBudget || "TBD",
        status: this.mapItineraryStatus(itin.status),
        readinessPercent: readiness,
        urgentItems: urgentCount,
        itineraryPath: itin.path,
        lastUpdated: /* @__PURE__ */ new Date()
      });
    }
    for (const res of research) {
      const dest = this.normalizeDestination(res.destination);
      if (!tripMap.has(dest)) {
        tripMap.set(dest, {
          id: dest.toLowerCase().replace(/\s+/g, "-"),
          destination: res.destination,
          countryCode: this.getCountryCode(res.destination),
          tripDates: res.tripTiming || "TBD",
          duration: res.duration || "TBD",
          travelers: res.travelers || 1,
          budget: "TBD",
          status: "research",
          readinessPercent: res.status === "complete" ? 30 : 15,
          urgentItems: 0,
          researchPath: res.path,
          lastUpdated: /* @__PURE__ */ new Date()
        });
      } else {
        const trip = tripMap.get(dest);
        trip.researchPath = res.path;
      }
    }
    return Array.from(tripMap.values()).filter((t) => this.isActiveTrip(t)).sort((a, b) => this.compareTripDates(a.tripDates, b.tripDates));
  }
  buildDeadlines(itineraries, gaps, prices) {
    const deadlines = [];
    const now = /* @__PURE__ */ new Date();
    for (const gap of gaps) {
      if (gap.priority === "urgent" && !gap.checked) {
        deadlines.push({
          id: `gap-${gap.destination}-${gap.question.slice(0, 20)}`,
          destination: gap.destination,
          description: gap.question,
          date: "ASAP",
          daysRemaining: 0,
          priority: "urgent",
          source: "gaps"
        });
      }
    }
    for (const itin of itineraries) {
      for (const task of itin.urgentTasks) {
        const dateMatch = task.match(/by\s+(\w+\s+\d+|\d+\/\d+)/i);
        const daysRemaining = dateMatch ? this.estimateDaysRemaining(dateMatch[1]) : 14;
        deadlines.push({
          id: `itin-${itin.destination}-${task.slice(0, 20)}`,
          destination: itin.destination,
          description: task,
          date: dateMatch ? dateMatch[1] : "Soon",
          daysRemaining,
          priority: daysRemaining <= 14 ? "urgent" : daysRemaining <= 30 ? "soon" : "upcoming",
          source: "itinerary"
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
  calculateReadiness(itin) {
    let readiness = 0;
    switch (itin.status) {
      case "draft":
        readiness = 40;
        break;
      case "final":
        readiness = 70;
        break;
      case "booked":
        readiness = 90;
        break;
      case "completed":
        readiness = 100;
        break;
    }
    if (itin.totalTasks > 0) {
      const taskCompletion = itin.checkedTasks / itin.totalTasks;
      readiness = Math.round(readiness * 0.7 + taskCompletion * 30);
    }
    return Math.min(100, readiness);
  }
  normalizeDestination(dest) {
    return dest.toLowerCase().replace(/,.*$/, "").replace(/\s+/g, " ").trim();
  }
  getCountryCode(destination) {
    const codes = {
      "peru": "\u{1F1F5}\u{1F1EA}",
      "mexico": "\u{1F1F2}\u{1F1FD}",
      "cabo": "\u{1F1F2}\u{1F1FD}",
      "cabo san lucas": "\u{1F1F2}\u{1F1FD}",
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
      "costa rica": "\u{1F1E8}\u{1F1F7}"
    };
    const lower = destination.toLowerCase();
    for (const [key, code] of Object.entries(codes)) {
      if (lower.includes(key))
        return code;
    }
    return "\u{1F30D}";
  }
  mapItineraryStatus(status) {
    switch (status) {
      case "draft":
        return "planning";
      case "final":
        return "planning";
      case "booked":
        return "booked";
      case "completed":
        return "complete";
      default:
        return "planning";
    }
  }
  isActiveTrip(trip) {
    if (trip.status === "complete")
      return false;
    return true;
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
    const patterns = [
      /(\w+)\s+(\d+)(?:\s*-\s*\d+)?,?\s*(\d{4})/i,
      // "June 27-July 5, 2026"
      /(\d{4})-(\d{2})-(\d{2})/
      // "2026-06-27"
    ];
    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        try {
          return new Date(dateStr);
        } catch (e) {
          continue;
        }
      }
    }
    return null;
  }
  estimateDaysRemaining(dateStr) {
    try {
      const target = new Date(dateStr);
      const now = /* @__PURE__ */ new Date();
      const diff = target.getTime() - now.getTime();
      return Math.max(0, Math.floor(diff / (1e3 * 60 * 60 * 24)));
    } catch (e) {
      return 30;
    }
  }
};

// src/main.ts
var TravelDashboardPlugin = class extends import_obsidian4.Plugin {
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
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TRAVEL_DASHBOARD);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view && view.refresh) {
        setTimeout(() => view.refresh(), 500);
      }
    }
  }
};
