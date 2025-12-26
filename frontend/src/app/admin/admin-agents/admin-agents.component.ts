import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../services/api.service';

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
  registration_count?: number;
}

@Component({
  selector: 'app-admin-agents',
  templateUrl: './admin-agents.component.html',
  styleUrls: ['./admin-agents.component.css']
})
export class AdminAgentsComponent implements OnInit {
  agents: Agent[] = [];
  isLoading = true;
  message = '';
  isSuccess = false;

  // Status filter data for header filter
  statusFilterData = [
    { text: 'Active', value: 'active' },
    { text: 'Inactive', value: 'inactive' }
  ];

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
    this.loadAgents();
    this.updateStatusFilterTranslations();
  }

  updateStatusFilterTranslations(): void {
    this.statusFilterData = [
      { text: this.translate.instant('adminAgents.active'), value: 'active' },
      { text: this.translate.instant('adminAgents.inactive'), value: 'inactive' }
    ];
  }

  loadAgents(): void {
    this.isLoading = true;
    this.apiService.getAllAgents().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.agents = response.data;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.showMessage(error.error?.message || 'Failed to load agents', false);
      }
    });
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  toggleAgentStatus(agent: Agent): void {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    this.apiService.updateAgent(agent.id, { status: newStatus }).subscribe({
      next: (response) => {
        if (response.success) {
          agent.status = newStatus;
          this.showMessage(
            this.translate.instant(newStatus === 'active' ? 'adminAgents.activated' : 'adminAgents.deactivated'),
            true
          );
        }
      },
      error: (error) => {
        this.showMessage(error.error?.message || 'Failed to update agent', false);
      }
    });
  }

  onToolbarPreparing(e: any): void {
    // Optional: customize toolbar if needed
  }

  private showMessage(msg: string, success: boolean): void {
    this.message = msg;
    this.isSuccess = success;
    setTimeout(() => {
      this.message = '';
    }, 4000);
  }
}
