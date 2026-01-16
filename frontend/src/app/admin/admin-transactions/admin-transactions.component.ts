import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService, AdminUser } from '../../services/api.service';
import { CoreService } from '../../services/core.service';


interface Transaction {
  id: number;
  transaction_datetime: string;
  channel: string;
  username: string;
  booking: string;
  amount: number;
  balance: number;
  promo_code: string;
  agent_name: string;
  created_at: string;
}

interface Agent {
  id: number;
  name: string;
  promo_code: string;
  admin_id?: number;
}

@Component({
  selector: 'app-admin-transactions',
  templateUrl: './admin-transactions.component.html',
  styleUrls: ['./admin-transactions.component.css'],
})
export class AdminTransactionsComponent implements OnInit {
  transactions: Transaction[] = [];
  agents: Agent[] = [];
  allAgents: Agent[] = []; // Store all agents for filtering by admin
  isLoading = false;
  isImporting = false;
  message = '';
  isSuccess = false;


  selectedFile: File | null = null;
  selectedPromoCode: string = '';


  channels: string[] = [];
  bookingTypes: string[] = [];
  filterChannel: string = '';
  filterUsername: string = '';
  filterBooking: string = '';


  startDate: string = '';
  endDate: string = '';
  filterPromoCode: string = '';


  totalTransactions = 0;
  totalAmount = 0;
  isSuperAdmin = false;
  
