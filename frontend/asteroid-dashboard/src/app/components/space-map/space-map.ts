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
  NearFarScalar,
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

  constructor() {
    // effect() MUST be in injection context (constructor or field initializer)
    effect(() => {
      const items = this.feed();
      if (!this.viewer || items.length === 0) return;
      this.zone.runOutsideAngular(() => this.renderAsteroids(items));
    });
  }

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

      try {
        const scene = (this.viewer as any).scene;
        const globe = scene.globe;

        // Atmosphere & lighting
        scene.skyAtmosphere.show = true;
        scene.fog.enabled = true;
        scene.fog.density = 2e-4;
        globe.enableLighting = true;

        // ── Quality upgrades ─────────────────────────────────────
        // Load tiles at 2× detail (default = 2, lower = sharper)
        globe.maximumScreenSpaceError = 1;
        // Use full device pixel ratio (retina / HiDPI sharpness)
        this.viewer!.resolutionScale = Math.min(window.devicePixelRatio || 1, 2);
        // 4× MSAA — eliminates jagged edges on globe limb
        scene.msaaSamples = 4;
        // Sharper star field
        scene.skyBox.show = true;
        // Depth-test off — prevents labels/points clipping into the globe surface
        globe.depthTestAgainstTerrain = false;

        // ── Camera controller ─────────────────────────────────────
        const ctrl = scene.screenSpaceCameraController;
        // Disable inertia — prevents the camera continuing to zoom after
        // a scroll/touch event fires on page load (race with layout reflow)
        ctrl.inertiaZoom = 0;
        ctrl.inertiaSpin = 0;
        ctrl.inertiaTranslate = 0;
        // Clamp zoom so the camera can never zoom past a sensible range
        ctrl.minimumZoomDistance = 500_000;   // 500 km min
        ctrl.maximumZoomDistance = 50_000_000; // 50,000 km max
      } catch (_) { /* scene not ready */ }

      // Start zoomed out showing Earth clearly
      this.viewer.camera.setView({
        destination: Cartesian3.fromDegrees(0, 0, 25_000_000),
        orientation: {
          heading: 0,
          pitch: -Math.PI / 2, // looking straight down at Earth
          roll: 0,
        },
      });

      this.setupClickHandler();
    });

    // Clock tick for HUD
    this.clockInterval = setInterval(() => {
      this.now.set(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
    }, 1000);
    this.now.set(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
  }

  // Scale factor: actual positions are in metres (geocentric).
  // Nearest asteroid is ~34 LD ≈ 13 billion m — way outside camera view.
  // We scale by 0.001 so that 1 LD (384 Mm) → 384 km above surface,
  // which is clearly visible from the 25 Mm altitude camera.
  private readonly DISPLAY_SCALE = 0.001;

  private renderAsteroids(items: FeedItem[]): void {
    if (!this.viewer) return;
    // Clear previous asteroid entities (keep trail entities)
    this.viewer.entities.values
      .filter(e => !this.trailEntityIds.includes(e.id))
      .forEach(e => this.viewer!.entities.remove(e));

    items.forEach(item => {
      const color = this.colorForRisk(item.risk_score);
      // Scale position so asteroids are visible near Earth in the view
      const position = new Cartesian3(
        item.position.x * this.DISPLAY_SCALE,
        item.position.y * this.DISPLAY_SCALE,
        item.position.z * this.DISPLAY_SCALE,
      );

      // Pixel size based on estimated diameter — small and realistic
      // A 500m asteroid → 5px, a 5km asteroid → 8px, max 14px
      const diamM = item.est_diameter_max_m ?? 300;
      const coreSize = Math.min(14, Math.max(4, Math.log10(diamM + 1) * 3));
      const glowSize  = coreSize * (item.risk_score >= 80 ? 5 : item.risk_score >= 50 ? 4 : 3);

      // Outer glow ring — subtle risk colour, screen-space so always visible
      this.viewer!.entities.add({
        id: `${item.neo_reference_id}-glow`,
        position,
        point: {
          pixelSize: glowSize,
          color: color.withAlpha(0.12),
          outlineWidth: 0,
          scaleByDistance: new NearFarScalar(1e5, 1.5, 5e7, 0.3),
        } as any,
      });

      // Core point — bright white/grey like a real sky-survey image
      // Outline tinted with risk colour for identification
      this.viewer!.entities.add({
        id: item.neo_reference_id,
        position,
        point: {
          pixelSize: coreSize,
          color: Color.fromCssColorString('#F0F0F0').withAlpha(0.95),
          outlineColor: color.withAlpha(0.85),
          outlineWidth: 2,
          scaleByDistance: new NearFarScalar(1e5, 1.5, 5e7, 0.3),
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
          offset: new HeadingPitchRange(0, -0.5, 500_000),
        });
        this.isZoomed.set(true);
        this.loadTrajectory(neoId);
      }

      this.zone.run(() => this.asteroidSelected.emit(neoId));
    }, ScreenSpaceEventType.LEFT_CLICK);
  }

  loadTrajectory(neoId: string): void {
    this.trailEntityIds.forEach(id => {
      const e = this.viewer?.entities.getById(id);
      if (e) this.viewer?.entities.remove(e);
    });
    this.trailEntityIds = [];

    this.api.getTrajectory(neoId).subscribe({
      next: (traj) => {
        if (!this.viewer || traj.points.length < 2) return;
        const positions = traj.points.map(p => new Cartesian3(
          p.x * this.DISPLAY_SCALE,
          p.y * this.DISPLAY_SCALE,
          p.z * this.DISPLAY_SCALE,
        ));
        const item = this.feed().find(f => f.neo_reference_id === neoId);
        const color = item ? this.colorForRisk(item.risk_score) : Color.fromCssColorString('#4F8EF7');

        // Current display position of the asteroid dot
        const dotPos = item ? new Cartesian3(
          item.position.x * this.DISPLAY_SCALE,
          item.position.y * this.DISPLAY_SCALE,
          item.position.z * this.DISPLAY_SCALE,
        ) : null;

        // Find nearest trajectory point to the dot position
        const nearestTrajPoint = dotPos
          ? positions.reduce((best, p) => {
              const dx = p.x - dotPos.x, dy = p.y - dotPos.y, dz = p.z - dotPos.z;
              const dist = dx*dx + dy*dy + dz*dz;
              const bdx = best.p.x - dotPos.x, bdy = best.p.y - dotPos.y, bdz = best.p.z - dotPos.z;
              const bestDist = bdx*bdx + bdy*bdy + bdz*bdz;
              return dist < bestDist ? { p, dist } : best;
            }, { p: positions[0], dist: Infinity }).p
          : null;

        this.zone.runOutsideAngular(() => {
          // Main trajectory arc — glowing orbital path
          const trailId = `${neoId}-trail`;
          this.viewer!.entities.add({
            id: trailId,
            polyline: {
              positions,
              width: 3,
              material: new PolylineGlowMaterialProperty({
                glowPower: 0.25,
                color: color.withAlpha(0.55),
              }),
              clampToGround: false,
            } as any,
          });
          this.trailEntityIds.push(trailId);

          // Faint white core line for crispness
          const coreId = `${neoId}-trail-core`;
          this.viewer!.entities.add({
            id: coreId,
            polyline: {
              positions,
              width: 1,
              material: Color.WHITE.withAlpha(0.25),
              clampToGround: false,
            } as any,
          });
          this.trailEntityIds.push(coreId);

          // Connector: thin dashed line from asteroid dot → nearest orbit point
          if (dotPos && nearestTrajPoint) {
            const connId = `${neoId}-connector`;
            this.viewer!.entities.add({
              id: connId,
              polyline: {
                positions: [dotPos, nearestTrajPoint],
                width: 1,
                material: color.withAlpha(0.45),
                clampToGround: false,
              } as any,
            });
            this.trailEntityIds.push(connId);
          }
        });
      },
      error: () => { /* trajectory may not be available */ }
    });
  }

  flyHome(): void {
    // All Cesium camera ops must run outside Angular zone
    this.zone.runOutsideAngular(() => {
      this.viewer?.camera.flyTo({
        destination: Cartesian3.fromDegrees(0, 20, 25_000_000),
        orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
        duration: 2.0,
      });
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
