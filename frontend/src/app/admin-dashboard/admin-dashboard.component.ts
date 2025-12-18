import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService, Signup } from '../services/api.service';
import { BehaviorSubject, Subject, interval, takeUntil, startWith } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  pendingSignups: Signup[] = [];
  approvedSignups: Signup[] = [];
  pending$ = new BehaviorSubject<Signup[]>([]);
  approved$ = new BehaviorSubject<Signup[]>([]);
  private destroy$ = new Subject<void>();
  private initialized = false;
  private newPendingIds = new Set<number>();
  private newApprovedIds = new Set<number>();
  approvingIds = new Set<number>(); // Track which signups are being approved
  visiblePasswordIds = new Set<number>(); // Track which passwords are visible
  message: string = '';
  isSuccess: boolean = false;
  isLoading: boolean = false;
  activeTab: 'pending' | 'approved' = 'pending';

  constructor(private apiService: ApiService, private router: Router, private translate: TranslateService) {}

  ngOnInit(): void {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      this.router.navigate(['/admin/login']);
      return;
    }
    this.startPolling();
  }

  startPolling(): void {
    this.isLoading = true;
    const poll$ = interval(30000).pipe(startWith(0));

    poll$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.apiService.getSignupsByStatus('PENDING').subscribe({
          next: (response) => {
            const data = (response.success && response.data) ? response.data : [];
            // Sort newest first
            const sorted = [...data].sort((a, b) => (new Date(b.created_at || '').getTime()) - (new Date(a.created_at || '').getTime()));
            // Detect new items
            const prev = this.pending$.value;
            const newItems = sorted.filter(s => !prev.find(p => p.id === s.id));
            this.pendingSignups = sorted;
            this.pending$.next(sorted);
            if (this.initialized && newItems.length > 0) {
              this.showMessage(this.translate.instant('dashboard.newSignup'), true);
              // Mark new ones for one-time animation
              newItems.forEach(n => this.markPendingAsNew(n.id));
            }
          },
          error: (error) => {
            this.showMessage(error.error?.message || this.translate.instant('dashboard.loadError'), false);
          }
        });

        this.apiService.getSignupsByStatus('APPROVED').subscribe({
          next: (response) => {
            this.isLoading = false;
            const data = (response.success && response.data) ? response.data : [];
            const sorted = [...data].sort((a, b) => (new Date(b.created_at || '').getTime()) - (new Date(a.created_at || '').getTime()));
            this.approvedSignups = sorted;
            this.approved$.next(sorted);
            if (!this.initialized) {
              // After both streams processed first time, mark initialized
              this.initialized = true;
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.showMessage(error.error?.message || this.translate.instant('dashboard.loadError'), false);
          }
        });
      });
  }

  approveSignup(id: number): void {
    this.approvingIds.add(id); // Set loading state for this specific signup
    
    this.apiService.approveSignup(id).subscribe({
      next: (response) => {
        this.approvingIds.delete(id); // Remove loading state
        
        if (response.success) {
          const prevPending = this.pending$.value;
          const moved = prevPending.find(s => s.id === id);
          // Remove from pending immediately
          const updatedPending = prevPending.filter(s => s.id !== id);
          this.pendingSignups = updatedPending;
          this.pending$.next(updatedPending);

          // Add to approved immediately (optimistic)
          if (moved) {
            const updatedApproved = [{ ...moved, status: 'APPROVED' as 'APPROVED' }, ...this.approved$.value];
            this.approvedSignups = updatedApproved;
            this.approved$.next(updatedApproved);
            this.markApprovedAsNew(moved.id);
          }

          this.showMessage(this.translate.instant('dashboard.approveSuccess'), true);
        } else {
          this.showMessage(response.message || this.translate.instant('dashboard.approveError'), false);
        }
      },
      error: (error) => {
        this.approvingIds.delete(id); // Remove loading state on error
        this.showMessage(error.error?.message || this.translate.instant('dashboard.approveError'), false);
      }
    });
  }

  isApproving(id: number): boolean {
    return this.approvingIds.has(id);
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
    localStorage.removeItem('admin');
    this.router.navigate(['/admin/login']);
  }

  setTab(tab: 'pending' | 'approved'): void {
    this.activeTab = tab;
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

  private markPendingAsNew(id: number): void {
    this.newPendingIds.add(id);
    setTimeout(() => this.newPendingIds.delete(id), 1000);
  }

  private markApprovedAsNew(id: number): void {
    this.newApprovedIds.add(id);
    setTimeout(() => this.newApprovedIds.delete(id), 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
