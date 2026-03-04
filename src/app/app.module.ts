import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy, RouterModule } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot({ mode: 'md' }),
    RouterModule.forRoot([
      { path: 'setup', loadChildren: () => import('./setup/setup.module').then(m => m.SetupPageModule) },
      { path: 'tabs',  loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule) },
      { path: '', redirectTo: 'setup', pathMatch: 'full' },
    ]),
  ],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],
  bootstrap: [AppComponent],
})
export class AppModule {}
