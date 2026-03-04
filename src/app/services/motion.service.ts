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

  // Kiểm tra có phải iOS cần xin quyền không
  get needsIOSPermission(): boolean {
    return typeof (DeviceOrientationEvent as any).requestPermission === 'function';
  }

  // Gọi hàm này TRỰC TIẾP trong (click) handler — không được await gì trước đó
  async requestIOSPermission(): Promise<boolean> {
    try {
      const result = await (DeviceOrientationEvent as any).requestPermission();
      if (result === 'granted') {
        this.permissionDenied = false;
        return true;
      } else {
        this.permissionDenied = true;
        return false;
      }
    } catch (e) {
      console.warn('[Motion] iOS permission error', e);
      this.permissionDenied = true;
      return false;
    }
  }

  async start(): Promise<void> {
    if (this._started) return;
    this._started = true;

    // Thử Capacitor trước (native app)
    try {
      const { Motion } = await import('@capacitor/motion');
      this._capacitorHandle = await Motion.addListener('orientation', (e: any) => {
        this.zone.run(() =>
          this.orientation$.next({ alpha: e.alpha ?? 0, beta: e.beta ?? 0, gamma: e.gamma ?? 0 })
        );
      });
      console.log('[Motion] Using Capacitor native sensor');
      return;
    } catch (e) {
      console.log('[Motion] Capacitor not available, falling back to Web API');
    }

    // Web fallback — iOS permission đã được xin riêng trước đó
    this.registerWebListener();
  }

  registerWebListener(): void {
    if (!window.DeviceOrientationEvent) {
      console.warn('[Motion] DeviceOrientationEvent not supported');
      return;
    }
    window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
      this.zone.run(() =>
        this.orientation$.next({ alpha: e.alpha ?? 0, beta: e.beta ?? 0, gamma: e.gamma ?? 0 })
      );
    }, true);
    console.log('[Motion] Web DeviceOrientation listener registered');
  }

  async stop(): Promise<void> {
    if (this._capacitorHandle) {
      try { await this._capacitorHandle.remove(); } catch (_) {}
      this._capacitorHandle = null;
    }
    this._started = false;
  }

  reset(): void {
    this.stop();
    this.permissionDenied = false;
  }

  get current() { return this.orientation$.value; }
  get isNative(): boolean { return !!this._capacitorHandle; }
}