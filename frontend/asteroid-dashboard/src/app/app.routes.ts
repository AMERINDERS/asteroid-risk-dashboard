import { Routes } from '@angular/router';
import { OverviewComponent } from './components/overview/overview';
import { GlobePageComponent } from './components/globe-page/globe-page';
import { ThreatsPageComponent } from './components/threats-page/threats-page';
import { SentryPageComponent } from './components/sentry-page/sentry-page';
import { AnalyticsPageComponent } from './components/analytics-page/analytics-page';

export const routes: Routes = [
  { path: '',          component: OverviewComponent },
  { path: 'globe',     component: GlobePageComponent },
  { path: 'threats',   component: ThreatsPageComponent },
  { path: 'sentry',    component: SentryPageComponent },
  { path: 'analytics', component: AnalyticsPageComponent },
  { path: '**',        redirectTo: '' },
];
