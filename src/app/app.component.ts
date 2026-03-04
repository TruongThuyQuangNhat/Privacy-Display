import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  template: '<ion-app [class.light-theme]="isLight"><ion-router-outlet></ion-router-outlet></ion-app>',
  standalone: false,
})
export class AppComponent implements OnInit {
  isLight = false;

  constructor(private settings: SettingsService, private router: Router) {}

  async ngOnInit() {
    await this.settings.load();
    this.settings.settings$.subscribe(s => {
      this.isLight = s.themeMode === 'light';
      document.body.classList.toggle('light-theme', this.isLight);
    });
    this.router.navigateByUrl(this.settings.current.isSetupDone ? '/tabs/home' : '/setup');
  }
}