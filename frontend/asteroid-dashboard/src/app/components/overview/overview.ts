import { Component, signal } from '@angular/core';
import { StatCardsComponent } from '../stat-cards/stat-cards';
import { ThreatFeedComponent } from '../threat-feed/threat-feed';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [StatCardsComponent, ThreatFeedComponent],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class OverviewComponent {
  selectedAsteroidId = signal<string | null>(null);

  onAsteroidSelected(id: string) {
    this.selectedAsteroidId.set(id);
  }
}
