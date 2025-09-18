import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { extend } from 'angular-three';
import { NgtsPerspectiveCamera } from 'angular-three-soba/cameras';
import * as THREE from 'three';

@Component({
	selector: 'app-scene-graph',
	template: `
		<ngts-perspective-camera
			[options]="{ makeDefault: true, position: 5, far: 1000, fov: 75 }"
			(updated)="$event.lookAt(0, 0, 0)"
		/>

		<ngt-mesh>
			<ngt-box-geometry />
			<ngt-mesh-basic-material />
		</ngt-mesh>
	`,
	imports: [NgtsPerspectiveCamera],
	changeDetection: ChangeDetectionStrategy.OnPush,
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SceneGraph {
	constructor() {
		extend(THREE);
	}
}
