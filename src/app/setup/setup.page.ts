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
  isLoading = true; // Tránh flash nội dung trước khi init xong

  private holdInterval: any = null;
  private sub: Subscription | null = null;

  constructor(
    private motion: MotionService,
    private settings: SettingsService,
    private router: Router,
    private cdr: ChangeDetectorRef  // Quan trọng cho iOS
  ) {}

  async ngOnInit() {
    // Reset motion service mỗi lần vào Setup (quan trọng cho recalibrate)
    await this.motion.reset();

    // Load tolerance đã lưu
    this.tolerance = this.settings.current.tolerance ?? 10;

    // Subscribe nhận giá trị sensor
    this.sub = this.motion.orientation$.subscribe(o => {
      this.currentBeta  = Math.round(o.beta  * 10) / 10;
      this.currentGamma = Math.round(o.gamma * 10) / 10;
      this.cdr.detectChanges();
    });

    // Nếu là iOS Safari → chờ user tap để xin quyền
    if (this.motion.needsIOSPermission) {
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    // Android / Capacitor native → start ngay
    await this.motion.start();
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.clearHold();
  }

  // ── iOS: xin quyền ───────────────────────────────────────────
  // Phải là synchronous click handler — requestPermission() phải là
  // lệnh await ĐẦU TIÊN, không có await nào trước đó
  async onRequestIOSPermission() {
    const granted = await this.motion.requestIOSPermission();
    if (granted) {
      this.iosPermissionGranted = true;
      this.permissionDenied = false;
    } else {
      this.permissionDenied = true;
    }
    // Force Angular re-render sau khi Promise resolve
    this.cdr.detectChanges();
  }

  // ── Hold to capture ───────────────────────────────────────────
  onHoldStart(ev: Event) {
    ev.preventDefault();
    if (this.isCapturing) return;

    // iOS: chưa cấp quyền thì không cho hold
    if (this.motion.needsIOSPermission && !this.iosPermissionGranted) return;

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
    setTimeout(() => this.router.navigateByUrl('/tabs/home'), 1200);
  }

  get showIOSPermissionBtn(): boolean {
    return this.motion.needsIOSPermission && !this.iosPermissionGranted;
  }

  get remainSec(): string {
    return ((100 - this.holdProgress) * 3 / 100).toFixed(1);
  }
}