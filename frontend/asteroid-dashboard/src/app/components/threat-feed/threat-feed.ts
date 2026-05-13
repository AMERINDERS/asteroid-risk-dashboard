import { Component, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { NgClass } from '@angular/common';
import { AsteroidApiService } from '../../services/asteroid-api.service';

@Component({
  selector: 'app-threat-feed',
  standalone: true,
  imports: [MatTableModule, MatSortModule, NgClass],
  templateUrl: './threat-feed.html',
  styleUrl: './threat-feed.scss',
})
export class ThreatFeedComponent {
  private api = inject(AsteroidApiService);

  asteroidSelected = output<string>();

  feed = toSignal(this.api.getFeed(), { initialValue: [] });
  displayedColumns = ['rank', 'name', 'miss', 'velocity', 'risk'];

  riskClass(score: number): string {
    if (score >= 80) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
  }

  onSelect(id: string) {
    this.asteroidSelected.emit(id);
  }
}
