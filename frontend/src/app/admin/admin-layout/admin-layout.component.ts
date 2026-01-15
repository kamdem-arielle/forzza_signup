import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent implements OnInit {
  currentRoute: string = '';
  sidebarCollapsed: boolean = false;
  adminName: string = '';
  adminRole: string = 'admin';
  currentLang = 'en';

  constructor(private router: Router,private translate: TranslateService) {
   const saved = localStorage.getItem('lang');
    this.currentLang = saved || 'en';
    this.translate.use(this.currentLang);
  }

  ngOnInit(): void {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      this.router.navigate(['/admin/login']);
      return;
    }

    const adminData = JSON.parse(admin);
    this.adminName = adminData.username || 'Admin';
    this.adminRole = adminData.role || 'admin';

    // Track current route for active state
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.urlAfterRedirects;
    });

    this.currentRoute = this.router.url;
  }

  switchLanguage(lang: 'en' | 'fr') {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  isActive(route: string): boolean {
    return this.currentRoute.includes(route);
  }

  logout(): void {
    localStorage.removeItem('admin');
    this.router.navigate(['/admin/login']);
  }
}
