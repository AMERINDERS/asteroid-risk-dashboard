import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  Globe,
  Activity,
  AlertTriangle,
  Compass,
  BarChart3,
  Settings,
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
  readonly icons = { Settings };

  navItems: { route: string; icon: LucideIconData; label: string; badge?: number }[] = [
    { route: '/',          icon: Activity,      label: 'Overview' },
    { route: '/globe',     icon: Globe,         label: 'Orbital map' },
    { route: '/threats',   icon: AlertTriangle, label: 'Threats', badge: 15 },
    { route: '/sentry',    icon: Compass,       label: 'Sentry watchlist' },
    { route: '/analytics', icon: BarChart3,     label: 'Analytics' },
  ];
}
