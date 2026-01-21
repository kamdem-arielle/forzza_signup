import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService, AdminUser, Signup } from '../../services/api.service';
import { CoreService } from '../../services/core.service';
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
  admin_id?: number;
  admin_name?: string;
}

interface AgentStats {
  totalAgents: number;
  totalRegistrations: number;
  activeAgents: number;
  inactiveAgents: number;
  agentChangePercent: number;
  registrationChangePercent: number;
  operatingRate: number;
}

@Component({
  selector: 'app-admin-agents',
  templateUrl: './admin-agents.component.html',
  styleUrls: ['./admin-agents.component.css']
})
export class AdminAgentsComponent implements OnInit {
  agents: Agent[] = [];
  allAgents: Agent[] = []; // Store all agents for filtering
  isLoading = true;
  message = '';
  isSuccess = false;
  isSuperAdmin = false;
  
  // Admin filter for superadmin
  admins: AdminUser[] = [];
  selectedAdminId: number | null = null;
  selectedAdminLabel: string = 'Global';

  // Signups for registration change calculation
  approvedSignups: Signup[] = [];

  // Status filter data for header filter
  statusFilterData = [
    { text: 'Active', value: 'active' },
    { text: 'Inactive', value: 'inactive' }
  ];

  // Statistics for cards
  stats: AgentStats = {
    totalAgents: 0,
    totalRegistrations: 0,
    activeAgents: 0,
    inactiveAgents: 0,
    agentChangePercent: 0,
    registrationChangePercent: 0,
    operatingRate: 0
  };

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
    
    const adminData = JSON.parse(admin);
    this.isSuperAdmin = adminData.role === 'superadmin';
    
    if (this.isSuperAdmin) {
      this.loadAdmins();
    }
    this.loadAgents();
    this.updateStatusFilterTranslations();
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
          this.allAgents = response.data;
          this.applyAdminFilter();
          this.loadApprovedSignups();
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.showMessage(error.error?.message || 'Failed to load agents', false);
      }
    });
  }

  onAdminFilterChange(): void {
    // Update the selected admin label
    if (this.selectedAdminId !== null && this.selectedAdminId !== undefined) {
      const selectedAdmin = this.admins.find(a => a.id === this.selectedAdminId);
      this.selectedAdminLabel = selectedAdmin?.username || 'Global';
    } else {
      this.selectedAdminLabel = 'Global';
    }
    
    this.applyAdminFilter();
    this.loadApprovedSignups();
  }

  loadApprovedSignups(): void {
    this.apiService.getSignupsByStatus('APPROVED', this.selectedAdminId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.approvedSignups = response.data;
          this.calculateRegistrationChange();
        }
      },
      error: () => {
        this.approvedSignups = [];
        this.calculateRegistrationChange();
      }
    });
  }

  applyAdminFilter(): void {
    if (this.selectedAdminId !== null && this.selectedAdminId !== undefined) {
      // Use == for comparison to handle string/number type differences
      this.agents = this.allAgents.filter(agent => agent.admin_id == this.selectedAdminId);
    } else {
      this.agents = [...this.allAgents];
    }
    this.calculateStats();
  }

  calculateStats(): void {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total agents
    this.stats.totalAgents = this.agents.length;

    // Active and inactive agents
    this.stats.activeAgents = this.agents.filter(a => a.status === 'active').length;
    this.stats.inactiveAgents = this.agents.filter(a => a.status === 'inactive').length;

    // Total registrations (sum of all registration_count)
    this.stats.totalRegistrations = this.agents.reduce((sum, a) => sum + (a.registration_count || 0), 0);

    // Calculate agent change percent from last month
    const agentsCreatedThisMonth = this.agents.filter(a => {
      if (!a.created_at) return false;
      const createdDate = new Date(a.created_at);
      return createdDate >= startOfThisMonth;
    }).length;

    const agentsCreatedLastMonth = this.agents.filter(a => {
      if (!a.created_at) return false;
      const createdDate = new Date(a.created_at);
      return createdDate >= startOfLastMonth && createdDate <= endOfLastMonth;
    }).length;

    if (agentsCreatedLastMonth > 0) {
      this.stats.agentChangePercent = Math.round(((agentsCreatedThisMonth - agentsCreatedLastMonth) / agentsCreatedLastMonth) * 100);
    } else if (agentsCreatedThisMonth > 0) {
      this.stats.agentChangePercent = 100; // 100% increase if no agents last month but some this month
    } else {
      this.stats.agentChangePercent = 0;
    }

    // Operating rate: percentage of active agents who have at least 1 registration
    // This shows how productive the active agents are
    if (this.stats.activeAgents > 0) {
      const activeAgentsWithRegistrations = this.agents.filter(
        a => a.status === 'active' && (a.registration_count || 0) > 0
      ).length;
      this.stats.operatingRate = Math.round((activeAgentsWithRegistrations / this.stats.activeAgents) * 100);
    } else {
      this.stats.operatingRate = 0;
    }
  }

  calculateRegistrationChange(): void {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Count signups approved this month
    const signupsThisMonth = this.approvedSignups.filter(s => {
      if (!s.approved_at && !s.created_at) return false;
      const signupDate = new Date(s.approved_at || s.created_at || '');
      return signupDate >= startOfThisMonth;
    }).length;

    // Count signups approved last month
    const signupsLastMonth = this.approvedSignups.filter(s => {
      if (!s.approved_at && !s.created_at) return false;
      const signupDate = new Date(s.approved_at || s.created_at || '');
      return signupDate >= startOfLastMonth && signupDate <= endOfLastMonth;
    }).length;

    if (signupsLastMonth > 0) {
      this.stats.registrationChangePercent = Math.round(((signupsThisMonth - signupsLastMonth) / signupsLastMonth) * 100);
    } else if (signupsThisMonth > 0) {
      this.stats.registrationChangePercent = 100;
    } else {
      this.stats.registrationChangePercent = 0;
    }
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
