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

  createSignup(payload: { firstName: string; lastName: string; phone: string; password: string; promo_code?: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/api/signups`, payload);
  }

  // Admin endpoints
  adminLogin(payload: { username: string; password: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/api/admin/login`, payload);
  }

  getSignupsByStatus(status: 'PENDING' | 'APPROVED' | 'ARCHIVED'): Observable<ApiResponse<Signup[]>> {
    return this.http.get<ApiResponse<Signup[]>>(`${this.baseUrl}/api/signups/status/${status}`);
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

  // Admin - Get all signups
  getSignups(): Observable<ApiResponse<Signup[]>> {
    return this.http.get<ApiResponse<Signup[]>>(`${this.baseUrl}/api/signups`);
  }

  // Admin - Get all agents
  getAllAgents(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/api/agents`);
  }

  // Admin - Update agent
  updateAgent(id: number, data: { status?: string; name?: string; phone?: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/api/agents/${id}`, data);
  }

  // Transaction endpoints
  importTransactions(pdfFile: File, transactionDate: string): Observable<ApiResponse> {
    const formData = new FormData();
    formData.append('pdfFile', pdfFile);
    formData.append('transactionDate', transactionDate);
    return this.http.post<ApiResponse>(`${this.baseUrl}/api/transactions/import`, formData);
  }

  getTransactions(filters: { startDate?: string; endDate?: string; promoCode?: string }): Observable<ApiResponse> {
    let params: any = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.promoCode) params.promoCode = filters.promoCode;
    return this.http.get<ApiResponse>(`${this.baseUrl}/api/transactions`, { params });
  }

  getTransactionStats(filters: { startDate?: string; endDate?: string }): Observable<ApiResponse> {
    let params: any = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    return this.http.get<ApiResponse>(`${this.baseUrl}/api/transactions/stats`, { params });
  }

  deleteTransactionsByDate(date: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/api/transactions/${date}`);
  }
}
