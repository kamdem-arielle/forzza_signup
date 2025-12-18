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
  nameFilter = '';
  phoneFilter = '';
  promoFilter = '';
  private destroy$ = new Subject<void>();
  private firstPendingLoad = true;
  private newPendingIds = new Set<number>();
  private newApprovedIds = new Set<number>();
  approvingIds = new Set<number>(); 
  visiblePasswordIds = new Set<number>();
  editingNoteId: number | null = null;
  noteText: string = '';
  savingNoteIds = new Set<number>();
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
            const sorted = [...data].sort((a, b) => (new Date(b.created_at || '').getTime()) - (new Date(a.created_at || '').getTime()));
            const prevRaw = this.pendingSignups;
            const newItems = sorted.filter(s => !prevRaw.find(p => p.id === s.id));
            this.pendingSignups = sorted;
            this.applyFiltersForAll();
            // Only show notification for new items on subsequent polls (not first load)
            if (!this.firstPendingLoad && newItems.length > 0) {
              this.showMessage(this.translate.instant('dashboard.newSignup'), true);
              newItems.forEach(n => this.markPendingAsNew(n.id));
            }
            this.firstPendingLoad = false;
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
            this.applyFiltersForAll();
          },
          error: (error) => {
            this.isLoading = false;
            this.showMessage(error.error?.message || this.translate.instant('dashboard.loadError'), false);
          }
        });
      });
  }

  approveSignup(id: number): void {
    this.approvingIds.add(id);
    
    this.apiService.approveSignup(id).subscribe({
      next: (response) => {
        this.approvingIds.delete(id);
        
        if (response.success) {
          const prevPending = this.pending$.value;
          const moved = prevPending.find(s => s.id === id);
          const updatedPending = prevPending.filter(s => s.id !== id);
          this.pendingSignups = updatedPending;
          this.pending$.next(updatedPending);
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
        this.approvingIds.delete(id);
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

  applyFilters(): void {
    this.applyFiltersForAll();
  }

  resetFilters(): void {
    this.nameFilter = '';
    this.phoneFilter = '';
    this.promoFilter = '';
    this.applyFiltersForAll();
  }

  private applyFiltersForAll(): void {
    this.pending$.next(this.filterList(this.pendingSignups));
    this.approved$.next(this.filterList(this.approvedSignups));
  }

  private filterList(list: Signup[]): Signup[] {
    return list.filter(item => {
      const matchesName = this.nameFilter
        ? (item.username || '').toLowerCase().includes(this.nameFilter.toLowerCase())
        : true;
      const matchesPhone = this.phoneFilter
        ? (item.phone || '').toLowerCase().includes(this.phoneFilter.toLowerCase())
        : true;
      const matchesPromo = this.promoFilter
        ? (item.promo_code || '').toLowerCase().includes(this.promoFilter.toLowerCase())
        : true;
      return matchesName && matchesPhone && matchesPromo;
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

  startEditingNote(signup: Signup): void {
    this.editingNoteId = signup.id;
    this.noteText = signup.notes || '';
  }

  cancelEditingNote(): void {
    this.editingNoteId = null;
    this.noteText = '';
  }

  saveNote(signup: Signup): void {
    if (this.savingNoteIds.has(signup.id)) return;
    
    this.savingNoteIds.add(signup.id);
    this.apiService.updateSignupNotes(signup.id, this.noteText).subscribe({
      next: (response) => {
        this.savingNoteIds.delete(signup.id);
        if (response.success) {
          // Update local data
          const updateList = (list: Signup[]) => 
            list.map(s => s.id === signup.id ? { ...s, notes: this.noteText } : s);
          this.pendingSignups = updateList(this.pendingSignups);
          this.approvedSignups = updateList(this.approvedSignups);
          this.applyFiltersForAll();
          this.showMessage(this.translate.instant('dashboard.noteSaved'), true);
        } else {
          this.showMessage(response.message || this.translate.instant('dashboard.noteError'), false);
        }
        this.editingNoteId = null;
        this.noteText = '';
      },
      error: (error) => {
        this.savingNoteIds.delete(signup.id);
        this.showMessage(error.error?.message || this.translate.instant('dashboard.noteError'), false);
      }
    });
  }

  isEditingNote(id: number): boolean {
    return this.editingNoteId === id;
  }

  isSavingNote(id: number): boolean {
    return this.savingNoteIds.has(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
