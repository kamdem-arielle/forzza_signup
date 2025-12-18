import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'frontend';
  currentLang = 'en';

  constructor(private translate: TranslateService) {
    const saved = localStorage.getItem('lang');
    this.currentLang = saved || 'en';
    this.translate.use(this.currentLang);
  }

  switchLanguage(lang: 'en' | 'fr') {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }
}
