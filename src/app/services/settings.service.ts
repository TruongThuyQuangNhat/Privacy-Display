import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject } from 'rxjs';

export type EffectType = 'dim' | 'blur';
export type PrivacyMode = 'region' | 'fullscreen';
export type ShapeType = 'rectangle' | 'square' | 'circle';

export interface ShapeConfig {
  type: ShapeType;
  x: number;      // center x, % of display area
  y: number;      // center y, % of display area
  width: number;  // % of display area width
  height: number; // % of display area height
}

export interface AppSettings {
  isSetupDone: boolean;
  baseBeta: number;
  baseGamma: number;
  tolerance: number;
  effectType: EffectType;
  privacyMode: PrivacyMode;
  privacyEnabled: boolean;
  shape: ShapeConfig;
  themeMode: 'dark' | 'light';
}

const DEFAULTS: AppSettings = {
  isSetupDone: false,
  baseBeta: 0,
  baseGamma: 0,
  tolerance: 10,
  effectType: 'dim',
  privacyMode: 'region',
  privacyEnabled: true,
  shape: { type: 'rectangle', x: 50, y: 50, width: 65, height: 42 },
  themeMode: 'dark',
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private _s: AppSettings = { ...DEFAULTS };
  settings$ = new BehaviorSubject<AppSettings>(this._s);

  async load() {
    const { value } = await Preferences.get({ key: 'pd_settings' });
    if (value) {
      const p = JSON.parse(value);
      this._s = { ...DEFAULTS, ...p, shape: { ...DEFAULTS.shape, ...(p.shape || {}) } };
      this.settings$.next(this._s);
    }
  }

  async save(partial: Partial<AppSettings>) {
    this._s = { ...this._s, ...partial };
    this.settings$.next(this._s);
    await Preferences.set({ key: 'pd_settings', value: JSON.stringify(this._s) });
  }

  get current() { return this._s; }
}