import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private translate: TranslateService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.adminLogin(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          localStorage.setItem('admin', JSON.stringify(response.data));
          this.router.navigate(['/admin']);
        } else {
          this.errorMessage = response.message || this.translate.instant('adminLogin.invalidCredentials');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || this.translate.instant('adminLogin.invalidCredentials');
      }
    });
  }
}
