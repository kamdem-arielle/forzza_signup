import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../services/api.service';
import { CoreService } from '../../services/core.service';


interface Transaction {
  id: number;
  bettor_name: string;
  amount: number;
  promo_code: string;
  agent_name: string;
  transaction_date: string;
  created_at: string;
}

interface Agent {
  id: number;
  name: string;
  promo_code: string;
}

@Component({
  selector: 'app-admin-transactions',
  templateUrl: './admin-transactions.component.html',
  styleUrls: ['./admin-transactions.component.css']
})
export class AdminTransactionsComponent implements OnInit {

  transactions: Transaction[] = [];
  agents: Agent[] = [];
  isLoading = false;
  isImporting = false;
  message = '';
  isSuccess = false;

  // Import fields
  selectedFile: File | null = null;
  importDate: string = '';
  selectedPromoCode: string = '';

  // Filters
  startDate: string = '';
  endDate: string = '';
  filterPromoCode: string = '';

  // Summary
  totalTransactions = 0;
  totalAmount = 0;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private translate: TranslateService,
    public coreService: CoreService
  ) {}

  ngOnInit(): void {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      this.router.navigate(['/admin/login']);
      return;
    }

    this.initializeDates();
    this.loadAgents();
    this.loadTransactions();
  }

  initializeDates(): void {
    const today = new Date();
    const lastMonthFromToday = new Date(today);
    lastMonthFromToday.setMonth(today.getMonth() - 1);

    this.endDate = this.formatDate(today);
    this.startDate = this.formatDate(lastMonthFromToday);
    this.importDate = this.formatDate(today);
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDateForFileExport(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}_${month}_${year}`;
  }

  loadAgents(): void {
    this.apiService.getAllAgents().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.agents = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading agents:', error);
      }
    });
  }

  loadTransactions(): void {
    this.isLoading = true;
    const filters: any = {};
    
    if (this.startDate) filters.startDate = this.startDate;
    if (this.endDate) filters.endDate = this.endDate;
    if (this.filterPromoCode) filters.promoCode = this.filterPromoCode;

    this.apiService.getTransactions(filters).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.transactions = response.data || [];
          this.totalTransactions = response.summary?.totalTransactions || 0;
          this.totalAmount = response.summary?.totalAmount || 0;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.showMessage(error.error?.message || 'Failed to load transactions', false);
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
    } else {
      this.selectedFile = null;
      this.showMessage(this.translate.instant('transactions.invalidFileType'), false);
    }
  }

  importPDF(): void {
    if (!this.selectedFile) {
      this.showMessage(this.translate.instant('transactions.selectFile'), false);
      return;
    }
    if (!this.importDate) {
      this.showMessage(this.translate.instant('transactions.selectDate'), false);
      return;
    }

    this.isImporting = true;

    this.apiService.importTransactions(this.selectedFile, this.importDate).subscribe({
      next: (response: any) => {
        this.isImporting = false;
        if (response.success) {
          this.showMessage(
            this.translate.instant('transactions.importSuccess', { count: response.data?.importedCount || 0 }),
            true
          );
          this.selectedFile = null;
          // Reset file input
          const fileInput = document.getElementById('pdfFile') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          // Reload transactions
          this.loadTransactions();
        }
      },
      error: (error) => {
        this.isImporting = false;
        this.showMessage(error.error?.message || 'Failed to import PDF', false);
      }
    });
  }

  onFilterChange(): void {
    this.loadTransactions();
  }

  resetFilters(): void {
    this.initializeDates();
    this.filterPromoCode = '';
    this.loadTransactions();
  }

  calculateGroupSummary(options: any): void {
    if (options.name === 'totalAmount') {
      if (options.summaryProcess === 'start') {
        options.totalValue = 0;
      } else if (options.summaryProcess === 'calculate') {
        options.totalValue += options.value;
      }
    }
  }

  customizeGroupHeader = (data: any) => {
    const agentName = data.items && data.items[0] ? data.items[0].agent_name || 'Unknown' : 'Unknown';
    const promoCode = data.key;
    const total = data.aggregates && data.aggregates[0] ? data.aggregates[0] : 0;
    return `${agentName} - ${promoCode} - Total: ${this.formatCurrency(total)} XAF`;
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private showMessage(msg: string, success: boolean): void {
    this.message = msg;
    this.isSuccess = success;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  getGroupTitle(cellInfo: any) {
    if (
      cellInfo.rowType == "group" &&
      cellInfo.data.collapsedItems &&
      cellInfo.data.collapsedItems.length != 0
    ) {
      return `${cellInfo.data.collapsedItems[0].agent_name} |  ${cellInfo.data.collapsedItems[0].promo_code} | ${cellInfo.data.aggregates[0]} XAF`;
    } else if (
      cellInfo.rowType == "group" &&
      cellInfo.data.items &&
      cellInfo.data.items.length != 0
    ) {
      return `${cellInfo.data.items[0].agent_name} |  ${cellInfo.data.items[0].promo_code} | ${cellInfo.data.aggregates[0]} XAF`;
    }
    return '';
  }

  getFileName(){
    let startdate=this.formatDateForFileExport(new Date(this.startDate));
    let enddate=this.formatDateForFileExport(new Date(this.endDate));
    return `Transactions_${startdate}_${enddate}.xlsx`;
  }



}
