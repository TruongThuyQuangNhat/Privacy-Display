import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Capacitor } from '@capacitor/core';

export interface DeviceOrientation { alpha: number; beta: number; gamma: number; }

@Injectable({ providedIn: 'root' })
export class MotionService {
  orientation$ = new BehaviorSubject<DeviceOrientation>({ alpha: 0, beta: 0, gamma: 0 });
  permissionDenied = false;

  private _started = false;
  private _capacitorHandle: any = null;
  private _webListener: ((e: DeviceOrientationEvent) => void) | null = null;
  private readonly _isNative = Capacitor.isNativePlatform();

  constructor(private zone: NgZone) {}

  get needsIOSPermission(): boolean {
    if (this._isNative) return false;
    return typeof (DeviceOrientationEvent as any).requestPermission === 'function';
  }

  get isStarted(): boolean { return this._started; }

  // Gọi TRỰC TIẾP trong (click) handler — không await gì trước đó
  async requestIOSPermission(): Promise<boolean> {
    try {
      const result = await (DeviceOrientationEvent as any).requestPermission();
      if (result === 'granted') {
        this.permissionDenied = false;
        this._registerWebListener();
        this._started = true;
        return true;
      }
      this.permissionDenied = true;
      return false;
    } catch (e) {
      console.warn('[Motion] iOS permission error', e);
      this.permissionDenied = true;
      return false;
    }
  }

  async start(): Promise<void> {
    if (this._started) return;

    if (this._isNative) {
      await this._startCapacitor();
    } else if (!this.needsIOSPermission) {
      // Android Chrome hoặc desktop
      this._registerWebListener();
      this._started = true;
    }
    // iOS Safari: không làm gì — xử lý qua requestIOSPermission()
  }

  // Reset hoàn toàn để dùng lại (recalibrate)
  async reset(): Promise<void> {
    // Dọn Capacitor listener
    if (this._capacitorHandle) {
      try { await this._capacitorHandle.remove(); } catch (_) {}
      this._capacitorHandle = null;
    }
    // Dọn web listener
    if (this._webListener) {
      window.removeEventListener('deviceorientation', this._webListener as any, true);
      this._webListener = null;
    }
    this._started = false;
    this.permissionDenied = false;
    // Reset giá trị về 0
    this.orientation$.next({ alpha: 0, beta: 0, gamma: 0 });
  }

  private async _startCapacitor(): Promise<void> {
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
      this._started = true;
    } catch (e) {
      console.warn('[Motion] Capacitor failed, falling back to web', e);
      this._registerWebListener();
      this._started = true;
    }
  }

  private _registerWebListener(): void {
    if (this._webListener) return; // Tránh đăng ký 2 lần
    if (!window.DeviceOrientationEvent) return;

    this._webListener = (e: DeviceOrientationEvent) => {
      this.zone.run(() =>
        this.orientation$.next({
          alpha: e.alpha ?? 0,
          beta:  e.beta  ?? 0,
          gamma: e.gamma ?? 0,
        })
      );
    };
    window.addEventListener('deviceorientation', this._webListener as any, true);
  }

  get current() { return this.orientation$.value; }
  get isNative() { return this._isNative; }
}