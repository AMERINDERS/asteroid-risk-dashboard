import { Component, inject, OnInit } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartOptions } from 'chart.js';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  LineController,
  BarController,
  Tooltip,
  Filler,
} from 'chart.js';
import { AsteroidApiService } from '../../services/asteroid-api.service';
import { MonthlyData } from '../../models/asteroid.model';

// Register chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  LineController,
  BarController,
  Tooltip,
  Filler,
);

@Component({
  selector: 'app-history-chart',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './history-chart.html',
  styleUrl: './history-chart.scss',
})
export class HistoryChartComponent implements OnInit {
  private api = inject(AsteroidApiService);

  chartType: ChartConfiguration['type'] = 'bar';

  chartData: ChartData<any> = {
    labels: [],
    datasets: [
      {
        type: 'bar',
        label: 'Flybys',
        data: [],
        backgroundColor: 'rgba(79, 142, 247, 0.25)',
        borderColor: 'rgba(79, 142, 247, 0.6)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Avg Risk',
        data: [],
        borderColor: '#4F8EF7',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#4F8EF7',
        borderWidth: 2,
        yAxisID: 'y1',
      },
    ],
  };

  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(11, 15, 30, 0.95)',
        borderColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        titleColor: 'rgba(232, 234, 240, 1)',
        bodyColor: 'rgba(180, 192, 215, 0.75)',
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: 'rgba(122, 131, 154, 0.65)', font: { size: 11 } },
        border: { color: 'rgba(255,255,255,0.06)' },
      },
      y: {
        type: 'linear',
        position: 'left',
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: 'rgba(122, 131, 154, 0.65)', font: { size: 11 } },
        border: { color: 'rgba(255,255,255,0.06)' },
        title: { display: true, text: 'Flybys', color: 'rgba(122,131,154,0.65)', font: { size: 11 } },
      },
      y1: {
        type: 'linear',
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: 'rgba(122, 131, 154, 0.65)', font: { size: 11 } },
        border: { color: 'rgba(255,255,255,0.06)' },
        title: { display: true, text: 'Avg Risk', color: 'rgba(122,131,154,0.65)', font: { size: 11 } },
      },
    },
  };

  ngOnInit(): void {
    this.api.getHistorical().subscribe({
      next: (data: MonthlyData[]) => {
        this.chartData = {
          ...this.chartData,
          labels: data.map(d => d.month),
          datasets: [
            { ...(this.chartData.datasets[0] as any), data: data.map(d => d.flyby_count) },
            { ...(this.chartData.datasets[1] as any), data: data.map(d => d.avg_risk_score) },
          ],
        };
      },
      error: () => { /* handle silently */ },
    });
  }
}
