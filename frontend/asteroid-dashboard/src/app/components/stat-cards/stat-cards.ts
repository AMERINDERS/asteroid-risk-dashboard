import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideAngularModule, TrendingUp, TrendingDown } from 'lucide-angular';
import { AsteroidApiService } from '../../services/asteroid-api.service';

@Component({
  selector: 'app-stat-cards',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './stat-cards.html',
  styleUrl: './stat-cards.scss',
})
export class StatCardsComponent {
  private api = inject(AsteroidApiService);
  stats = toSignal(this.api.getStats());
  readonly icons = { TrendingUp, TrendingDown };
}
