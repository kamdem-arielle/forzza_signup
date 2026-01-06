import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService, Signup } from '../../services/api.service';

interface Agent {
  id: number;
  name: string;
  username: string;
  promo_code: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  last_login?: string;
}
import { BehaviorSubject, Subject, interval, takeUntil, startWith } from 'rxjs';

@Component({
  selector: 'app-admin-signups',
  templateUrl: './admin-signups.component.html',
  styleUrls: ['./admin-signups.component.css']
})
export class AdminSignupsComponent implements OnInit, OnDestroy {
  pendingSignups: Signup[] = [];
  approvedSignups: Signup[] = [];
  archivedSignups: Signup[] = [];
  pending$ = new BehaviorSubject<Signup[]>([]);
  approved$ = new BehaviorSubject<Signup[]>([]);
  archived$ = new BehaviorSubject<Signup[]>([]);
  nameFilter = '';
  phoneFilter = '';
  promoFilter = '';
  agents: Agent[] = [];
  selectedAgentPromo: string = '';
  private destroy$ = new Subject<void>();
  private firstPendingLoad = true;
  private newPendingIds = new Set<number>();
  private newApprovedIds = new Set<number>();
  private newArchivedIds = new Set<number>();
  approvingIds = new Set<number>(); 
  archivingIds = new Set<number>();
  visiblePasswordIds = new Set<number>();
  editingNoteId: number | null = null;
  noteText: string = '';
  savingNoteIds = new Set<number>();
  message: string = '';
  isSuccess: boolean = false;
  isLoading: boolean = false;
  activeTab: 'pending' | 'approved' | 'archived' = 'pending';

  // Pagination
  pageSize = 10;
  pendingPage = 1;
  approvedPage = 1;
  archivedPage = 1;

  constructor(private apiService: ApiService, private router: Router, private translate: TranslateService) {}

  ngOnInit(): void {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      this.router.navigate(['/admin/login']);
      return;
    }
    this.loadAgents();
    this.startPolling();
  }

  loadAgents(): void {
    this.apiService.getAllAgents().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.agents = response.data;
        }
      },
      error: () => {}
    });
  }

  startPolling(): void {
    this.isLoading = true;
    const poll$ = interval(500000).pipe(startWith(0));

    poll$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.apiService.getSignupsByStatus('PENDING').subscribe({
          next: (response) => {
            const data = (response.success && response.data) ? response.data : [];
            const sorted = [...data].sort((a, b) => (new Date(a.created_at || '').getTime()) - (new Date(b.created_at || '').getTime()));
            const prevRaw = this.pendingSignups;
            const newItems = sorted.filter(s => !prevRaw.find(p => p.id === s.id));
            this.pendingSignups = sorted;
            this.applyFiltersForAll();
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
            const sorted = [...data].sort((a, b) => (new Date(b.created_at || '').getTime()) - (new Date(a.created_at || '').getTime()) );
            this.approvedSignups = sorted;
            this.applyFiltersForAll();
          },
          error: (error) => {
            this.isLoading = false;
            this.showMessage(error.error?.message || this.translate.instant('dashboard.loadError'), false);
          }
        });

        this.apiService.getSignupsByStatus('ARCHIVED').subscribe({
          next: (response) => {
            const data = (response.success && response.data) ? response.data : [];
            const sorted = [...data].sort((a, b) => (new Date(a.created_at || '').getTime()) - (new Date(b.created_at || '').getTime()));
            this.archivedSignups = sorted;
            this.applyFiltersForAll();
          },
          error: (error) => {
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

  archiveSignup(id: number): void {
    this.archivingIds.add(id);
    
    this.apiService.archiveSignup(id).subscribe({
      next: (response) => {
        this.archivingIds.delete(id);
        
        if (response.success) {
          // Check if archiving from approved list
          const prevApproved = this.approved$.value;
          const movedFromApproved = prevApproved.find(s => s.id === id);
          if (movedFromApproved) {
            const updatedApproved = prevApproved.filter(s => s.id !== id);
            this.approvedSignups = updatedApproved;
            this.approved$.next(updatedApproved);
            const updatedArchived = [{ ...movedFromApproved, status: 'ARCHIVED' as 'ARCHIVED' }, ...this.archived$.value];
            this.archivedSignups = updatedArchived;
            this.archived$.next(updatedArchived);
            this.markArchivedAsNew(movedFromApproved.id);
          }

          // Check if archiving from pending list
          const prevPending = this.pending$.value;
          const movedFromPending = prevPending.find(s => s.id === id);
          if (movedFromPending) {
            const updatedPending = prevPending.filter(s => s.id !== id);
            this.pendingSignups = updatedPending;
            this.pending$.next(updatedPending);
            const updatedArchived = [{ ...movedFromPending, status: 'ARCHIVED' as 'ARCHIVED' }, ...this.archived$.value];
            this.archivedSignups = updatedArchived;
            this.archived$.next(updatedArchived);
            this.markArchivedAsNew(movedFromPending.id);
          }

          this.showMessage(this.translate.instant('dashboard.archiveSuccess'), true);
        } else {
          this.showMessage(response.message || this.translate.instant('dashboard.archiveError'), false);
        }
      },
      error: (error) => {
        this.archivingIds.delete(id);
        this.showMessage(error.error?.message || this.translate.instant('dashboard.archiveError'), false);
      }
    });
  }

  isArchiving(id: number): boolean {
    return this.archivingIds.has(id);
  }


  onFilterChange(): void {
    this.pendingPage = 1;
    this.approvedPage = 1;
    this.archivedPage = 1;
    // If agent select is used, clear promoFilter
    if (this.selectedAgentPromo) {
      this.promoFilter = this.selectedAgentPromo;
    }
    this.applyFiltersForAll();
  }

  onAgentFilterChange(): void {
    this.promoFilter = this.selectedAgentPromo;
    this.onFilterChange();
  }

  resetFilters(): void {
    this.nameFilter = '';
    this.phoneFilter = '';
    this.promoFilter = '';
    this.selectedAgentPromo = '';
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

  private markArchivedAsNew(id: number): void {
    this.newArchivedIds.add(id);
    setTimeout(() => this.newArchivedIds.delete(id), 1000);
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
          this.archivedSignups = updateList(this.archivedSignups);
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
