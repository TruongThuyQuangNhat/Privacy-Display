import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TabsPageRoutingModule } from './tabs-routing.module';

import { TabsPage } from './tabs.page';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule, IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: TabsPage,
        children: [
          { path: 'home',     loadChildren: () => import('../home/home.module').then(m => m.HomePageModule) },
          { path: 'settings', loadChildren: () => import('../settings/settings.module').then(m => m.SettingsPageModule) },
          { path: '', redirectTo: 'home', pathMatch: 'full' },
        ],
      },
    ]),
  ],
  declarations: [TabsPage]
})
export class TabsPageModule {}
