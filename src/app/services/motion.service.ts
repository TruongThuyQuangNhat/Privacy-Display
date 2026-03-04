import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface DeviceOrientation { alpha: number; beta: number; gamma: number; }

@Injectable({ providedIn: 'root' })
export class MotionService {
  orientation$ = new BehaviorSubject<DeviceOrientation>({ alpha: 0, beta: 0, gamma: 0 });
  permissionDenied = false;
  private _started = false;
  private _capacitorHandle: any = null;

  constructor(private zone: NgZone) {}

  async start(): Promise<void> {
    if (this._started) return;
    this._started = true;

    // ── Thử Capacitor trước (native iOS/Android app) ──────────
    try {
      const { Motion } = await import('@capacitor/motion');
      this._capacitorHandle = await Motion.addListener('orientation', (e: any) => {
        this.zone.run(() =>
          this.orientation$.next({
            alpha: e.alpha ?? 0,
            beta:  e.beta  ?? 0,
            gamma: e.gamma ?? 0,
          })
        );
      });
      console.log('[Motion] Using Capacitor native sensor');
      return; // Thành công → dừng, không cần web fallback
    } catch (e) {
      console.log('[Motion] Capacitor not available, falling back to Web API');
    }

    // ── Web fallback (browser / PWA) ──────────────────────────
    await this.startWebSensor();
  }

  private async startWebSensor(): Promise<void> {
    // iOS 13+ Safari bắt buộc xin permission
    // Phải gọi hàm này từ user gesture (tap/hold) mới được
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const result = await (DeviceOrientationEvent as any).requestPermission();
        if (result !== 'granted') {
          this.permissionDenied = true;
          console.warn('[Motion] iOS permission denied');
          return;
        }
      } catch (e) {
        this.permissionDenied = true;
        console.warn('[Motion] iOS permission error', e);
        return;
      }
    }

    // Android Chrome / desktop fallback
    if (!window.DeviceOrientationEvent) {
      console.warn('[Motion] DeviceOrientationEvent not supported on this device');
      return;
    }

    window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
      this.zone.run(() =>
        this.orientation$.next({
          alpha: e.alpha ?? 0,
          beta:  e.beta  ?? 0,
          gamma: e.gamma ?? 0,
        })
      );
    }, true);

    console.log('[Motion] Using Web DeviceOrientation API');
  }

  async stop(): Promise<void> {
    // Dừng Capacitor listener nếu đang dùng
    if (this._capacitorHandle) {
      try { await this._capacitorHandle.remove(); } catch (_) {}
      this._capacitorHandle = null;
    }
    this._started = false;
  }

  // Reset để gọi start() lại (dùng khi re-calibrate)
  reset(): void {
    this.stop();
    this.permissionDenied = false;
  }

  get current() { return this.orientation$.value; }

  get isNative(): boolean { return !!this._capacitorHandle; }
}