  // Admin filter for superadmin
  admins: AdminUser[] = [];
  selectedAdminId: number | null = null;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private translate: TranslateService,
    public coreService: CoreService
  ) { }

  ngOnInit(): void {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      this.router.navigate(['/admin/login']);
      return;
    }

    const adminData = JSON.parse(admin);
    this.isSuperAdmin = adminData.role === 'superadmin';

    if (this.isSuperAdmin) {
      this.loadAdmins();
    }
    
    this.initializeDates();
    this.loadAgents();
    this.loadFilterOptions();
    this.loadTransactions();
  }

  loadAdmins(): void {
    this.apiService.getAllAdminsList().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.admins = response.data;
        }
      },
      error: () => {}
    });
  }

  onAdminSelectChange(): void {
    this.filterAgentsByAdmin();
    this.filterPromoCode = '';
    this.loadTransactions();
  }

  filterAgentsByAdmin(): void {
    if (this.selectedAdminId !== null && this.selectedAdminId !== undefined) {
      // Use == for comparison to handle string/number type differences
      this.agents = this.allAgents.filter(agent => agent.admin_id == this.selectedAdminId);
    } else {
      this.agents = [...this.allAgents];
    }
  }

  initializeDates(): void {
    const today = new Date();
    const lastMonthFromToday = new Date(today);
    lastMonthFromToday.setMonth(today.getMonth() - 1);

    this.endDate = this.formatDate(today);
    this.startDate = this.formatDate(lastMonthFromToday);
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
          this.allAgents = response.data;
          this.filterAgentsByAdmin();
        }
      },
      error: (error) => {
        console.error('Error loading agents:', error);
      },
    });
  }

  loadFilterOptions(): void {
    this.apiService.getTransactionFilterOptions().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.channels = response.data.channels || [];
          this.bookingTypes = response.data.bookingTypes || [];
        }
      },
      error: (error) => {
        console.error('Error loading filter options:', error);
      },
    });
  }

  loadTransactions(): void {
    this.isLoading = true;
    const filters: any = {};

    if (this.startDate) filters.startDate = this.startDate;
    if (this.endDate) filters.endDate = this.endDate;
    if (this.filterPromoCode) filters.promoCode = this.filterPromoCode;
    if (this.filterChannel) filters.channel = this.filterChannel;
    if (this.filterUsername) filters.username = this.filterUsername;
    if (this.filterBooking) filters.booking = this.filterBooking;

    // Pass selectedAdminId to filter by admin (for superadmin)
    this.apiService.getTransactions(filters, this.selectedAdminId).subscribe({
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
        this.showMessage(
          error.error?.message || 'Failed to load transactions',
          false
        );
      },
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const validExtensions = ['.xlsx', '.xls'];
    const ext = file?.name?.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (
      file &&
      (validTypes.includes(file.type) || validExtensions.includes(ext))
    ) {
      this.selectedFile = file;
    } else {
      this.selectedFile = null;
      this.showMessage(
        this.translate.instant('transactions.invalidFileType'),
        false
      );
    }
  }

  importExcel(): void {
    if (!this.selectedFile) {
      this.showMessage(
        this.translate.instant('transactions.selectFile'),
        false
      );
      return;
    }

    this.isImporting = true;

    this.apiService.importTransactions(this.selectedFile).subscribe({
      next: (response: any) => {
        this.isImporting = false;
        if (response.success) {
          this.showMessage(
            this.translate.instant('transactions.importSuccess', {
              count: response.data?.importedCount || 0,
            }),
            true
          );
          this.selectedFile = null;
          const fileInput = document.getElementById(
            'excelFile'
          ) as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          this.loadTransactions();
          this.loadFilterOptions();
        }
      },
      error: (error) => {
        this.isImporting = false;
        this.showMessage(
          error.error?.message || 'Failed to import Excel file',
          false
        );
      },
    });
  }

  onFilterChange(): void {
    this.loadTransactions();
  }

  resetFilters(): void {
    this.initializeDates();
    this.filterPromoCode = '';
    this.filterChannel = '';
    this.filterUsername = '';
    this.filterBooking = '';
    this.selectedAdminId = null;
    this.filterAgentsByAdmin();
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
    const agentName =
      data.items && data.items[0]
        ? data.items[0].agent_name || 'Unknown'
        : 'Unknown';
    const promoCode = data.key;
    const total =
      data.aggregates && data.aggregates[0] ? data.aggregates[0] : 0;
    return `${agentName} - ${promoCode} - Total: ${this.formatCurrency(
      total
    )} XAF`;
  };

  formatCurrency(value: number): string {
    return value.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private showMessage(msg: string, success: boolean): void {
    this.message = msg;
    this.isSuccess = success;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  getAgentGroupTitle(cellInfo: any) {
    console.log('Cell Info:', cellInfo);
    let groupItems;
    if (cellInfo.data.items) {
      let lessthanFiveHundredDepositCount = 0;
      let morethanFiveHundredDepositCount = 0;
      let morethanOneThousandDepositCount = 0;
      for (const client of cellInfo.data.items) {
        let clientTransactions;
        if (client.items) {
          clientTransactions = client.items;
        } else if (client.collapsedItems) {
          clientTransactions = client.collapsedItems;
        }
        for (const transaction of clientTransactions) {
          if (transaction.amount < 500) {
            lessthanFiveHundredDepositCount += 1;
          } else if (transaction.amount >= 500 && transaction.amount < 1000) {
            morethanFiveHundredDepositCount += 1;
          } else if (transaction.amount >= 1000) {
            morethanOneThousandDepositCount += 1;
          }
        }
      }
      if (cellInfo.data.items[0].items) {
        groupItems = cellInfo.data.items[0].items;

      } else {
        groupItems = cellInfo.data.items[0].collapsedItems;

      }
      if (groupItems.length > 0) {
        const agentName = groupItems[0].agent_name || 'No Agent';
        const promoCode = groupItems[0].promo_code || 'No Promo Code';
        return `${this.translate.instant(
          'transactions.table.agentName'
        )}: ${agentName} | ${promoCode} | ${this.translate.instant(
          'transactions.table.lessThan500Deposits'
        )}: ${lessthanFiveHundredDepositCount} | ${this.translate.instant(
          'transactions.table.between500And1000Deposits'
        )}: ${morethanFiveHundredDepositCount} | ${this.translate.instant(
          'transactions.table.moreThan1000Deposits'
        )}: ${morethanOneThousandDepositCount}`;
      }
    } else if (cellInfo.data.collapsedItems) {
      let lessthanFiveHundredDepositCount = 0;
      let morethanFiveHundredDepositCount = 0;
      let morethanOneThousandDepositCount = 0;

      for (const client of cellInfo.data.collapsedItems) {
        let clientTransactions;
        if (client.items) {
          clientTransactions = client.items;
        } else if (client.collapsedItems) {
          clientTransactions = client.collapsedItems;
        }
        for (const transaction of clientTransactions) {
          if (transaction.amount < 500) {
            lessthanFiveHundredDepositCount += 1;
          } else if (transaction.amount >= 500 && transaction.amount < 1000) {
            morethanFiveHundredDepositCount += 1;
          } else if (transaction.amount >= 1000) {
            morethanOneThousandDepositCount += 1;
          }
        }
      }
      if (cellInfo.data.collapsedItems[0].items) {
        groupItems = cellInfo.data.collapsedItems[0].items;
      } else {
        groupItems = cellInfo.data.collapsedItems[0].collapsedItems;
      }
      if (groupItems.length > 0) {
        const agentName = groupItems[0].agent_name || 'No Agent';
        const promoCode = groupItems[0].promo_code || 'No Promo Code';
        return `${this.translate.instant(
          'transactions.table.agentName'
        )}: ${agentName} | ${promoCode} | ${this.translate.instant(
          'transactions.table.lessThan500Deposits'
        )}: ${lessthanFiveHundredDepositCount} | ${this.translate.instant(
          'transactions.table.between500And1000Deposits'
        )}: ${morethanFiveHundredDepositCount} | ${this.translate.instant(
          'transactions.table.moreThan1000Deposits'
        )}: ${morethanOneThousandDepositCount}`;
      }
    }

    return cellInfo.key || '';
  }

  // getAgentGroupTitle(cellInfo: any) {
  //   let groupItems;

  //   if (cellInfo.data.items) {
  //     let lessthanFiveHundredDepositCount = 0;
  //     let morethanFiveHundredDepositCount = 0;
  //     let morethanOneThousandDepositCount = 0;
  //     for (const client of cellInfo.data.items) {
  //       let clientTransactions;
  //       if (client.items) {
  //         clientTransactions = client.items;
  //       } else if (client.collapsedItems) {
  //         clientTransactions = client.collapsedItems;
  //       }
  //       if (clientTransactions) {
  //         for (const transaction of clientTransactions) {
  //           const amount = Number(transaction.amount); // Convert to number
  //           if (amount < 500) {
  //             lessthanFiveHundredDepositCount += 1;
  //           } else if (amount >= 500 && amount < 1000) {
  //             morethanFiveHundredDepositCount += 1;
  //           } else if (amount >= 1000) {
  //             morethanOneThousandDepositCount += 1;
  //           }
  //         }
  //       }
  //     }
  //     if (cellInfo.data.items[0].items) {
  //       groupItems = cellInfo.data.items[0].items;
  //       console.log('Group items0:', cellInfo.data.items);
  //     } else {
  //       groupItems = cellInfo.data.items[0].collapsedItems;
  //       console.log('Group items0:', cellInfo.data.items);
  //     }
  //     if (groupItems && groupItems.length > 0) {
  //       const agentName = groupItems[0].agent_name || 'No Agent';
  //       const promoCode = groupItems[0].promo_code || 'No Promo Code';
  //       return `${this.translate.instant('transactions.table.agentName')}: ${agentName} | ${promoCode} | ${this.translate.instant('transactions.table.lessThan500Deposits')}: ${lessthanFiveHundredDepositCount} | ${this.translate.instant('transactions.table.between500And1000Deposits')}: ${morethanFiveHundredDepositCount} | ${this.translate.instant('transactions.table.moreThan1000Deposits')}: ${morethanOneThousandDepositCount}`;
  //     }
  //   } else if (cellInfo.data.collapsedItems) {
  //     let lessthanFiveHundredDepositCount = 0;
  //     let morethanFiveHundredDepositCount = 0;
  //     let morethanOneThousandDepositCount = 0;
  //     console.log('Group items0collapsed:', cellInfo.data.collapsedItems);
  //     for (const client of cellInfo.data.collapsedItems) {
  //       let clientTransactions;
  //       if (client.items) {
  //         clientTransactions = client.items;
  //       } else if (client.collapsedItems) {
  //         clientTransactions = client.collapsedItems;
  //       }
  //       if (clientTransactions) {
  //         for (const transaction of clientTransactions) {
  //           const amount = Number(transaction.amount); // Convert to number
  //           if (amount < 500) {
  //             lessthanFiveHundredDepositCount += 1;
  //           } else if (amount >= 500 && amount < 1000) {
  //             morethanFiveHundredDepositCount += 1;
  //           } else if (amount >= 1000) {
  //             morethanOneThousandDepositCount += 1;
  //           }
  //         }
  //       }
  //     }
  //     if (cellInfo.data.collapsedItems[0].items) {
  //       groupItems = cellInfo.data.collapsedItems[0].items;
  //       console.log('Group itemscollapsed:', cellInfo.data.collapsedItems);
  //     } else {
  //       groupItems = cellInfo.data.collapsedItems[0].collapsedItems;
  //       console.log('Group itemscollapsed:', cellInfo.data.collapsedItems);
  //     }
  //     if (groupItems && groupItems.length > 0) {
  //       const agentName = groupItems[0].agent_name || 'No Agent';
  //       const promoCode = groupItems[0].promo_code || 'No Promo Code';
  //       return `${this.translate.instant('transactions.table.agentName')}: ${agentName} | ${promoCode} | ${this.translate.instant('transactions.table.lessThan500Deposits')}: ${lessthanFiveHundredDepositCount} | ${this.translate.instant('transactions.table.between500And1000Deposits')}: ${morethanFiveHundredDepositCount} | ${this.translate.instant('transactions.table.moreThan1000Deposits')}: ${morethanOneThousandDepositCount}`;
  //     }
  //   }

  //   return cellInfo.key || '';
  // }

  getUsernameGroupTitle(cellInfo: any) {
    const items = cellInfo.data.collapsedItems || cellInfo.data.items || [];
    if (items.length > 0) {
      const username = items[0].username || 'Unknown User';
      const promoCode = items[0].promo_code || 'No Promo Code';

      let latestBalance = items[0].balance;

      return `${this.translate.instant(
        'transactions.table.username'
      )}: ${username} | ${promoCode} |  ${this.formatCurrency(
        latestBalance
      )} XAF`;
    }
    return cellInfo.key || '';
  }

  getFileName() {
    let startdate = this.formatDateForFileExport(new Date(this.startDate));
    let enddate = this.formatDateForFileExport(new Date(this.endDate));
    return `Transactions_${startdate}_${enddate}.xlsx`;
  }
}
