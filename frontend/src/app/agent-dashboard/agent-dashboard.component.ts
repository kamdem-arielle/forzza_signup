import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService, Signup } from '../services/api.service';
import { BehaviorSubject, Subject, interval, takeUntil, startWith } from 'rxjs';

interface AgentData {
  id: number;
  username: string;
  promo_code: string;
  name?: string;
  phone?: string;
  email?: string;
  status: string;
  created_at: string;
}

interface AgentStats {
  total_signups: number;
  pending_signups: number;
  approved_signups: number;
  archived_signups: number;
  approval_rate: number;
  last_signup_at?: string;
}

@Component({
  selector: 'app-agent-dashboard',
  templateUrl: './agent-dashboard.component.html',
  styleUrls: ['./agent-dashboard.component.css']
})
export class AgentDashboardComponent implements OnInit, OnDestroy {
  agent: AgentData | null = null;
  stats: AgentStats | null = null;
  
  pendingSignups: Signup[] = [];
  approvedSignups: Signup[] = [];
  archivedSignups: Signup[] = [];
  pending$ = new BehaviorSubject<Signup[]>([]);
  approved$ = new BehaviorSubject<Signup[]>([]);
  archived$ = new BehaviorSubject<Signup[]>([]);
  
  nameFilter = '';
  phoneFilter = '';
  
  private destroy$ = new Subject<void>();
  private firstPendingLoad = true;
  private newPendingIds = new Set<number>();
  private newApprovedIds = new Set<number>();
  private newArchivedIds = new Set<number>();
  
  visiblePasswordIds = new Set<number>();
  message: string = '';
  isSuccess: boolean = false;
  isLoading: boolean = false;
  activeTab: 'pending' | 'approved' | 'archived' = 'pending';

  // Pagination
  pageSize = 10;
  pendingPage = 1;
  approvedPage = 1;
  archivedPage = 1;

  constructor(
    private apiService: ApiService, 
    private router: Router, 
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const agentData = localStorage.getItem('agent');
    if (!agentData) {
      this.router.navigate(['/agent/login']);
      return;
    }
    
    this.agent = JSON.parse(agentData);
    this.loadStats();
    this.startPolling();
  }

