import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MotionService } from '../services/motion.service';
import { SettingsService } from '../services/settings.service';

@Component({ 
  selector: 'app-setup', 
  templateUrl: './setup.page.html', 
  styleUrls: ['./setup.page.scss'],
  standalone: false,
})
export class SetupPage implements OnInit, OnDestroy {
  currentBeta = 0;
  currentGamma = 0;
  isHolding = false;
  holdProgress = 0;
  isCapturing = false;
  captureSuccess = false;
  tolerance = 10;
  permissionDenied = false;

  // iOS flow
  iosPermissionGranted = false;

  private holdInterval: any = null;
  private sub: Subscription | null = null;

  constructor(
    private motion: MotionService,
    private settings: SettingsService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.sub = this.motion.orientation$.subscribe(o => {
      this.currentBeta  = Math.round(o.beta  * 10) / 10;
      this.currentGamma = Math.round(o.gamma * 10) / 10;
    });

    if (!this.motion.needsIOSPermission) {
      await this.motion.start();
    }
  }

  ngOnDestroy() { this.sub?.unsubscribe(); this.clearHold(); }


  async onRequestIOSPermission() {
    const granted = await this.motion.requestIOSPermission();
    if (granted) {
      this.iosPermissionGranted = true;
      this.permissionDenied = false;
      // Sau khi có quyền mới start listener
      await this.motion.start();
    } else {
      this.permissionDenied = true;
    }
  }

  onHoldStart(ev: Event) {
    ev.preventDefault();
    if (this.isCapturing) return;
    if (this.motion.needsIOSPermission && !this.iosPermissionGranted) return;

    this.isHolding = true;
    this.holdProgress = 0;
    const t0 = Date.now();
    this.holdInterval = setInterval(() => {
      this.holdProgress = Math.min(100, ((Date.now() - t0) / 3000) * 100);
      if (this.holdProgress >= 100) this.captureAngle();
    }, 30);
  }

  onHoldEnd(ev: Event) {
    ev.preventDefault();
    if (!this.isCapturing) { this.isHolding = false; this.holdProgress = 0; }
    this.clearHold();
  }

  private clearHold() {
    if (this.holdInterval) { clearInterval(this.holdInterval); this.holdInterval = null; }
  }

  private async captureAngle() {
    this.clearHold();
    this.isCapturing = true;
    const { beta, gamma } = this.motion.current;
    await this.settings.save({ baseBeta: beta, baseGamma: gamma, tolerance: this.tolerance, isSetupDone: true });
    this.captureSuccess = true;
    setTimeout(() => this.router.navigateByUrl('/tabs/home'), 1200);
  }

  get remainSec(): string {
    return ((100 - this.holdProgress) * 3 / 100).toFixed(1);
  }

  get showIOSPermissionBtn(): boolean {
    return this.motion.needsIOSPermission && !this.iosPermissionGranted;
  }
}