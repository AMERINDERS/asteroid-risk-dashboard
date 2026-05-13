// CRITICAL: Set CESIUM_BASE_URL before bootstrapping so Cesium loads workers from the correct path
(window as any).CESIUM_BASE_URL = '/assets/cesium/';

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