  loadStats(): void {
    if (!this.agent?.promo_code) return;
    
    this.apiService.getAgentStats(this.agent.promo_code).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.stats = response.data;
        }
      },
      error: (error) => {
        console.error('Failed to load stats:', error);
      }
    });
  }

  startPolling(): void {
    if (!this.agent?.promo_code) return;
    
    this.isLoading = true;
    const poll$ = interval(5000).pipe(startWith(0));

    poll$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Load pending signups
        this.apiService.getAgentSignupsByStatus(this.agent!.promo_code, 'PENDING').subscribe({
          next: (response) => {
            const data = (response.success && response.data) ? response.data : [];
            const sorted = [...data].sort((a, b) => 
              (new Date(a.created_at || '').getTime()) - (new Date(b.created_at || '').getTime())
            );
            const prevRaw = this.pendingSignups;
            const newItems = sorted.filter(s => !prevRaw.find(p => p.id === s.id));
            this.pendingSignups = sorted;
            this.applyFiltersForAll();
            if (!this.firstPendingLoad && newItems.length > 0) {
              this.showMessage(this.translate.instant('agentDashboard.newSignup'), true);
              newItems.forEach(n => this.markPendingAsNew(n.id));
            }
            this.firstPendingLoad = false;
          },
          error: (error) => {
            this.showMessage(error.error?.message || this.translate.instant('agentDashboard.loadError'), false);
          }
        });

        // Load approved signups
        this.apiService.getAgentSignupsByStatus(this.agent!.promo_code, 'APPROVED').subscribe({
          next: (response) => {
            this.isLoading = false;
            const data = (response.success && response.data) ? response.data : [];
            const sorted = [...data].sort((a, b) => 
              (new Date(a.created_at || '').getTime()) - (new Date(b.created_at || '').getTime())
            );
            this.approvedSignups = sorted;
            this.applyFiltersForAll();
          },
          error: (error) => {
            this.isLoading = false;
            this.showMessage(error.error?.message || this.translate.instant('agentDashboard.loadError'), false);
          }
        });

        // Load archived signups
        this.apiService.getAgentSignupsByStatus(this.agent!.promo_code, 'ARCHIVED').subscribe({
          next: (response) => {
            const data = (response.success && response.data) ? response.data : [];
            const sorted = [...data].sort((a, b) => 
              (new Date(a.created_at || '').getTime()) - (new Date(b.created_at || '').getTime())
            );
            this.archivedSignups = sorted;
            this.applyFiltersForAll();
          },
          error: (error) => {
            this.showMessage(error.error?.message || this.translate.instant('agentDashboard.loadError'), false);
          }
        });

        // Refresh stats
        this.loadStats();
      });
  }

  togglePasswordVisibility(id: number): void {
    if (this.visiblePasswordIds.has(id)) {
      this.visiblePasswordIds.delete(id);
    } else {
      this.visiblePasswordIds.add(id);
    }
  }

  isPasswordVisible(id: number): boolean {
    return this.visiblePasswordIds.has(id);
  }

  getPasswordDisplay(password: string | undefined, id: number): string {
    if (!password) return '';
    return this.isPasswordVisible(id) ? password : '••••••••';
  }

  logout(): void {
    localStorage.removeItem('agent');
    this.router.navigate(['/agent/login']);
  }

  setTab(tab: 'pending' | 'approved' | 'archived'): void {
    this.activeTab = tab;
  }

  // Pagination methods
  getPaginatedList(list: Signup[], page: number): Signup[] {
    const start = (page - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  getTotalPages(list: Signup[]): number {
    return Math.ceil(list.length / this.pageSize) || 1;
  }

  goToPage(tab: 'pending' | 'approved' | 'archived', page: number): void {
    const list = tab === 'pending' ? this.pending$.value : tab === 'approved' ? this.approved$.value : this.archived$.value;
    const totalPages = this.getTotalPages(list);
    if (page < 1 || page > totalPages) return;
    
    if (tab === 'pending') this.pendingPage = page;
    else if (tab === 'approved') this.approvedPage = page;
    else this.archivedPage = page;
  }

  getCurrentPage(tab: 'pending' | 'approved' | 'archived'): number {
    if (tab === 'pending') return this.pendingPage;
    if (tab === 'approved') return this.approvedPage;
    return this.archivedPage;
  }

  getPageNumbers(totalPages: number): number[] {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  private showMessage(msg: string, success: boolean): void {
    this.message = msg;
    this.isSuccess = success;
    setTimeout(() => {
      this.message = '';
    }, 4000);
  }

  isPendingNew(id: number): boolean {
    return this.newPendingIds.has(id);
  }

  isApprovedNew(id: number): boolean {
    return this.newApprovedIds.has(id);
  }

  isArchivedNew(id: number): boolean {
    return this.newArchivedIds.has(id);
  }

  onFilterChange(): void {
    this.pendingPage = 1;
    this.approvedPage = 1;
    this.archivedPage = 1;
    this.applyFiltersForAll();
  }

  resetFilters(): void {
    this.nameFilter = '';
    this.phoneFilter = '';
    this.pendingPage = 1;
    this.approvedPage = 1;
    this.archivedPage = 1;
    this.applyFiltersForAll();
  }

  private applyFiltersForAll(): void {
    this.pending$.next(this.filterList(this.pendingSignups));
    this.approved$.next(this.filterList(this.approvedSignups));
    this.archived$.next(this.filterList(this.archivedSignups));
  }

  private filterList(list: Signup[]): Signup[] {
    return list.filter(item => {
      const matchesName = this.nameFilter
        ? (item.username || '').toLowerCase().includes(this.nameFilter.toLowerCase())
        : true;
      const matchesPhone = this.phoneFilter
        ? (item.phone || '').toLowerCase().includes(this.phoneFilter.toLowerCase())
        : true;
      return matchesName && matchesPhone;
    });
  }

  private markPendingAsNew(id: number): void {
    this.newPendingIds.add(id);
    setTimeout(() => this.newPendingIds.delete(id), 1000);
  }

  private markApprovedAsNew(id: number): void {
    this.newApprovedIds.add(id);
    setTimeout(() => this.newApprovedIds.delete(id), 1000);
  }

  private markArchivedAsNew(id: number): void {
    this.newArchivedIds.add(id);
    setTimeout(() => this.newArchivedIds.delete(id), 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
