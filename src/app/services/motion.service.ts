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
  private readonly _isNative = Capacitor.isNativePlatform();

  constructor(private zone: NgZone) {}

  // iOS Safari cần xin permission riêng
  get needsIOSPermission(): boolean {
    if (this._isNative) return false; // Native app dùng Capacitor, không cần
    return typeof (DeviceOrientationEvent as any).requestPermission === 'function';
  }

  // Gọi hàm này TRỰC TIẾP trong (click) — không await gì trước đó
  async requestIOSPermission(): Promise<boolean> {
    try {
      const result = await (DeviceOrientationEvent as any).requestPermission();
      if (result === 'granted') {
        this.permissionDenied = false;
        this.registerWebListener(); // Đăng ký listener ngay sau khi được cấp quyền
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
      // ── Native app: dùng Capacitor ─────────────────────────
      await this.startCapacitor();
    } else if (!this.needsIOSPermission) {
      // ── Web Android / desktop: đăng ký thẳng ──────────────
      this.registerWebListener();
      this._started = true;
    }
    // iOS Safari: KHÔNG làm gì ở đây
    // start() sẽ không được gọi — flow xử lý qua requestIOSPermission()
  }

  private async startCapacitor(): Promise<void> {
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
      console.log('[Motion] Capacitor native sensor started');
    } catch (e) {
      console.warn('[Motion] Capacitor failed, falling back to web', e);
      this.registerWebListener();
      this._started = true;
    }
  }

  registerWebListener(): void {
    if (!window.DeviceOrientationEvent) {
      console.warn('[Motion] DeviceOrientationEvent not supported');
      return;
    }
    window.addEventListener(
      'deviceorientation',
      (e: DeviceOrientationEvent) => {
        this.zone.run(() =>
          this.orientation$.next({
            alpha: e.alpha ?? 0,
            beta:  e.beta  ?? 0,
            gamma: e.gamma ?? 0,
          })
        );
      },
      true
    );
    console.log('[Motion] Web DeviceOrientation listener registered');
  }

  async stop(): Promise<void> {
    if (this._capacitorHandle) {
      try { await this._capacitorHandle.remove(); } catch (_) {}
      this._capacitorHandle = null;
    }
    this._started = false;
  }

  get current() { return this.orientation$.value; }
  get isNative() { return this._isNative; }
}