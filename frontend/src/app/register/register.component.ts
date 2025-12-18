import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api.service';
import { TranslateService } from '@ngx-translate/core';
import { interval, Subject, switchMap, takeUntil, takeWhile, tap } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm: FormGroup;
  message: string = '';
  isSuccess: boolean = false;
  isLoading: boolean = false;
  promoCode: string | null = null;
  

  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  

  isPolling: boolean = false;
  pollingMessage: string = '';
  registeredSignupId: number | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private translate: TranslateService,
    private route: ActivatedRoute
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator() });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.promoCode = params['promo_code'] || null;
    });


    const storedSignupId = localStorage.getItem('pendingSignupId');
    if (storedSignupId) {
      this.registeredSignupId = parseInt(storedSignupId, 10);
      this.isPolling = true;
      this.pollingMessage = this.translate.instant('register.waitingApproval') || 'Waiting for approval...';
      this.message = '';
      this.startPolling(this.registeredSignupId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  passwordMatchValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password');
      const confirmPassword = control.get('confirmPassword');
      
      if (!password || !confirmPassword) {
        return null;
      }
      
      return password.value === confirmPassword.value ? null : { passwordMismatch: true };
    };
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.message = '';

    const payload = { ...this.registerForm.value };
    if (this.promoCode) {
      payload.promo_code = this.promoCode;
    }

    this.apiService.createSignup(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.isSuccess = true;
          this.message = this.translate.instant('register.successMessage');
          this.registerForm.reset();
          

          this.registeredSignupId = response.data.id;
          if (this.registeredSignupId !== null) {
            localStorage.setItem('pendingSignupId', this.registeredSignupId.toString());
            this.isPolling = true;
            this.pollingMessage = this.translate.instant('register.waitingApproval') || 'Waiting for approval...';
            this.message = '';
            this.startPolling(this.registeredSignupId);
          }
        } else {
          this.isSuccess = false;
          this.message = this.translate.instant('register.errorMessage');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.isSuccess = false;
        this.message = error.error?.message || this.translate.instant('register.errorMessage');
      }
    });
  }

  private startPolling(signupId: number): void {
    interval(30000) 
      .pipe(
        switchMap(() => this.apiService.getSignupById(signupId)),
        takeUntil(this.destroy$),
        takeWhile((response) => {
          if (response.success && response.data) {
            return response.data.status !== 'APPROVED';
          }
          return true;
        }, true),
        tap((response) => {
          if (response.success && response.data && response.data.status === 'APPROVED') {

            localStorage.removeItem('pendingSignupId');
            this.isPolling = false;
            this.pollingMessage = '';
            this.isSuccess = true;
            this.message = this.translate.instant('register.approved') || 'Approved! Redirecting...';
            
            setTimeout(() => {
              window.location.href = 'https://forzza.cm';
            }, 1500);
          }
        })
      )
      .subscribe({
        error: (err) => {
          console.error('Polling error:', err);
          this.isPolling = false;
        }
      });
  }
}
