# Travel Dashboard for Obsidian

A sidebar dashboard for tracking travel plans, pricing, and deadlines. Built for the JoshOS personal operating system.

## Features

- **Active Trips** - Cards showing current trips with status, dates, budget, and progress
- **Deadline Countdown** - Upcoming booking deadlines with color-coded urgency
- **Price Tracker** - Flight/hotel prices with trend indicators
- **Quick Actions** - Buttons to copy Claude Code skill commands
- **Deals & Opportunities** - Destinations currently in season or on sale

## Installation

### Via BRAT (recommended for beta testing)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Add this repo: `joshpenrod/obsidian-travel-dashboard`
3. Enable "Travel Dashboard" in Community Plugins

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from releases
2. Create folder: `.obsidian/plugins/travel-dashboard/`
3. Copy the three files into that folder
4. Enable in Settings → Community Plugins

## Usage

Click the ✈️ plane icon in the left ribbon to open the dashboard.

The plugin reads from a specific folder structure:

```
Personal/travel/
├── 01-research/          # Destination research docs
├── 02-itineraries/       # Trip itineraries
├── 00-source-material/
│   └── pricing-snapshots/  # Flight/hotel pricing
└── 04-gaps/
    └── questions.md      # Open questions
```

## Configuration

Currently reads from `Personal/travel/` - paths can be customized in `src/services/DataService.ts`.

## Development

```bash
# Install dependencies
npm install

# Build (production)
npm run build

# Watch mode (development)
npm run dev
```

## License

MIT
