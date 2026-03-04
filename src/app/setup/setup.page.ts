import { Component, OnInit, OnDestroy } from '@angular/core';
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
  private holdInterval: any = null;
  private sub: Subscription | null = null;

  constructor(private motion: MotionService, private settings: SettingsService, private router: Router) {}

  async ngOnInit() {
    await this.motion.start();
    this.sub = this.motion.orientation$.subscribe(o => {
      this.currentBeta  = Math.round(o.beta  * 10) / 10;
      this.currentGamma = Math.round(o.gamma * 10) / 10;
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); this.clearHold(); }

  onHoldStart(ev: Event) {
    ev.preventDefault();
    if (this.isCapturing) return;
    this.isHolding = true;
    this.holdProgress = 0;
    const t0 = Date.now();
    this.holdInterval = setInterval(() => {
      this.holdProgress = Math.min(100, ((Date.now() - t0) / 3000) * 100);
      if (this.holdProgress >= 100) this.captureAngle();
    }, 30);
  }

  onHoldEnd(ev: Event) {
    ev.preventDefault();
    if (!this.isCapturing) { this.isHolding = false; this.holdProgress = 0; }
    this.clearHold();
  }

  private clearHold() {
    if (this.holdInterval) { clearInterval(this.holdInterval); this.holdInterval = null; }
  }

  private async captureAngle() {
    this.clearHold();
    this.isCapturing = true;
    const { beta, gamma } = this.motion.current;
    await this.settings.save({ baseBeta: beta, baseGamma: gamma, tolerance: this.tolerance, isSetupDone: true });
    this.captureSuccess = true;
    setTimeout(() => this.router.navigateByUrl('/tabs/home'), 1200);
  }

  get remainSec(): string {
    return ((100 - this.holdProgress) * 3 / 100).toFixed(1);
  }
}