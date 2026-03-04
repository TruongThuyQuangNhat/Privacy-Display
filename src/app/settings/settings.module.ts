import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SettingsPageRoutingModule } from './settings-routing.module';

import { SettingsPage } from './settings.page';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule,
    RouterModule.forChild([{ path: '', component: SettingsPage }])],
  declarations: [SettingsPage],
})
export class SettingsPageModule {}
