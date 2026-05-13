import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  NgZone,
  inject,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';
import { AsteroidApiService } from '../../services/asteroid-api.service';
import { environment } from '../../../environments/environment';
import { FeedItem } from '../../models/asteroid.model';

// CesiumJS imports
import {
  Ion,
  Viewer,
  Cartesian3,
  Color,
  HeadingPitchRange,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  PolylineGlowMaterialProperty,
  Entity,
} from 'cesium';

interface AlertAsteroid {
  name: string;
  hours: number;
}

@Component({
  selector: 'app-space-map',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="map-host">
      <div #cesiumContainer class="cesium-host"></div>

      <!-- Top-left: timestamp -->
      <div class="hud hud-tl">
        <span>{{ now() }}</span>
      </div>

      <!-- Top-right: critical alert (only when present) -->
      @if (alertAsteroid()) {
        <div class="hud hud-tr">
          <span class="alert-dot"></span>
          Critical — {{ alertAsteroid()!.name }}
          <span class="alert-eta">T-{{ alertAsteroid()!.hours }}h</span>
        </div>
      }

      <!-- Bottom: back to Earth button when zoomed in -->
      @if (isZoomed()) {
        <button class="back-btn" (click)="flyHome()">
          <lucide-icon [img]="arrowLeftIcon" size="16"></lucide-icon>
          Back to Earth
        </button>
      }
    </div>
  `,
  styleUrl: './space-map.scss',
})
export class SpaceMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cesiumContainer') ref!: ElementRef<HTMLDivElement>;

  private zone = inject(NgZone);
  private api = inject(AsteroidApiService);

  readonly arrowLeftIcon = ArrowLeft;

  asteroidSelected = output<string>();
  feed = toSignal(this.api.getFeed(), { initialValue: [] });

  // HUD signals
  now = signal<string>('');
  isZoomed = signal<boolean>(false);

  alertAsteroid = computed<AlertAsteroid | null>(() => {
    const items = this.feed();
    const critical = items.find(i => i.risk_score >= 80);
    if (!critical) return null;
    const approach = new Date(critical.approach_date);
    const diffMs = approach.getTime() - Date.now();
    const hours = Math.max(0, Math.floor(diffMs / 3_600_000));
    return { name: critical.name, hours };
  });

  private viewer?: Viewer;
  private clickHandler?: ScreenSpaceEventHandler;
  private clockInterval?: ReturnType<typeof setInterval>;
  private trailEntityIds: string[] = [];

  ngAfterViewInit(): void {
    Ion.defaultAccessToken = environment.cesiumIonToken;

    this.zone.runOutsideAngular(() => {
      this.viewer = new Viewer(this.ref.nativeElement, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
      });

      // Optional scene settings — guarded against undefined
      try {
        (this.viewer as any).scene.skyAtmosphere.show = true;
        (this.viewer as any).scene.fog.enabled = true;
        (this.viewer as any).scene.fog.density = 2e-4;
        (this.viewer as any).scene.globe.enableLighting = true;
      } catch (_) { /* viewer not ready */ }

      // Initial camera
      this.viewer.camera.setView({
        destination: Cartesian3.fromDegrees(-30, 20, 30_000_000),
        orientation: { heading: 0, pitch: -0.6, roll: 0 },
      });

      this.setupClickHandler();
    });

    // Clock tick for HUD
    this.clockInterval = setInterval(() => {
      this.zone.run(() => this.now.set(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'));
    }, 1000);
    this.now.set(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');

    // React to feed signal — render asteroids when data arrives
    effect(() => {
      const items = this.feed();
      if (!this.viewer || items.length === 0) return;
      this.zone.runOutsideAngular(() => this.renderAsteroids(items));
    });
  }

  private renderAsteroids(items: FeedItem[]): void {
    if (!this.viewer) return;
    // Clear previous asteroid entities (keep trail entities)
    this.viewer.entities.values
      .filter(e => !this.trailEntityIds.includes(e.id))
      .forEach(e => this.viewer!.entities.remove(e));

    items.forEach(item => {
      const radius = Math.max(80_000, (item.est_diameter_max_m ?? 100) * 100);
      const color = this.colorForRisk(item.risk_score);
      const position = new Cartesian3(item.position.x, item.position.y, item.position.z);
      const glowMultiplier = item.risk_score >= 80 ? 3 : item.risk_score >= 50 ? 2.2 : 1.5;

      // Glow halo — added FIRST so it renders behind
      this.viewer!.entities.add({
        id: `${item.neo_reference_id}-glow`,
        position,
        ellipsoid: {
          radii: new Cartesian3(radius * glowMultiplier, radius * glowMultiplier, radius * glowMultiplier),
          material: color.withAlpha(0.10),
          outline: false,
        } as any,
      });

      // Solid asteroid on top
      this.viewer!.entities.add({
        id: item.neo_reference_id,
        position,
        ellipsoid: {
          radii: new Cartesian3(radius, radius, radius),
          material: color.withAlpha(0.85),
          outline: true,
          outlineColor: color,
        } as any,
      });
    });
  }

  private setupClickHandler(): void {
    if (!this.viewer) return;
    this.clickHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.clickHandler.setInputAction((click: any) => {
      const picked = this.viewer!.scene.pick(click.position);
      if (!picked || !picked.id) return;

      let neoId: string = typeof picked.id.id === 'string' ? picked.id.id : '';
      if (neoId.endsWith('-glow')) neoId = neoId.replace('-glow', '');
      if (!neoId) return;

      const entity = this.viewer!.entities.getById(neoId);
      if (entity) {
        this.viewer!.flyTo(entity, {
          duration: 2.5,
          offset: new HeadingPitchRange(0, -0.5, 5_000_000),
        });
        this.isZoomed.set(true);
        this.loadTrajectory(neoId);
      }

      this.zone.run(() => this.asteroidSelected.emit(neoId));
    }, ScreenSpaceEventType.LEFT_CLICK);
  }

  loadTrajectory(neoId: string): void {
    // Clear previous trail
    this.trailEntityIds.forEach(id => {
      const e = this.viewer?.entities.getById(id);
      if (e) this.viewer?.entities.remove(e);
    });
    this.trailEntityIds = [];

    this.api.getTrajectory(neoId).subscribe({
      next: (traj) => {
        if (!this.viewer || traj.points.length < 2) return;
        const positions = traj.points.map(p => new Cartesian3(p.x, p.y, p.z));
        const item = this.feed().find(f => f.neo_reference_id === neoId);
        const color = item ? this.colorForRisk(item.risk_score) : Color.fromCssColorString('#4F8EF7');

        this.zone.runOutsideAngular(() => {
          const trailId = `${neoId}-trail`;
          this.viewer!.entities.add({
            id: trailId,
            polyline: {
              positions,
              width: 2,
              material: new PolylineGlowMaterialProperty({
                glowPower: 0.15,
                color: color.withAlpha(0.4),
              }),
            } as any,
          });
          this.trailEntityIds.push(trailId);
        });
      },
      error: () => { /* trajectory not always available */ }
    });
  }

  flyHome(): void {
    this.viewer?.camera.flyTo({
      destination: Cartesian3.fromDegrees(-30, 20, 30_000_000),
      orientation: { heading: 0, pitch: -0.6, roll: 0 },
      duration: 2,
    });
    this.isZoomed.set(false);
  }

  private colorForRisk(score: number): Color {
    if (score >= 80) return Color.fromCssColorString('#FF4757');
    if (score >= 50) return Color.fromCssColorString('#FFA832');
    if (score >= 20) return Color.fromCssColorString('#4F8EF7');
    return Color.fromCssColorString('#2ED573');
  }

  ngOnDestroy(): void {
    this.clickHandler?.destroy();
    this.viewer?.destroy();
    if (this.clockInterval) clearInterval(this.clockInterval);
  }
}
