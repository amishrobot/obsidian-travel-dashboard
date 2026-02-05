# Travel Dashboard Plugin - Development Guide

## How This Plugin Works

### Overview
The Travel Dashboard is an Obsidian sidebar plugin that displays travel information parsed from markdown files in your vault. It shows trips, deals, deadlines, prices, and travel windows.

### Data Flow
```
Vault Files                    Parsers                     View
─────────────────────────────────────────────────────────────────
Personal/travel/*.md      →    TripParser         →    renderTripsSection()
_inbox/deals-*.md         →    DealsParser        →    renderDealsSection()
_state/travel-profile.md  →    WindowsParser      →    renderHeroSection()
Trip file frontmatter     →    DeadlineExtractor  →    renderDeadlinesSection()
```

### Where Data Comes From

| Data | Source File(s) | Parser |
|------|----------------|--------|
| Trips | `Personal/travel/YYYY-MM-destination.md` | TripParser.ts |
| Travel Windows | `_state/travel-profile.md` (Travel Windows table) | WindowsParser.ts |
| Deal Alerts | `_inbox/*-flight-deal-alert.md` | DealsParser.ts |
| Deadlines | Extracted from trip frontmatter | DeadlineExtractor.ts |
| Price History | Trip file "Pricing" sections | PriceParser.ts |

### Trip File Schema
Trips are markdown files with YAML frontmatter:
```yaml
---
type: trip
destination: Peru
status: planned          # idea → researching → planned → booked → complete
dates: Jul 12-22, 2026
travelers: "6 (Josh, Adrienne, Kids)"
budget: $15,000
committed: true          # Shows in hero section if true
window: Summer 2026      # Links to travel window
---
```

### Trip Status Lifecycle
```
idea → researching → planned → booked → complete
```
- **idea**: Just a thought, no research yet
- **researching**: Actively looking into it
- **planned**: Dates/details decided, not booked
- **booked**: Flights/hotels confirmed
- **complete**: Trip happened

### Key Rendering Logic

**Hero Section** (`renderHeroSection`):
- If `committedTrip` exists: Show countdown to departure
- Else if `nextWindow` exists: Show next travel window
- Else: Nothing

**Trips Section** (`renderTripsSection`):
- Groups trips by status (booked, planned, researching, idea)
- Only shows sections that have trips

**Deals Section** (`renderDealsSection`):
- Shows discovered deals from `_inbox/` deal alerts
- Falls back to seasonal deals from destination-intelligence.md

## Quick Release Checklist

```bash
# 1. Update version in BOTH files (must match!)
#    - package.json: "version": "X.Y.Z"
#    - manifest.json: "version": "X.Y.Z"

# 2. Build the plugin
npm run build

# 3. Verify the build has your changes
grep -A10 "render()" main.js | head -15

# 4. Commit all changes (including main.js)
git add -A
git commit -m "Release vX.Y.Z - description"
git push

# 5. Create GitHub release with ALL THREE files
gh release create X.Y.Z main.js manifest.json styles.css \
  --title "vX.Y.Z - Title" \
  --notes "Release notes here"

# 6. Verify release has correct files
curl -sL https://github.com/amishrobot/obsidian-travel-dashboard/releases/download/X.Y.Z/manifest.json
curl -sL https://github.com/amishrobot/obsidian-travel-dashboard/releases/download/X.Y.Z/main.js | head -80 | tail -20
```

## BRAT Update in Obsidian

After releasing, in Obsidian:
1. Settings → Community Plugins → BRAT
2. Click "Check for updates and update all Beta Plugins"
3. If that doesn't work, restart Obsidian
4. If STILL doesn't work, disable/re-enable the Travel Dashboard plugin

## File Structure

```
obsidian-travel-dashboard/
├── src/
│   ├── main.ts              # Plugin entry point
│   ├── TravelDashboardView.ts  # Main view (renders the sidebar)
│   ├── models/
│   │   └── Trip.ts          # Data models/interfaces
│   └── services/
│       ├── DataService.ts   # Loads data from vault
│       └── parsers/         # Parse different file types
├── main.js                  # BUILT output (commit this!)
├── manifest.json            # Plugin metadata (version here!)
├── package.json             # npm config (version here too!)
├── styles.css               # Plugin styles
└── esbuild.config.mjs       # Build configuration
```

## Key Files to Understand

### TravelDashboardView.ts
The main view that renders the sidebar. Key methods:
- `render()` - Main render, calls section renderers
- `renderHeader()` - Dashboard title + refresh button
- `renderTripsSection()` - Shows trips grouped by status
- `renderDealsSection()` - Shows deal alerts
- `renderHeroSection()` - Shows committed trip countdown or next window

### DataService.ts
Loads data from the vault:
- `loadAll()` - Returns `DashboardData` with trips, deals, windows, etc.
- Reads from `Personal/travel/` for trip files
- Reads from `_state/travel-profile.md` for travel windows

### Trip.ts (models)
Defines the data interfaces:
- `Trip` - A trip with destination, dates, status, etc.
- `TripStatus` - 'idea' | 'researching' | 'planned' | 'booked' | 'complete'
- `DashboardData` - Everything the view needs to render

## Lessons Learned (2026-02-05 Debug Session)

### Container Element Matters
- **WRONG**: `const container = this.contentEl`
- **RIGHT**: `const container = this.containerEl.children[1]`
- These are NOT always equivalent in Obsidian ItemView

### CSS Classes Can Silently Break Rendering
- Elements created with `container.createDiv({ cls: 'some-class' })` may not be visible
- CSS specificity issues or theme conflicts can hide elements
- **Debug approach**: First test with inline styles to verify container works
- If inline styles work but CSS classes don't, the problem is in styles.css

### Debugging Checklist for "Nothing Renders"
1. Check console for errors
2. Verify data is loaded (console.log the data)
3. Test with a simple `container.innerHTML = '<h1>TEST</h1>'`
4. If that works, the issue is in complex rendering code or CSS
5. If that fails, the container reference is wrong

### BRAT Caching
- BRAT caches aggressively - checking for updates may not work
- The plugin folder is symlinked: changes to main.js are immediate
- Reload Obsidian: Cmd+P → "Reload app without saving"

## Common Issues

### Plugin shows old version
- BRAT caches aggressively
- Try: BRAT settings → "Check for updates"
- Try: Restart Obsidian
- Try: Disable → Re-enable plugin

### Build doesn't include changes
- Make sure you saved the source file
- Run `npm run build` again
- Check output with `grep` to verify changes

### Release has wrong files
- `gh release create` uploads files from current directory
- Make sure you're in the right directory
- Make sure main.js was rebuilt BEFORE creating release

### Version mismatch
- manifest.json AND package.json must have same version
- BRAT checks manifest.json in the release assets
