import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../services/api.service';
import { Subject, interval, takeUntil, startWith } from 'rxjs';

interface Stats {
  totalSignups: number;
  pendingSignups: number;
  approvedSignups: number;
  archivedSignups: number;
  totalAgents: number;
  activeAgents: number;
  todaySignups: number;
  weekSignups: number;
}

@Component({
  selector: 'app-admin-statistics',
  templateUrl: './admin-statistics.component.html',
  styleUrls: ['./admin-statistics.component.css']
})
export class AdminStatisticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  isLoading = true;
  
  stats: Stats = {
    totalSignups: 0,
    pendingSignups: 0,
    approvedSignups: 0,
    archivedSignups: 0,
    totalAgents: 0,
    activeAgents: 0,
    todaySignups: 0,
    weekSignups: 0
  };

  // Top agents
  topAgents: { promo_code: string; name: string; signups: number; admin_name: string }[] = [];
  agents: any[] = [];
  isSuperAdmin = false;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      this.router.navigate(['/admin/login']);
      return;
    }
    const adminData = JSON.parse(admin);
    this.isSuperAdmin = adminData.role === 'superadmin';
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading = true;
    // Load agents first
    this.apiService.getAllAgents().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.agents = response.data;
          this.stats.totalAgents = response.data.length;
          this.stats.activeAgents = response.data.filter((a: any) => a.status === 'active').length;
          // Now load signups
          this.apiService.getSignups().subscribe({
            next: (signupResponse) => {
              if (signupResponse.success && signupResponse.data) {
                const signups = signupResponse.data;
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

                this.stats.totalSignups = signups.length;
                this.stats.pendingSignups = signups.filter(s => s.status === 'PENDING').length;
                this.stats.approvedSignups = signups.filter(s => s.status === 'APPROVED').length;
                this.stats.archivedSignups = signups.filter(s => s.status === 'ARCHIVED').length;

                this.stats.todaySignups = signups.filter(s => {
                  const created = new Date(s.created_at || '');
                  return created >= today;
                }).length;

                this.stats.weekSignups = signups.filter(s => {
                  const created = new Date(s.created_at || '');
                  return created >= weekAgo;
                }).length;

                // Calculate top agents by promo code and match name
                const promoMap = new Map<string, number>();
                signups.forEach(s => {
                  if (s.promo_code) {
                    promoMap.set(s.promo_code, (promoMap.get(s.promo_code) || 0) + 1);
                  }
                });
                this.topAgents = Array.from(promoMap.entries())
                  .map(([promo_code, signups]) => {
                    const agent = this.agents.find(a => a.promo_code === promo_code);
                    return {
                      promo_code,
                      name: agent ? agent.name : promo_code,
                      signups,
                      admin_name: agent ? agent.admin_name : '-'
                    };
                  })
                  .sort((a, b) => b.signups - a.signups)
                  .slice(0, 5);
              }
              this.isLoading = false;
            },
            error: () => {
              this.isLoading = false;
            }
          });
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
