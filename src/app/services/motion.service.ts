import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export interface DeviceOrientation { alpha: number; beta: number; gamma: number; }

const IOS_PERMISSION_KEY = 'ios_motion_permission_granted';

@Injectable({ providedIn: 'root' })
export class MotionService {
  orientation$ = new BehaviorSubject<DeviceOrientation>({ alpha: 0, beta: 0, gamma: 0 });
  permissionDenied = false;

  private _started = false;
  private _capacitorHandle: any = null;
  private _webListener: ((e: DeviceOrientationEvent) => void) | null = null;
  private readonly _isNative = Capacitor.isNativePlatform();
  private _iosPreviouslyGranted = false;  // đã cấp trong session trước
  private _iosCurrentGranted = false;     // đã cấp trong session này

  constructor(private zone: NgZone) {}

  // Gọi khi app khởi động để biết user đã từng cấp chưa
  async checkIOSPermissionStatus(): Promise<void> {
    if (this._isNative) return;
    if (!this._hasRequestPermissionAPI()) return;
    try {
      const { value } = await Preferences.get({ key: IOS_PERMISSION_KEY });
      this._iosPreviouslyGranted = value === 'true';
    } catch (_) {}
  }

  // Cần hiện nút xin quyền lần đầu (chưa bao giờ cấp)
  get needsFirstTimePermission(): boolean {
    if (this._isNative) return false;
    if (!this._hasRequestPermissionAPI()) return false;
    return !this._iosPreviouslyGranted && !this._iosCurrentGranted;
  }

  // Cần tap để resume (đã cấp trước đó nhưng reload mất session)
  get needsTapToResume(): boolean {
    if (this._isNative) return false;
    if (!this._hasRequestPermissionAPI()) return false;
    return this._iosPreviouslyGranted && !this._iosCurrentGranted;
  }

  // iOS cần bất kỳ dạng user gesture nào
  get needsAnyIOSGesture(): boolean {
    return this.needsFirstTimePermission || this.needsTapToResume;
  }

  // Gọi TRỰC TIẾP trong (click) — không await gì trước
  async requestIOSPermission(): Promise<boolean> {
    if (!this._hasRequestPermissionAPI()) {
      this._iosCurrentGranted = true;
      return true;
    }
    try {
      const result = await (DeviceOrientationEvent as any).requestPermission();
      if (result === 'granted') {
        this.permissionDenied = false;
        this._iosCurrentGranted = true;
        this._iosPreviouslyGranted = true;
        await Preferences.set({ key: IOS_PERMISSION_KEY, value: 'true' });
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
    } else if (!this.needsAnyIOSGesture) {
      // Android Chrome, desktop
      this._registerWebListener();
      this._started = true;
    }
    // iOS: chờ user gesture qua requestIOSPermission()
  }

  async reset(): Promise<void> {
    if (this._capacitorHandle) {
      try { await this._capacitorHandle.remove(); } catch (_) {}
      this._capacitorHandle = null;
    }
    if (this._webListener) {
      window.removeEventListener('deviceorientation', this._webListener as any, true);
      this._webListener = null;
    }
    this._started = false;
    this.permissionDenied = false;
    this.orientation$.next({ alpha: 0, beta: 0, gamma: 0 });
  }

  private _hasRequestPermissionAPI(): boolean {
    return typeof (DeviceOrientationEvent as any).requestPermission === 'function';
  }

  private async _startCapacitor(): Promise<void> {
    try {
      const { Motion } = await import('@capacitor/motion');
      this._capacitorHandle = await Motion.addListener('orientation', (e: any) => {
        this.zone.run(() =>
          this.orientation$.next({ alpha: e.alpha ?? 0, beta: e.beta ?? 0, gamma: e.gamma ?? 0 })
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
    if (this._webListener) return;
    if (!window.DeviceOrientationEvent) return;

    let rafId: number | null = null;
    let latestEvent: DeviceOrientationEvent | null = null;

    this._webListener = (e: DeviceOrientationEvent) => {
      latestEvent = e;
      // Nếu đã có frame đang chờ thì không queue thêm
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!latestEvent) return;
        const ev = latestEvent;
        latestEvent = null;
        this.zone.run(() =>
          this.orientation$.next({
            alpha: ev.alpha ?? 0,
            beta:  ev.beta  ?? 0,
            gamma: ev.gamma ?? 0,
          })
        );
      });
    };

    window.addEventListener('deviceorientation', this._webListener as any, true);
  }

  get current() { return this.orientation$.value; }
  get isNative() { return this._isNative; }
}