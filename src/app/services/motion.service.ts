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

  // Cached để không gọi Preferences nhiều lần
  private _iosAlreadyGranted: boolean | null = null;

  constructor(private zone: NgZone) {}

  // Kiểm tra iOS cần hỏi quyền không
  // → false nếu là native app
  // → false nếu đã từng cấp quyền rồi (đã lưu)
  // → false nếu browser không có requestPermission (Android Chrome)
  // → true chỉ khi iOS Safari lần đầu chưa cấp
  get needsIOSPermission(): boolean {
    if (this._isNative) return false;
    if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') return false;
    if (this._iosAlreadyGranted === true) return false;
    return true;
  }

  // Gọi khi app khởi động để load trạng thái đã lưu
  async checkIOSPermissionStatus(): Promise<void> {
    if (this._isNative) return;
    if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') return;

    try {
      const { value } = await Preferences.get({ key: IOS_PERMISSION_KEY });
      if (value === 'true') {
        this._iosAlreadyGranted = true;
      }
    } catch (_) {}
  }

  // Gọi TRỰC TIẾP trong (click) handler
  async requestIOSPermission(): Promise<boolean> {
    try {
      const result = await (DeviceOrientationEvent as any).requestPermission();
      if (result === 'granted') {
        this.permissionDenied = false;
        this._iosAlreadyGranted = true;
        // Lưu lại để lần sau không hỏi nữa
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
    } else if (!this.needsIOSPermission) {
      // Android Chrome hoặc iOS đã cấp quyền từ trước
      this._registerWebListener();
      this._started = true;
    }
    // iOS lần đầu: không làm gì, chờ user tap nút
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

    this._webListener = (e: DeviceOrientationEvent) => {
      this.zone.run(() =>
        this.orientation$.next({ alpha: e.alpha ?? 0, beta: e.beta ?? 0, gamma: e.gamma ?? 0 })
      );
    };
    window.addEventListener('deviceorientation', this._webListener as any, true);
  }

  get current() { return this.orientation$.value; }
  get isNative() { return this._isNative; }
}