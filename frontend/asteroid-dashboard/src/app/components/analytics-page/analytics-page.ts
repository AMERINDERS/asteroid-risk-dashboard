import { Component } from '@angular/core';
import { HistoryChartComponent } from '../history-chart/history-chart';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [HistoryChartComponent],
  template: `
    <div>
      <h1 class="page-title">Analytics</h1>
      <p class="page-desc">Historical flyby counts and average risk scores by month.</p>
      <app-history-chart></app-history-chart>
    </div>
  `,
  styles: [`
    .page-title { font-family: var(--font-display); font-size: 24px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.02em; margin: 0 0 var(--space-2) 0; }
    .page-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 var(--space-6) 0; }
  `],
})
export class AnalyticsPageComponent {}
