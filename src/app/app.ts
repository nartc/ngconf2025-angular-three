import { Component } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { SceneGraph } from './scene-graph/scene-graph';
import { ThreeVanillaCanvas } from './three-vanilla/three-vanilla-canvas';

@Component({
	selector: 'app-root',
	template: `
		<!--
		<app-three-vanilla-canvas />
        -->

		<ngt-canvas>
			<app-scene-graph *canvasContent />
		</ngt-canvas>
	`,
	imports: [ThreeVanillaCanvas, NgtCanvas, SceneGraph],
	host: { class: 'block h-dvh w-full' },
})
export class App {}
