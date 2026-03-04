import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
  iosPermissionGranted = false;
  isLoading = true;

  private holdInterval: any = null;
  private sub: Subscription | null = null;

  constructor(
    private motion: MotionService,
    private settings: SettingsService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.motion.reset();
    this.tolerance = this.settings.current.tolerance ?? 10;
    await this.motion.checkIOSPermissionStatus();

    this.sub = this.motion.orientation$.subscribe(o => {
      this.currentBeta  = Math.round(o.beta  * 10) / 10;
      this.currentGamma = Math.round(o.gamma * 10) / 10;
      this.cdr.detectChanges();
    });

    if (this.motion.needsAnyIOSGesture) {
      // iOS: hiện UI xin gesture, chưa start sensor
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    await this.motion.start();
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async onRequestIOSPermission() {
    const granted = await this.motion.requestIOSPermission();
    if (granted) {
      this.iosPermissionGranted = true;
      this.permissionDenied = false;
    } else {
      this.permissionDenied = true;
    }
    this.cdr.detectChanges();
  }

  // getter cập nhật
  get showIOSPermissionBtn(): boolean {
    return this.motion.needsFirstTimePermission && !this.iosPermissionGranted;
  }

  get showTapToResume(): boolean {
    return this.motion.needsTapToResume && !this.iosPermissionGranted;
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.clearHold();
  }

  // ── Giữ nút 3 giây để lưu góc ────────────────────────────────
  onHoldStart(ev: Event) {
    ev.preventDefault();
    if (this.isCapturing) return;

    // Thay needsIOSPermission bằng needsAnyIOSGesture
    if (this.motion.needsAnyIOSGesture && !this.iosPermissionGranted) return;

    this.isHolding = true;
    this.holdProgress = 0;
    const t0 = Date.now();

    this.holdInterval = setInterval(() => {
      this.holdProgress = Math.min(100, ((Date.now() - t0) / 3000) * 100);
      this.cdr.detectChanges();
      if (this.holdProgress >= 100) this.captureAngle();
    }, 30);
  }

  onHoldEnd(ev: Event) {
    ev.preventDefault();
    if (!this.isCapturing) {
      this.isHolding = false;
      this.holdProgress = 0;
    }
    this.clearHold();
    this.cdr.detectChanges();
  }

  private clearHold() {
    if (this.holdInterval) {
      clearInterval(this.holdInterval);
      this.holdInterval = null;
    }
  }

  private async captureAngle() {
    this.clearHold();
    this.isCapturing = true;
    const { beta, gamma } = this.motion.current;
    await this.settings.save({
      baseBeta: beta,
      baseGamma: gamma,
      tolerance: this.tolerance,
      isSetupDone: true,
    });
    this.captureSuccess = true;
    this.cdr.detectChanges();
    setTimeout(() => this.router.navigateByUrl('/tabs/home', { replaceUrl: true }), 1200);
  }

  get remainSec(): string {
    return ((100 - this.holdProgress) * 3 / 100).toFixed(1);
  }
}