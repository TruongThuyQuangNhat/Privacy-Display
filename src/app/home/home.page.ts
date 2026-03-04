import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectionStrategy, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MotionService } from '../services/motion.service';
import { SettingsService, AppSettings, ShapeConfig } from '../services/settings.service';

@Component({ 
  selector: 'app-home', 
  templateUrl: './home.page.html', 
  styleUrls: ['./home.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush, 
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild('displayArea') displayAreaRef!: ElementRef<HTMLDivElement>;

  settings!: AppSettings;
  shape!: ShapeConfig;

  // Privacy overlay
  overlayOpacity = 0;
  blurPx = 0;

  // Drag state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private shapeStartX = 0;
  private shapeStartY = 0;

  private settingsSub!: Subscription;
  private motionSub!: Subscription;

  constructor(
    private motionService: MotionService,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  async ngOnInit() {
    // Kiểm tra trạng thái permission iOS trước
    await this.motionService.checkIOSPermissionStatus();

    // iOS cần user gesture sau mỗi lần reload → về Setup
    if (this.motionService.needsAnyIOSGesture) {
      this.router.navigateByUrl('/setup', { replaceUrl: true });
      return;
    }

    await this.motionService.start();

    this.motionSub = this.motionService.orientation$.subscribe(o => {
      this.computeOverlay(o.beta, o.gamma);
      this.cdr.markForCheck();
    });

    this.settingsSub = this.settingsService.settings$.subscribe(s => {
      this.settings = s;
      this.shape = { ...s.shape };
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.settingsSub?.unsubscribe();
    this.motionSub?.unsubscribe();
  }

  // ── Overlay computation ──────────────────────────────────────
  private computeOverlay(beta: number, gamma: number) {
    if (!this.settings?.privacyEnabled) {
      this.overlayOpacity = 0; this.blurPx = 0; return;
    }

    const { baseBeta, baseGamma, tolerance } = this.settings;

    const deviation = Math.sqrt(
      Math.pow(beta - baseBeta, 2) + Math.pow(gamma - baseGamma, 2)
    );

    if (deviation <= tolerance) {
      // Trong vùng an toàn: hoàn toàn trong suốt
      this.overlayOpacity = 0;
      this.blurPx = 0;
    } else {
      // Ngoài vùng an toàn: tăng dần đến max
      // maxDelta = 30 → nghiêng thêm 30° ngoài tolerance là che hoàn toàn
      const maxDelta = 30;
      const ratio = Math.min(1, (deviation - tolerance) / maxDelta);

      // Dùng easeIn để tăng nhanh hơn ở cuối
      const eased = ratio * ratio;

      this.overlayOpacity = eased * 0.97;  // gần như đen/trắng hoàn toàn
      this.blurPx = eased * 28;            // blur mạnh
    }
  }

  // ── Shape type ───────────────────────────────────────────────
  async setShapeType(type: 'rectangle' | 'square' | 'circle') {
    this.shape = { ...this.shape, type };
    if (type === 'square' || type === 'circle') {
      const s = Math.min(this.shape.width, this.shape.height);
      this.shape.width = s; this.shape.height = s;
    }
    await this.saveShape();
  }

  // ── Size slider ──────────────────────────────────────────────
  async onSizeChange(ev: any) {
    const v = ev.detail.value as number;
    if (this.shape.type === 'rectangle') {
      this.shape.width = v; this.shape.height = v * 0.65;
    } else {
      this.shape.width = v; this.shape.height = v;
    }
    this.clamp();
    await this.saveShape();
  }

  get sizeSliderValue(): number { return this.shape?.width ?? 65; }

  // ── Touch drag on shape ──────────────────────────────────────
  onShapeTouchStart(ev: TouchEvent) {
    ev.stopPropagation();
    this.isDragging = true;
    this.dragStartX = ev.touches[0].clientX;
    this.dragStartY = ev.touches[0].clientY;
    this.shapeStartX = this.shape.x;
    this.shapeStartY = this.shape.y;
  }

  onShapeTouchMove(ev: TouchEvent) {
    if (!this.isDragging) return;
    ev.preventDefault();
    const rect = this.displayAreaRef.nativeElement.getBoundingClientRect();
    const dx = ((ev.touches[0].clientX - this.dragStartX) / rect.width) * 100;
    const dy = ((ev.touches[0].clientY - this.dragStartY) / rect.height) * 100;
    this.shape = { ...this.shape, x: this.shapeStartX + dx, y: this.shapeStartY + dy };
    this.clamp();
  }

  async onShapeTouchEnd() {
    this.isDragging = false;
    await this.saveShape();
  }

  // ── Helpers ──────────────────────────────────────────────────
  private clamp() {
    const hw = this.shape.width / 2, hh = this.shape.height / 2;
    this.shape.x = Math.max(hw, Math.min(100 - hw, this.shape.x));
    this.shape.y = Math.max(hh, Math.min(100 - hh, this.shape.y));
  }

  private async saveShape() {
    await this.settingsService.save({ shape: { ...this.shape } });
  }

  get shapeStyle(): any {
    const h = this.shape.type === 'rectangle' ? this.shape.height : this.shape.width;
    const br = this.shape.type === 'circle' ? '50%' : this.shape.type === 'square' ? '10px' : '14px';
    return {
      left: this.shape.x + '%',
      top:  this.shape.y + '%',
      width:  this.shape.width + '%',
      height: h + '%',
      transform: 'translate(-50%,-50%)',
      borderRadius: br,
    };
  }

  get overlayStyle(): any {
    if (!this.settings) return {};
    if (this.settings.effectType === 'blur') {
      return { backdropFilter: `blur(${this.blurPx}px)`, WebkitBackdropFilter: `blur(${this.blurPx}px)`,
               opacity: this.overlayOpacity > 0 ? 1 : 0, transition: 'all 0.2s ease' };
    }
    return { backgroundColor: `rgba(0,0,0,${this.overlayOpacity})`, transition: 'background-color 0.2s ease' };
  }

  get isPrivacyActive(): boolean { return this.overlayOpacity > 0.05; }
}