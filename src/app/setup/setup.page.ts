import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MotionService } from '../services/motion.service';
import { SettingsService } from '../services/settings.service';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.page.html',
  styleUrls: ['./setup.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    await new Promise(resolve => setTimeout(resolve, 50));
    this.tolerance = this.settings.current.tolerance ?? 10;
    await this.motion.checkIOSPermissionStatus();

    // Chạy ngoài zone — chỉ markForCheck thay vì detectChanges toàn bộ cây
    this.sub = this.motion.orientation$.subscribe(o => {
      this.currentBeta  = Math.round(o.beta  * 10) / 10;
      this.currentGamma = Math.round(o.gamma * 10) / 10;
      this.cdr.markForCheck(); // nhẹ hơn detectChanges rất nhiều
    });

    if (this.motion.needsAnyIOSGesture) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    await this.motion.start();
    this.isLoading = false;
    this.cdr.markForCheck();
  }

  onHoldStart(ev: Event) {
    ev.preventDefault();
    if (this.isCapturing) return;
    if (this.motion.needsAnyIOSGesture && !this.iosPermissionGranted) return;

    this.isHolding = true;
    this.holdProgress = 0;
    const t0 = Date.now();

    this.holdInterval = setInterval(() => {
      this.holdProgress = Math.min(100, ((Date.now() - t0) / 3000) * 100);
      this.cdr.markForCheck(); // thay detectChanges
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
    this.cdr.markForCheck();
  }

  async onRequestIOSPermission() {
    const granted = await this.motion.requestIOSPermission();
    if (granted) {
      this.iosPermissionGranted = true;
      this.permissionDenied = false;
    } else {
      this.permissionDenied = true;
    }
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
    setTimeout(() => this.router.navigateByUrl('/tabs/home', { replaceUrl: true }), 1200);
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

  private clearHold() {
    if (this.holdInterval) {
      clearInterval(this.holdInterval);
      this.holdInterval = null;
    }
  }

  get remainSec(): string {
    return ((100 - this.holdProgress) * 3 / 100).toFixed(1);
  }
}