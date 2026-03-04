import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { SettingsService, AppSettings } from '../services/settings.service';

@Component({ 
  selector: 'app-settings', 
  templateUrl: './settings.page.html', 
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  settings!: AppSettings;

  constructor(
    private settingsService: SettingsService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.settingsService.settings$.subscribe(s => { this.settings = { ...s }; });
  }

  async onPrivacyEnabledChange(ev: any) {
    await this.settingsService.save({ privacyEnabled: ev.detail.checked });
  }

  async onEffectTypeChange(type: 'dim' | 'blur') {
    await this.settingsService.save({ effectType: type });
  }

  async onPrivacyModeChange(mode: 'region' | 'fullscreen') {
    await this.settingsService.save({ privacyMode: mode });
  }

  async onToleranceChange(ev: any) {
    await this.settingsService.save({ tolerance: ev.detail.value });
  }

  async recalibrate() {
    const alert = await this.alertCtrl.create({
      header: 'Hiệu chỉnh lại',
      message: 'Chuyển đến màn hình thiết lập để hiệu chỉnh lại góc nghiêng?',
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Đồng ý',
          handler: async () => {
            await this.settingsService.save({ isSetupDone: false });
            this.router.navigateByUrl('/setup');
          }
        }
      ],
      cssClass: 'dark-alert',
    });
    await alert.present();
  }

  // Thêm method:
  async onThemeChange(mode: 'dark' | 'light') {
    await this.settingsService.save({ themeMode: mode });
  }
}