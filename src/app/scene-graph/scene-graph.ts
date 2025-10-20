import {
	ChangeDetectionStrategy,
	Component,
	computed,
	CUSTOM_ELEMENTS_SCHEMA,
	Directive,
	DOCUMENT,
	ElementRef,
	inject,
	input,
	model,
	signal,
	viewChild,
} from '@angular/core';
import { beforeRender, extend, NgtVector3 } from 'angular-three';
import { NgtsPerspectiveCamera } from 'angular-three-soba/cameras';
import { NgtsOrbitControls } from 'angular-three-soba/controls';
import * as THREE from 'three';
import { ManyBoxes } from './many-boxes/many-boxes';

@Directive({
	selector: 'ngt-mesh[cursor]',
	host: {
		'(pointerover)': 'onPointerOver()',
		'(pointerout)': 'onPointerOver()',
	},
})
export class Cursor {
	private document = inject(DOCUMENT);

	protected onPointerOver() {
		this.document.body.style.cursor = 'pointer';
	}

	protected onPointerOut() {
		this.document.body.style.cursor = 'default';
	}
}

@Component({
	selector: 'app-box',
	template: `
		<ngt-mesh
			#mesh
			cursor
			[position]="position()"
			(pointerover)="color.set('hotpink')"
			(pointerout)="color.set('orange')"
			(click)="active.set(!active())"
			[scale]="scale()"
		>
			<ngt-box-geometry />
			<ng-content>
				<ngt-mesh-basic-material [color]="color()" />
			</ng-content>
		</ngt-mesh>
	`,

	imports: [Cursor],
	changeDetection: ChangeDetectionStrategy.OnPush,
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Box {
	position = input<NgtVector3>();
	active = model(false);

	protected color = signal('orange');
	protected scale = computed(() => (this.active() ? 1.5 : 1));

	private meshRef = viewChild.required<ElementRef<THREE.Mesh>>('mesh');

	constructor() {
		beforeRender(() => {
			const mesh = this.meshRef().nativeElement;
			mesh.rotation.x += 0.01;
			mesh.rotation.y += 0.01;
		});
	}
}

@Component({
	selector: 'app-scene-graph',
	template: `
		<ngts-perspective-camera
			[options]="{
				makeDefault: true,
				position: [0, 0, 3],
				near: 0.01,
				far: 1000,
				fov: 75,
			}"
			(updated)="$event.lookAt(0, 0, 0)"
		/>

		<app-many-boxes />
	`,
	imports: [NgtsPerspectiveCamera, NgtsOrbitControls, Box, ManyBoxes],
	changeDetection: ChangeDetectionStrategy.OnPush,
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SceneGraph {
	protected readonly Math = Math;

	protected activeOne = signal(false);
	protected activeTwo = signal(false);

	constructor() {
		extend(THREE);
	}
}
