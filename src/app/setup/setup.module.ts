import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SetupPageRoutingModule } from './setup-routing.module';

import { SetupPage } from './setup.page';
import { RouterModule } from '@angular/router';
import { AbsPipe } from '../abs-pipe';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, AbsPipe,
    RouterModule.forChild([{ path: '', component: SetupPage }])],
  declarations: [SetupPage]
})
export class SetupPageModule {}
