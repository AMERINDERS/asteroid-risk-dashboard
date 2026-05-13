import { Component } from '@angular/core';

@Component({
  selector: 'app-sentry-page',
  standalone: true,
  template: `
    <div>
      <h1 class="page-title">Sentry Watchlist</h1>
      <p class="page-desc">Asteroids tracked by NASA Sentry with non-zero impact probability.</p>
      <div class="placeholder">Data coming soon</div>
    </div>
  `,
  styles: [`
    .page-title { font-family: var(--font-display); font-size: 24px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.02em; margin: 0 0 var(--space-2) 0; }
    .page-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 var(--space-6) 0; }
    .placeholder { color: var(--text-tertiary); font-size: 13px; padding: var(--space-7); text-align: center; background: var(--surface-1); border: 1px solid var(--border-1); border-radius: var(--radius-md); }
  `],
})
export class SentryPageComponent {}
