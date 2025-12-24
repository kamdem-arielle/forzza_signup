import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// DevExtreme
import { DxDataGridModule } from 'devextreme-angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RegisterComponent } from './register/register.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminLayoutComponent } from './admin/admin-layout/admin-layout.component';
import { AdminStatisticsComponent } from './admin/admin-statistics/admin-statistics.component';
import { AdminSignupsComponent } from './admin/admin-signups/admin-signups.component';
import { AdminAgentsComponent } from './admin/admin-agents/admin-agents.component';
import { AdminTransactionsComponent } from './admin/admin-transactions/admin-transactions.component';
import { AgentLoginComponent } from './agent-login/agent-login.component';
import { AgentDashboardComponent } from './agent-dashboard/agent-dashboard.component';
import { ApiService } from './services/api.service';
import { AgentLayoutComponent } from './agent-layout/agent-layout.component';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    RegisterComponent,
    AdminLoginComponent,
    AdminDashboardComponent,
    AdminLayoutComponent,
    AdminStatisticsComponent,
    AdminSignupsComponent,
    AdminAgentsComponent,
    AdminTransactionsComponent,
    AgentLoginComponent,
    AgentDashboardComponent,
    AgentLayoutComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    DxDataGridModule,
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
  providers: [ApiService],
  bootstrap: [AppComponent]
})
export class AppModule { }
