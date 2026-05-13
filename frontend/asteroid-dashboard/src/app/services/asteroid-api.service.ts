import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FeedItem,
  DashboardStats,
  MonthlyData,
  TrajectoryResponse,
  AsteroidDetail,
} from '../models/asteroid.model';

@Injectable({ providedIn: 'root' })
export class AsteroidApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getFeed(): Observable<FeedItem[]> {
    return this.http.get<FeedItem[]>(`${this.base}/api/feed`).pipe(
      catchError(err => throwError(() => new Error(`Feed failed: ${err.message}`)))
    );
  }

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.base}/api/stats`).pipe(
      catchError(err => throwError(() => new Error(`Stats failed: ${err.message}`)))
    );
  }

  getHistorical(): Observable<MonthlyData[]> {
    return this.http.get<MonthlyData[]>(`${this.base}/api/historical`).pipe(
      catchError(err => throwError(() => new Error(`Historical failed: ${err.message}`)))
    );
  }

  getAsteroid(id: string): Observable<AsteroidDetail> {
    return this.http.get<AsteroidDetail>(`${this.base}/api/asteroids/${id}`).pipe(
      catchError(err => throwError(() => new Error(`Asteroid detail failed: ${err.message}`)))
    );
  }

  getTrajectory(id: string): Observable<TrajectoryResponse> {
    return this.http.get<TrajectoryResponse>(`${this.base}/api/asteroids/${id}/trajectory`).pipe(
      catchError(err => throwError(() => new Error(`Trajectory failed: ${err.message}`)))
    );
  }
}
