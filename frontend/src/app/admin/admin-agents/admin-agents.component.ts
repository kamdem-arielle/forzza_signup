import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService, AdminUser, Signup } from '../../services/api.service';
import { CoreService } from '../../services/core.service';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Agent {
  id: number;
  name: string;
  username: string;
  promo_code: string;
  phone?: string;
  email?: string;
  city?: string;
  qr_code?: string;
  agent_url?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  last_login?: string;
  registration_count?: number;
  admin_id?: number;
  admin_name?: string;
}

interface CreatedAgent {
  id: number;
  promo_code: string;
  agent_url: string;
  qr_code: string;
  name: string;
  phone: string;
  city: string;
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
  @ViewChild('createAgentModal') createAgentModal!: TemplateRef<any>;
  @ViewChild('successModal') successModal!: TemplateRef<any>;
  isBulkSuccess = false;

  agents: Agent[] = [];
  allAgents: Agent[] = []; // Store all agents for filtering
  isLoading = true;
  isCreating = false;
  message = '';
  isSuccess = false;
  isSuperAdmin = false;
  
  // Admin filter for superadmin
  admins: AdminUser[] = [];
  selectedAdminId: number | null = null;
  selectedAdminLabel: string = 'Global';

  // Signups for registration change calculation
  approvedSignups: Signup[] = [];

  // Create Agent Form (Reactive Form)
  createAgentForm!: FormGroup;

  // Created agent for success modal
  createdAgent: CreatedAgent | null = null;
  private modalRef: NgbModalRef | null = null;

  // Tab control for create modal
  activeTab: 'single' | 'bulk' = 'single';

