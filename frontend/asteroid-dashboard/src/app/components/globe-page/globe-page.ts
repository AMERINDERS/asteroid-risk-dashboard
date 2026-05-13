import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { SpaceMapComponent } from '../space-map/space-map';
import { DetailPanelComponent } from '../detail-panel/detail-panel';

@Component({
  selector: 'app-globe-page',
  standalone: true,
  imports: [SpaceMapComponent, DetailPanelComponent],
  template: `
    <div class="globe-layout">
      <div class="globe-main">
        <app-space-map (asteroidSelected)="onAsteroidSelected($event)"></app-space-map>
      </div>
      @if (selectedId()) {
        <aside class="globe-panel">
          <app-detail-panel [asteroidId]="selectedId()"></app-detail-panel>
        </aside>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .globe-layout {
      display: flex;
      height: calc(100vh - 56px - var(--nav-h, 0px));
      gap: 0;
    }
    .globe-main {
      flex: 1;
      min-width: 0;
    }
    .globe-panel {
      width: 320px;
      flex-shrink: 0;
      overflow-y: auto;
      background: var(--surface-0);
      border-left: 1px solid var(--border-1);
      padding: var(--space-4);
    }
    @media (max-width: 768px) {
      .globe-layout { flex-direction: column; }
      .globe-main { flex: 0 0 55%; }
      .globe-panel {
        width: 100%;
        flex: 1;
        border-left: none;
        border-top: 1px solid var(--border-1);
        padding: var(--space-3);
      }
    }
  `],
})
export class GlobePageComponent implements OnInit, OnDestroy {
  selectedId = signal<string | null>(null);

  ngOnInit(): void {
    // Apply immediately so .content has padding:0 + overflow:hidden
    // BEFORE SpaceMapComponent.ngAfterViewInit reads the container size.
    // NavigationEnd (used by isGlobeView in app.ts) fires too late.
    document.body.classList.add('globe-active');
  }

  ngOnDestroy(): void {
    document.body.classList.remove('globe-active');
  }

  onAsteroidSelected(id: string) {
    this.selectedId.set(id);
  }
}
