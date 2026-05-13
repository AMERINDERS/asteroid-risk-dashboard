import { Component, input, effect, inject, signal } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { LucideAngularModule, X, ExternalLink } from 'lucide-angular';
import { AsteroidApiService } from '../../services/asteroid-api.service';
import { AsteroidDetail } from '../../models/asteroid.model';

@Component({
  selector: 'app-detail-panel',
  standalone: true,
  imports: [MatSidenavModule, LucideAngularModule],
  templateUrl: './detail-panel.html',
  styleUrl: './detail-panel.scss',
})
export class DetailPanelComponent {
  asteroidId = input<string | null>(null);

  private api = inject(AsteroidApiService);

  readonly icons = { X, ExternalLink };
  detail = signal<AsteroidDetail | null>(null);
  loading = signal(false);

  constructor() {
    effect(() => {
      const id = this.asteroidId();
      if (!id) {
        this.detail.set(null);
        return;
      }
      this.loading.set(true);
      this.api.getAsteroid(id).subscribe({
        next: d => { this.detail.set(d); this.loading.set(false); },
        error: () => { this.loading.set(false); },
      });
    });
  }

  riskLabel(score: number): string {
    if (score >= 80) return 'Critical';
    if (score >= 50) return 'High';
    if (score >= 20) return 'Medium';
    return 'Low';
  }

  riskClass(score: number): string {
    if (score >= 80) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
  }
}
