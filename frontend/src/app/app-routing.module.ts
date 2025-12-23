import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminLayoutComponent } from './admin/admin-layout/admin-layout.component';
import { AdminStatisticsComponent } from './admin/admin-statistics/admin-statistics.component';
import { AdminSignupsComponent } from './admin/admin-signups/admin-signups.component';
import { AdminAgentsComponent } from './admin/admin-agents/admin-agents.component';
import { AgentLoginComponent } from './agent-login/agent-login.component';
import { AgentDashboardComponent } from './agent-dashboard/agent-dashboard.component';

const routes: Routes = [
  { path: '', redirectTo: '/register', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent },
  
  // Admin routes
  { path: 'admin/login', component: AdminLoginComponent },
  { 
    path: 'admin', 
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminStatisticsComponent },
      { path: 'signups', component: AdminSignupsComponent },
      { path: 'agents', component: AdminAgentsComponent }
    ]
  },
  
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
