import { Component } from '@angular/core';
import { ThreeVanillaCanvas } from './three-vanilla/three-vanilla-canvas';

@Component({
	selector: 'app-root',
	template: `
		<app-three-vanilla-canvas />
	`,
	imports: [ThreeVanillaCanvas],
	host: { class: 'block h-dvh w-full' },
})
export class App {}
