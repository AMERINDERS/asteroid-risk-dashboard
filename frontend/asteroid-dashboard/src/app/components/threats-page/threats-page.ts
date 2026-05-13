import { Component, signal } from '@angular/core';
import { ThreatFeedComponent } from '../threat-feed/threat-feed';
import { DetailPanelComponent } from '../detail-panel/detail-panel';

@Component({
  selector: 'app-threats-page',
  standalone: true,
  imports: [ThreatFeedComponent, DetailPanelComponent],
  template: `
    <div class="threats-layout">
      <div class="main-col">
        <h1 class="page-title">Threat Feed</h1>
        <p class="page-desc">All near-Earth asteroids approaching in the next 30 days, sorted by risk.</p>
        <app-threat-feed (asteroidSelected)="onSelect($event)"></app-threat-feed>
      </div>
      @if (selectedId()) {
        <aside class="side-col">
          <app-detail-panel [asteroidId]="selectedId()"></app-detail-panel>
        </aside>
      }
    </div>
  `,
  styles: [`
    .threats-layout { display: flex; gap: var(--space-6); }
    .main-col { flex: 1; min-width: 0; }
    .side-col { width: 300px; flex-shrink: 0; }
    .page-title { font-family: var(--font-display); font-size: 24px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.02em; margin: 0 0 var(--space-2) 0; }
    .page-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 var(--space-6) 0; }
  `],
})
export class ThreatsPageComponent {
  selectedId = signal<string | null>(null);
  onSelect(id: string) { this.selectedId.set(id); }
}
