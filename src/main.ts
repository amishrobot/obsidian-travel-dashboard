import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TravelDashboardView, VIEW_TYPE_TRAVEL_DASHBOARD } from './TravelDashboardView';
import { DataService } from './services/DataService';

export default class TravelDashboardPlugin extends Plugin {
    dataService: DataService;
    private refreshTimeout: NodeJS.Timeout | null = null;

    async onload() {
        console.log('Loading Travel Dashboard plugin');

        this.dataService = new DataService(this.app);

        // Register the custom view
        this.registerView(
            VIEW_TYPE_TRAVEL_DASHBOARD,
            (leaf: WorkspaceLeaf) => new TravelDashboardView(leaf, this)
        );

        // Add ribbon icon (plane)
        this.addRibbonIcon('plane', 'Travel Dashboard', () => {
            this.activateView();
        });

        // Add command to open dashboard
        this.addCommand({
            id: 'open-travel-dashboard',
            name: 'Open Travel Dashboard',
            callback: () => this.activateView(),
        });

        // Watch for file changes in travel folder
        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (file.path.startsWith('Personal/travel')) {
                    this.refreshDashboard();
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('create', (file) => {
                if (file.path.startsWith('Personal/travel')) {
                    this.refreshDashboard();
                }
            })
        );
    }

    async onunload() {
        console.log('Unloading Travel Dashboard plugin');
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_TRAVEL_DASHBOARD);

        if (leaves.length > 0) {
            // View already open, reveal it
            leaf = leaves[0];
        } else {
            // Open in right sidebar
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                    type: VIEW_TYPE_TRAVEL_DASHBOARD,
                    active: true,
                });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    async refreshDashboard() {
        // Cancel any pending refresh to properly debounce
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        this.refreshTimeout = setTimeout(() => {
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TRAVEL_DASHBOARD);
            for (const leaf of leaves) {
                const view = leaf.view as TravelDashboardView;
                if (view && view.refresh) {
                    view.refresh();
                }
            }
        }, 500);
    }
}