  // Bulk upload properties
  selectedFile: File | null = null;
  isDragOver = false;
  bulkUploadError = '';
  bulkAdminId: number | null = null; // Admin ID for bulk template
  bulkResults: {
    successful: Array<{ row: number; data: any }>;
    failed: Array<{ row: number; data: any; error: string }>;
    summary: { total: number; successful: number; failed: number };
  } | null = null;
  showSuccessfulList = false;
  bulkResultsDataSource: any[] = [];

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
    private modalService: NgbModal,
    private fb: FormBuilder,
    public coreService: CoreService 
  ) {
    this.initCreateAgentForm();
  }

  // Cameroon phone validator: must start with 6 and have 9 digits total (or with +237/237 prefix)
  cameroonPhoneValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    // Remove spaces and dashes
    const phone = control.value.replace(/[\s-]/g, '');
    
    // Valid formats:
    // 6XXXXXXXX (9 digits starting with 6)
    // +2376XXXXXXXX (12 digits with +237 prefix)
    // 2376XXXXXXXX (11 digits with 237 prefix)
    const patterns = [
      /^6[0-9]{8}$/,                    // 6XXXXXXXX
      /^\+237[0-9]{9}$/,                // +237XXXXXXXXX
      /^237[0-9]{9}$/                   // 237XXXXXXXXX
    ];
    
    const isValid = patterns.some(pattern => pattern.test(phone));
    return isValid ? null : { invalidCameroonPhone: true };
  }

  initCreateAgentForm(): void {
    this.createAgentForm = this.fb.group({
      surname: ['', [Validators.required, Validators.minLength(2)]],
      lastname: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, this.cameroonPhoneValidator.bind(this)]],
      city: ['', [Validators.required]],
      email: ['', [Validators.email]],
      admin_id: [null]
    });
  }

  // Update form validators based on user role
  updateFormValidators() {
    const adminIdControl = this.createAgentForm.get('admin_id');
    if (this.isSuperAdmin) {
      adminIdControl?.setValidators([Validators.required]);
    } else {
      adminIdControl?.clearValidators();
    }
    adminIdControl?.updateValueAndValidity();
  }

  // Helper to check if a field has error
  hasError(fieldName: string, errorType: string): boolean {
    const control = this.createAgentForm.get(fieldName);
    return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
  }

  // Check if field is invalid
  isFieldInvalid(fieldName: string): boolean {
    const control = this.createAgentForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  ngOnInit(): void {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      this.router.navigate(['/admin/login']);
      return;
    }
    
    const adminData = JSON.parse(admin);
    this.isSuperAdmin = adminData.role === 'superadmin';
    
    // Update form validators based on role
    this.updateFormValidators();
    
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

  loadApprovedSignups(){
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

  // Open Create Agent Modal
  openCreateAgentModal(): void {
    this.createAgentForm.reset();
    this.updateFormValidators();
    this.activeTab = 'single';
    this.selectedFile = null;
    this.bulkUploadError = '';
    this.bulkAdminId = null;
    this.modalRef = this.modalService.open(this.createAgentModal, { 
      centered: true, 
      size: 'md',
      backdrop: 'static'
    });
  }

  // Switch tab in create modal
  switchTab(tab: 'single' | 'bulk'): void {
    this.activeTab = tab;
    this.bulkUploadError = '';
  }

  // Reset form
  resetAgentForm(): void {
    this.createAgentForm.reset();
  }

  // Close modal
  closeModal(): void {
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }
  }

  // Download Excel template for bulk upload
  downloadTemplate(): void {
    // Get admin ID - for regular admin use their ID, for superadmin use selected ID
    let adminId: number | null;
    if (this.isSuperAdmin) {
      if (!this.bulkAdminId) {
        this.bulkUploadError = this.translate.instant('adminAgents.bulkUpload.selectAdminFirst');
        return;
      }
      adminId = this.bulkAdminId;
    } else {
      const admin = localStorage.getItem('admin');
      adminId = admin ? JSON.parse(admin).id : null;
    }

    // Create template data with headers and sample rows
    const templateData = [
      ['Surname', 'Lastname', 'Phone', 'City', 'Adminid'],
      ['Doe', 'John', '691234567', 'Douala', adminId],
      ['Smith', 'Jane', '677654321', 'Yaoundé', adminId]
    ];

    // Create workbook and worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Surname
      { wch: 15 }, // Lastname
      { wch: 15 }, // Phone
      { wch: 15 }, // City
      { wch: 10 }  // Adminid
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agents');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Download file
    saveAs(blob, 'agents_template.xlsx');
  }

  // Create Agent
  createAgent(): void {
    // Mark all fields as touched to show validation errors
    this.createAgentForm.markAllAsTouched();

    if (this.createAgentForm.invalid) {
      return;
    }

    this.isCreating = true;

    const formValue = this.createAgentForm.value;
    const payload = {
      surname: formValue.surname,
      lastname: formValue.lastname,
      phone: formValue.phone,
      city: formValue.city,
      email: formValue.email || undefined,
      admin_id: this.isSuperAdmin ? formValue.admin_id : undefined
    };

    this.apiService.createAgent(payload).subscribe({
      next: (response) => {
        this.isCreating = false;
        if (response.success && response.data) {
          this.createdAgent = response.data;
          this.closeModal();
          // Open success modal (single mode)
          this.isBulkSuccess = false;
          this.bulkResults = null;
          this.modalRef = this.modalService.open(this.successModal, { 
            centered: true, 
            size: 'lg',
            backdrop: 'static'
          });
          // Reload agents list
          this.loadAgents();
        } else {
          this.showMessage(response.message || 'Failed to create agent', false);
        }
      },
      error: (error) => {
        this.isCreating = false;
        this.showMessage(error.error?.message || 'Failed to create agent', false);
      }
    });
  }

  // Copy to clipboard
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showMessage(this.translate.instant('adminAgents.successModal.copied'), true);
    }).catch(() => {
      this.showMessage('Failed to copy', false);
    });
  }

  // Download QR Code as PDF (simplified version without all details)
  downloadQRCode(agent: CreatedAgent | Agent): void {
    if (!agent.qr_code) {
      this.showMessage('No QR code available', false);
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 78, 146); // Blue color
    doc.text('Agent QR Code', pageWidth / 2, 30, { align: 'center' });
    
    // QR Code image - large and centered
    const qrCodeData = agent.qr_code;
    const qrSize = 120;
    const qrX = (pageWidth - qrSize) / 2;
    doc.addImage(qrCodeData, 'PNG', qrX, 50, qrSize, qrSize);
    
    // Agent name
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(agent.name?.toUpperCase() || 'AGENT', pageWidth / 2, 190, { align: 'center' });
    
    // Promo code
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 78, 146);
    doc.text(`Promo Code: ${agent.promo_code}`, pageWidth / 2, 205, { align: 'center' });
    
    // Save
    doc.save(`${agent.promo_code}_qrcode.pdf`);
  }

  // Download Agent Details as PDF (format matching attached image)
  downloadDetails(agent: CreatedAgent | Agent): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 78, 146); // Blue color
    doc.text('Agent QR Code', pageWidth / 2, 30, { align: 'center' });
    
    // QR Code image - large and centered
    if (agent.qr_code) {
      const qrSize = 120;
      const qrX = (pageWidth - qrSize) / 2;
      doc.addImage(agent.qr_code, 'PNG', qrX, 45, qrSize, qrSize);
    }
    
    let yPos = 180;
    
    // Agent name
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(agent.name?.toUpperCase() || 'AGENT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    
    // Phone
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Phone: ${agent.phone || '-'}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    
    // Promo code
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 78, 146);
    doc.text(`Promo Code: ${agent.promo_code}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    
    // URL
    const agentUrl = agent.agent_url || `https://forzza.laureal.io/register?promo_code=${agent.promo_code}`;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 78, 146);
    doc.text(`URL: ${agentUrl}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    
    // City/Quarter
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Quarter: ${agent.city || '-'}`, pageWidth / 2, yPos, { align: 'center' });
    
    // Save
    doc.save(`${agent.promo_code}_details.pdf`);
  }

  // Download all (QR + Details)
  downloadAll(): void {
    if (this.createdAgent) {
      this.downloadQRCode(this.createdAgent);
      setTimeout(() => {
        if (this.createdAgent) {
          this.downloadDetails(this.createdAgent);
        }
      }, 500);
    }
  }

  // Bulk upload file handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0]);
    }
  }

  handleFileSelection(file: File): void {
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      this.bulkUploadError = this.translate.instant('adminAgents.bulkUpload.invalidFileType');
      this.selectedFile = null;
      return;
    }
    
    this.selectedFile = file;
    this.bulkUploadError = '';
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.bulkUploadError = '';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Bulk create agents
  bulkCreateAgents(): void {
    if (!this.selectedFile) {
      this.bulkUploadError = this.translate.instant('adminAgents.bulkUpload.noFileSelected');
      return;
    }

    this.isCreating = true;
    this.bulkUploadError = '';

    this.apiService.bulkCreateAgents(this.selectedFile).subscribe({
      next: (response) => {
        this.isCreating = false;
        if (response.data) {
          this.bulkResults = response.data;
          this.closeModal();
          // Open success modal with bulk mode
          this.isBulkSuccess = true;
          this.createdAgent = null;
         this.bulkResultsDataSource = this.bulkResults.successful.map(item => item.data);
          this.modalRef = this.modalService.open(this.successModal, { 
            centered: true, 
            size: 'lg',
            backdrop: 'static'
          });
          // Reload agents list
          this.loadAgents();
        }
      },
      error: (error) => {
        this.isCreating = false;
        this.bulkUploadError = error.error?.message || this.translate.instant('adminAgents.bulkUpload.uploadError');
      }
    });
  }

  // Toggle successful list visibility
  toggleSuccessfulList(): void {
    this.showSuccessfulList = !this.showSuccessfulList;
  }

  // // Get bulk results data source for DevExtreme grid
  // get bulkResultsDataSource(): any[] {
  //   if (!this.bulkResults?.successful) return [];
  //   return this.bulkResults.successful.map(item => item.data);
  // }

  // Download all bulk created agents
  downloadAllBulk(): void {
    if (!this.bulkResults?.successful?.length) return;
    
    let index = 0;
    const downloadNext = () => {
      if (index < this.bulkResults!.successful.length) {
        const agent = this.bulkResults!.successful[index].data;
        this.downloadDetails(agent);
        index++;
        setTimeout(downloadNext, 300);
      }
    };
    downloadNext();
  }

  private showMessage(msg: string, success: boolean): void {
    this.message = msg;
    this.isSuccess = success;
    setTimeout(() => {
      this.message = '';
    }, 4000);
  }
}
