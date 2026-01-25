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
2. Add this repo: `amishrobot/obsidian-travel-dashboard`
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

## Releasing Updates

BRAT detects updates by checking GitHub releases. To publish an update:

1. **Bump version** in `manifest.json` (e.g., `1.1.0` → `1.2.0`)
2. **Build** the plugin:
   ```bash
   npm run build
   ```
3. **Commit and push**:
   ```bash
   git add -A && git commit -m "Your message" && git push
   ```
4. **Create GitHub release** with the built files:
   ```bash
   gh release create X.X.X main.js manifest.json styles.css --title "vX.X.X" --notes "Release notes here"
   ```

Users with BRAT can then check for updates to pull the new version.

**Important:** The release tag (e.g., `1.2.0`) must match the version in `manifest.json`.

## License

MIT
