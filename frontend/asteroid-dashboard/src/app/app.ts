import { Component, signal, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import {
  LucideAngularModule,
  Globe,
  Activity,
  AlertTriangle,
  Compass,
  BarChart3,
  Settings,
  Menu,
  LucideIconData,
} from 'lucide-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly icons = { Settings, Menu };

  private router = inject(Router);

  navOpen = signal<boolean>(true);

  isGlobeView = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects.startsWith('/globe')),
      startWith(this.router.url.startsWith('/globe')),
    ),
    { initialValue: false },
  );

  navItems: { route: string; icon: LucideIconData; label: string; badge?: number }[] = [
    { route: '/',          icon: Activity,      label: 'Overview' },
    { route: '/globe',     icon: Globe,         label: 'Orbital map' },
    { route: '/threats',   icon: AlertTriangle, label: 'Threats', badge: 15 },
    { route: '/sentry',    icon: Compass,       label: 'Sentry watchlist' },
    { route: '/analytics', icon: BarChart3,     label: 'Analytics' },
  ];
}
