import { Component } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { SceneGraph } from './scene-graph/scene-graph';

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
	imports: [NgtCanvas, SceneGraph],
	host: { class: 'block h-dvh w-full' },
})
export class App {}
