import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Signup {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  phone: string;
  password?: string;
  promo_code?: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'ARCHIVED';
  created_at?: string;
  approved_at?: string;
}

export interface AgentStats {
  total_signups: number;
  pending_signups: number;
  approved_signups: number;
  archived_signups: number;
  approval_rate: number;
  last_signup_at?: string;
}

export interface AgentTransactionStats {
  total_transactions: number;
  total_amount: number;
}

export interface AgentTransaction {
  id: number;
  transaction_datetime: string;
  channel: string;
  username: string;
  booking: string;
  amount: number;
  balance: number;
  created_at: string;
  signup_username: string;
  signup_phone: string;
}

export interface AdminUser {
  id: number;
  username: string;
  role: 'admin' | 'superadmin';
  created_at?: string;
  name?: string;
  email?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.API_BASE_URL;

  constructor(private http: HttpClient) {}

  /**
   * Get the currently logged in admin from localStorage
   */
  getLoggedInAdmin(): AdminUser | null {
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      return JSON.parse(adminData);
    }
    return null;
  }

  /**
   * Check if current user is a superadmin
   */
  isSuperAdmin(): boolean {
    const admin = this.getLoggedInAdmin();
    return admin?.role === 'superadmin';
  }

  /**
   * Get the admin ID for filtering data
   */
  getAdminId(): number | null {
    const admin = this.getLoggedInAdmin();
    return admin?.id || null;
  }

  createSignup(payload: { firstName: string; lastName: string; phone: string; password: string; promo_code?: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/api/signups`, payload);
  }

  // Admin endpoints
  adminLogin(payload: { username: string; password: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/api/admin/login`, payload);
  }

  // SuperAdmin endpoints
  superAdminLogin(payload: { username: string; password: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/api/superadmin/login`, payload);
  }

  /**
   * Get signups by status - uses admin-specific endpoint for admins, global for superadmins
   */
  getSignupsByStatus(status: 'PENDING' | 'APPROVED' | 'ARCHIVED'): Observable<ApiResponse<Signup[]>> {
    const admin = this.getLoggedInAdmin();
    if (admin && admin.role === 'admin') {
      return this.http.get<ApiResponse<Signup[]>>(`${this.baseUrl}/api/signups/admin/${admin.id}/status/${status}`);
    }
    // SuperAdmin or fallback - get all
    return this.http.get<ApiResponse<Signup[]>>(`${this.baseUrl}/api/signups/status/${status}`);
  }

  /**
   * Get all signups for a specific admin
   */
  getSignupsByAdminId(adminId: number): Observable<ApiResponse<Signup[]>> {
    return this.http.get<ApiResponse<Signup[]>>(`${this.baseUrl}/api/signups/admin/${adminId}`);
  }

  getSignupById(id: number): Observable<ApiResponse<Signup>> {
    return this.http.get<ApiResponse<Signup>>(`${this.baseUrl}/api/signups/${id}`);
  }

  approveSignup(id: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/api/signups/${id}/status`, { status: 'APPROVED' });
  }

  archiveSignup(id: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/api/signups/${id}/status`, { status: 'ARCHIVED' });
  }

  updateSignupNotes(id: number, notes: string): Observable<ApiResponse<Signup>> {
    return this.http.patch<ApiResponse<Signup>>(`${this.baseUrl}/api/signups/${id}/notes`, { notes });
  }

  // Agent endpoints
  agentLogin(payload: { username: string; password: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/api/agents/login`, payload);
  }

  getAgentSignups(promo_code: string): Observable<ApiResponse<Signup[]>> {
    return this.http.get<ApiResponse<Signup[]>>(`${this.baseUrl}/api/agents/${promo_code}/signups`);
  }

  getAgentSignupsByStatus(promo_code: string, status: 'PENDING' | 'APPROVED' | 'ARCHIVED'): Observable<ApiResponse<Signup[]>> {
    return this.http.get<ApiResponse<Signup[]>>(`${this.baseUrl}/api/agents/${promo_code}/signups/status/${status}`);
  }

  getAgentStats(promo_code: string): Observable<ApiResponse<AgentStats>> {
    return this.http.get<ApiResponse<AgentStats>>(`${this.baseUrl}/api/agents/${promo_code}/stats`);
  }

  getAgentTransactions(promo_code: string, filters: { startDate?: string; endDate?: string } = {}): Observable<ApiResponse<AgentTransaction[]>> {
    let params: any = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    return this.http.get<ApiResponse<AgentTransaction[]>>(`${this.baseUrl}/api/agents/${promo_code}/transactions`, { params });
  }

  getAgentTransactionStats(promo_code: string): Observable<ApiResponse<AgentTransactionStats>> {
    return this.http.get<ApiResponse<AgentTransactionStats>>(`${this.baseUrl}/api/agents/${promo_code}/transactions/stats`);
  }

  /**
   * Get all signups - uses admin-specific endpoint for admins, global for superadmins
   */
  getSignups(): Observable<ApiResponse<Signup[]>> {
    const admin = this.getLoggedInAdmin();
    if (admin && admin.role === 'admin') {
      return this.http.get<ApiResponse<Signup[]>>(`${this.baseUrl}/api/signups/admin/${admin.id}`);
    }
    // SuperAdmin or fallback - get all
    return this.http.get<ApiResponse<Signup[]>>(`${this.baseUrl}/api/signups`);
  }

  /**
   * Get all agents - uses admin-specific endpoint for admins, global for superadmins
   */
  getAllAgents(): Observable<ApiResponse<any[]>> {
    const admin = this.getLoggedInAdmin();
    if (admin && admin.role === 'admin') {
      return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/api/agents/admin/${admin.id}`);
    }
    // SuperAdmin or fallback - get all
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/api/agents`);
  }

  /**
   * Get agents by admin ID (for superadmin viewing specific admin's agents)
   */
  getAgentsByAdminId(adminId: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/api/agents/admin/${adminId}`);
  }

  // Admin - Update agent
  updateAgent(id: number, data: { status?: string; name?: string; phone?: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/api/agents/${id}`, data);
  }

  /**
   * Create agent - includes admin_id for the creating admin
   */
  createAgent(data: { username: string; password: string; promo_code: string; name?: string; phone?: string; email?: string }): Observable<ApiResponse> {
    const admin = this.getLoggedInAdmin();
    const payload = { ...data, admin_id: admin?.id };
    return this.http.post<ApiResponse>(`${this.baseUrl}/api/agents`, payload);
  }

  // Transaction endpoints
  importTransactions(excelFile: File): Observable<ApiResponse> {
    const formData = new FormData();
    formData.append('excelFile', excelFile);
    return this.http.post<ApiResponse>(`${this.baseUrl}/api/transactions/import`, formData);
  }

  /**
   * Get transactions - uses admin-specific endpoint for admins, global for superadmins
   */
  getTransactions(filters: { startDate?: string; endDate?: string; promoCode?: string; channel?: string; username?: string; booking?: string }): Observable<ApiResponse> {
    let params: any = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.promoCode) params.promoCode = filters.promoCode;
    if (filters.channel) params.channel = filters.channel;
    if (filters.username) params.username = filters.username;
    if (filters.booking) params.booking = filters.booking;

    const admin = this.getLoggedInAdmin();
    if (admin && admin.role === 'admin') {
      return this.http.get<ApiResponse>(`${this.baseUrl}/api/transactions/admin/${admin.id}`, { params });
    }
    // SuperAdmin or fallback - get all
    return this.http.get<ApiResponse>(`${this.baseUrl}/api/transactions`, { params });
  }

  /**
   * Get transactions by admin ID (for superadmin viewing specific admin's transactions)
   */
  getTransactionsByAdminId(adminId: number, filters: { startDate?: string; endDate?: string; promoCode?: string; channel?: string; username?: string; booking?: string } = {}): Observable<ApiResponse> {
    let params: any = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.promoCode) params.promoCode = filters.promoCode;
    if (filters.channel) params.channel = filters.channel;
    if (filters.username) params.username = filters.username;
    if (filters.booking) params.booking = filters.booking;
    return this.http.get<ApiResponse>(`${this.baseUrl}/api/transactions/admin/${adminId}`, { params });
  }

  /**
   * Get filter options - uses admin-specific endpoint for admins, global for superadmins
   */
  getTransactionFilterOptions(): Observable<ApiResponse> {
    const admin = this.getLoggedInAdmin();
    if (admin && admin.role === 'admin') {
      return this.http.get<ApiResponse>(`${this.baseUrl}/api/transactions/admin/${admin.id}/filter-options`);
    }
    // SuperAdmin or fallback - get all
    return this.http.get<ApiResponse>(`${this.baseUrl}/api/transactions/filter-options`);
  }

  /**
   * Get transaction stats - uses admin-specific endpoint for admins, global for superadmins
   */
  getTransactionStats(filters: { startDate?: string; endDate?: string }): Observable<ApiResponse> {
    let params: any = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    const admin = this.getLoggedInAdmin();
    if (admin && admin.role === 'admin') {
      return this.http.get<ApiResponse>(`${this.baseUrl}/api/transactions/admin/${admin.id}/stats`, { params });
    }
    // SuperAdmin or fallback - get all
    return this.http.get<ApiResponse>(`${this.baseUrl}/api/transactions/stats`, { params });
  }

  /**
   * Get transaction stats by admin ID (for superadmin viewing specific admin's stats)
   */
  getTransactionStatsByAdminId(adminId: number, filters: { startDate?: string; endDate?: string } = {}): Observable<ApiResponse> {
    let params: any = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    return this.http.get<ApiResponse>(`${this.baseUrl}/api/transactions/admin/${adminId}/stats`, { params });
  }

  deleteTransactionsByDate(date: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/api/transactions/${date}`);
  }
}
