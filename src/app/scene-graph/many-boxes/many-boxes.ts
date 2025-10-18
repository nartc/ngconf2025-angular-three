import {
	ChangeDetectionStrategy,
	Component,
	computed,
	CUSTOM_ELEMENTS_SCHEMA,
	effect,
	ElementRef,
	signal,
	viewChild,
} from '@angular/core';
import { beforeRender, checkUpdate, NgtArgs } from 'angular-three';
import { NgtpBloom, NgtpEffectComposer } from 'angular-three-postprocessing';
import { NgtsCameraControls } from 'angular-three-soba/controls';
import { fbo } from 'angular-three-soba/misc';
import * as THREE from 'three';

import fragmentShader from './fragment.glsl' with { loader: 'text' };
import { createQuadGeometry, createSimulationMaterial } from './utils';
import vertexShader from './vertex.glsl' with { loader: 'text' };

@Component({
	selector: 'app-many-boxes',
	template: `
		<ngt-color *args="['black']" attach="background" />
		<ngt-ambient-light [intensity]="Math.PI * 0.5" />

		<ngt-group #group>
			<ngt-instanced-mesh
				#instancedMesh
				*args="[undefined, undefined, INSTANCE_COUNT]"
				[frustumCulled]="false"
				[position]="[-1, -1, 0]"
			>
				<ngt-shader-material
					#shaderMaterial
					[uniforms]="uniforms"
					[vertexShader]="vertexShader"
					[fragmentShader]="fragmentShader"
				/>
				<ngt-box-geometry />
			</ngt-instanced-mesh>
		</ngt-group>

		<ngtp-effect-composer>
			<ngtp-bloom [options]="{ luminanceThreshold: 0, intensity: 2 }" />
		</ngtp-effect-composer>

		<ngts-camera-controls
			#cameraControls
			[options]="{ minDistance: 0.1, maxDistance: 10 }"
		/>
	`,
	imports: [NgtArgs, NgtpEffectComposer, NgtpBloom, NgtsCameraControls],
	changeDetection: ChangeDetectionStrategy.OnPush,
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	host: {
		'(window:keydown)': 'onKeydown($event)',
	},
})
export class ManyBoxes {
	protected readonly Math = Math;

	protected readonly SIZE = 256;
	protected readonly INSTANCE_COUNT = this.SIZE * this.SIZE;

	protected readonly vertexShader = vertexShader;
	protected readonly fragmentShader = fragmentShader;

	private groupRef = viewChild.required<ElementRef<THREE.Group>>('group');
	private instancedMeshRef =
		viewChild<ElementRef<THREE.InstancedMesh>>('instancedMesh');
	private shaderMaterialRef =
		viewChild<ElementRef<THREE.ShaderMaterial>>('shaderMaterial');

	// not a signal because we're updating this in a loop
	private animationProgress = 0;
	private animationState = signal<'cube' | 'animating' | 'logo' | 'animating-thanks' | 'thanks'>('cube');
	private isAnimating = computed(() => this.animationState() === 'animating' || this.animationState() === 'animating-thanks');

	protected uniforms = {
		uPositions: { value: null },
		uScale: { value: 0.006 },
	};

	private virtualScene = new THREE.Scene();
	private virtualCamera = new THREE.OrthographicCamera(
		-1,
		1,
		1,
		-1,
		1 / Math.pow(2, 53),
		1,
	);

	private renderTarget = fbo(() => ({
		width: this.SIZE,
		height: this.SIZE,
		settings: {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			stencilBuffer: false,
			type: THREE.FloatType,
		},
	}));

	private simulationMaterial = createSimulationMaterial(this.SIZE);
	private quadGeometry = createQuadGeometry();
	private virtualMesh = new THREE.Mesh(
		this.quadGeometry,
		this.simulationMaterial,
	);

	constructor() {
		beforeRender(({ clock, gl, delta }) => {
			const shaderMaterial = this.shaderMaterialRef()?.nativeElement;
			const instancedMesh = this.instancedMeshRef()?.nativeElement;
			if (!shaderMaterial || !instancedMesh) return;

			// Determine animation phase: 0 for cube→logo, 1 for logo→thanks
			const currentState = this.animationState();
			const animationPhase =
				currentState === 'animating-thanks' || currentState === 'thanks' ? 1 : 0;

			this.simulationMaterial.uniforms['uFrequency'].value = 0.5;
			this.simulationMaterial.uniforms['uTime'].value = clock.elapsedTime;
			this.simulationMaterial.uniforms['uIsAnimating'].value =
				this.isAnimating();
			this.simulationMaterial.uniforms['uAnimationProgress'].value =
				this.animationProgress;
			this.simulationMaterial.uniforms['uAnimationPhase'].value = animationPhase;

			const currentRenderTarget = gl.getRenderTarget();
			gl.setRenderTarget(this.renderTarget);
			gl.clear();
			gl.render(this.virtualScene, this.virtualCamera);
			gl.setRenderTarget(currentRenderTarget);

			shaderMaterial.uniforms['uPositions'].value =
				this.renderTarget.texture;

			// Smooth position transition for THANK YOU centering
			const startPos = new THREE.Vector3(-1, -1, 0);
			const thanksPos = new THREE.Vector3(0, -1, 0); // Centered position for THANK YOU

			if (currentState === 'animating-thanks') {
				// Smoothly lerp to centered position during animation
				const smoothProgress = THREE.MathUtils.smoothstep(this.animationProgress, 0, 1);
				instancedMesh.position.lerpVectors(startPos, thanksPos, smoothProgress);
			} else if (currentState === 'thanks') {
				// Hold at centered position
				instancedMesh.position.copy(thanksPos);
			} else {
				// Default position for cube and logo states
				instancedMesh.position.copy(startPos);
			}

			this.groupRef().nativeElement.rotation.y += delta * 0.05;
		});

		beforeRender(({ delta }) => {
			const currentState = this.animationState();
			if (currentState !== 'animating' && currentState !== 'animating-thanks') return;

			this.animationProgress += delta / 5; // 5s
			if (this.animationProgress < 1) return;

			// Set final state based on which animation just completed
			this.animationState.set(currentState === 'animating' ? 'logo' : 'thanks');
			this.animationProgress = 1;
		});

		effect((onCleanup) => {
			this.virtualScene.add(this.virtualMesh);
			onCleanup(() => this.virtualScene.remove(this.virtualMesh));
		});

		effect(() => {
			const instancedMesh = this.instancedMeshRef()?.nativeElement;
			if (!instancedMesh) return;

			const matrix = new THREE.Matrix4();

			for (let i = 0; i < this.INSTANCE_COUNT; i++) {
				matrix.setPosition(0, 0, 0);
				instancedMesh.setMatrixAt(i, matrix);
			}

			checkUpdate(instancedMesh.instanceMatrix);
		});
	}

	onKeydown($event: KeyboardEvent) {
		if ($event.code !== 'Space') return;

		$event.preventDefault();
		const currentState = this.animationState();
		if (currentState === 'cube') {
			this.animationState.set('animating');
		} else if (currentState === 'logo') {
			this.animationProgress = 0; // Reset progress for second animation
			this.animationState.set('animating-thanks');
		}
	}
}
