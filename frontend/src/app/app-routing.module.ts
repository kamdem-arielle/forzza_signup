import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AgentLoginComponent } from './agent-login/agent-login.component';
import { AgentDashboardComponent } from './agent-dashboard/agent-dashboard.component';

const routes: Routes = [
  { path: '', redirectTo: '/register', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent },
  
  // Admin routes
  { path: 'admin/login', component: AdminLoginComponent },
  { path: 'admin/dashboard', component: AdminDashboardComponent },
  { path: 'admin', redirectTo: '/admin/dashboard', pathMatch: 'full' },
  
  // Agent routes
  { path: 'agent/login', component: AgentLoginComponent },
  { path: 'agent/dashboard', component: AgentDashboardComponent },
  { path: 'agent', redirectTo: '/agent/dashboard', pathMatch: 'full' },

  // Fallback
  { path: '**', redirectTo: '/register' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
