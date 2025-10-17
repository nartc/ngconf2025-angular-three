import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	DOCUMENT,
	effect,
	ElementRef,
	inject,
	signal,
	viewChild,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

@Component({
	selector: 'app-three-vanilla-canvas',
	template: `
		<canvas #canvas class="block h-full w-full"></canvas>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		class: 'block w-full h-full',
	},
})
export class ThreeVanillaCanvas {
	private readonly document = inject(DOCUMENT);
	private readonly destroyRef = inject(DestroyRef);
	private readonly canvasRef =
		viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

	private scene!: THREE.Scene;
	private camera!: THREE.PerspectiveCamera;
	private renderer!: THREE.WebGLRenderer;
	private cube!: THREE.Mesh;
	private raycaster!: THREE.Raycaster;
	private pointer = new THREE.Vector2();
	private controls!: OrbitControls;
	private resizeObserver?: ResizeObserver;

	private isHovered = signal(false);
	private isScaled = signal(false);
	private animationId?: number;

	private readonly cubeColor = computed(() =>
		this.isHovered() ? 'hotpink' : 'orange',
	);
	private readonly cubeScale = computed(() => (this.isScaled() ? 1.5 : 1));

	constructor() {
		afterNextRender(() => {
			this.initThree();
			this.setupEventListeners();
			this.animate();
		});

		effect(() => {
			const color = this.cubeColor();
			if (this.cube && this.cube.material) {
				(this.cube.material as THREE.MeshStandardMaterial).color.set(
					color,
				);
			}
		});

		effect(() => {
			const scale = this.cubeScale();
			if (this.cube) {
				this.cube.scale.set(scale, scale, scale);
			}
		});

		this.destroyRef.onDestroy(() => {
			if (this.animationId) {
				cancelAnimationFrame(this.animationId);
			}

			// Disconnect resize observer
			if (this.resizeObserver) {
				this.resizeObserver.disconnect();
			}

			// Clean up Three.js resources
			if (this.cube) {
				this.cube.geometry.dispose();
				(this.cube.material as THREE.Material).dispose();
			}
			if (this.renderer) {
				this.renderer.dispose();
			}
			if (this.controls) {
				this.controls.dispose();
			}
		});
	}

	private initThree(): void {
		const canvas = this.canvasRef().nativeElement;
		const rect = canvas.getBoundingClientRect();
		const width = rect.width || window.innerWidth;
		const height = rect.height || window.innerHeight;

		THREE.ColorManagement.enabled = true;

		// Scene
		this.scene = new THREE.Scene();

		// Camera
		this.camera = new THREE.PerspectiveCamera(
			75,
			width / height,
			0.1,
			1000,
		);
		this.camera.position.set(5, 5, 5);
		this.camera.lookAt(0, 0, 0);

		// Renderer
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		this.renderer.setClearAlpha(0);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.setSize(width, height, false);
		this.renderer.setPixelRatio(
			Math.min(this.document.defaultView?.devicePixelRatio || 1, 2),
		);

		// Cube
		const geometry = new THREE.BoxGeometry();
		const material = new THREE.MeshStandardMaterial({
			color: this.cubeColor(),
		});
		this.cube = new THREE.Mesh(geometry, material);
		this.scene.add(this.cube);

		// Lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		this.scene.add(ambientLight);
		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
		directionalLight.position.set(5, 5, 5);
		this.scene.add(directionalLight);

		// Grid
		const gridHelper = new THREE.GridHelper(10, 10);
		this.scene.add(gridHelper);

		// OrbitControls
		this.controls = new OrbitControls(this.camera, canvas);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;

		// Raycaster
		this.raycaster = new THREE.Raycaster();

		// Resize observer
		this.resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === canvas) {
					this.onWindowResize();
				}
			}
		});
		this.resizeObserver.observe(canvas);
	}

	private setupEventListeners(): void {
		const canvas = this.canvasRef().nativeElement;

		canvas.style.touchAction = 'none';

		const updatePointer = (event: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			this.pointer.y =
				-((event.clientY - rect.top) / rect.height) * 2 + 1;
		};

		canvas.addEventListener(
			'mousemove',
			(event) => {
				updatePointer(event);
				this.checkIntersection();
			},
			false,
		);

		canvas.addEventListener(
			'click',
			(event) => {
				updatePointer(event);

				this.raycaster.setFromCamera(this.pointer, this.camera);
				const intersects = this.raycaster.intersectObject(
					this.cube,
					false,
				);

				if (intersects.length > 0) {
					this.isScaled.update((current) => !current);
				}
			},
			false,
		);

		canvas.addEventListener(
			'mouseleave',
			() => {
				this.isHovered.set(false);
			},
			false,
		);
	}

	private checkIntersection(): void {
		if (!this.raycaster || !this.camera || !this.cube) return;

		this.raycaster.setFromCamera(this.pointer, this.camera);

		const intersects = this.raycaster.intersectObject(this.cube, false);
		const isIntersecting = intersects.length > 0;

		// Update hover state
		this.isHovered.set(isIntersecting);

		// Update cursor
		const canvas = this.canvasRef().nativeElement;
		canvas.style.cursor = isIntersecting ? 'grab' : 'pointer';
	}

	private animate = (): void => {
		this.animationId = requestAnimationFrame(this.animate);

		// Rotate cube
		this.cube.rotation.x += 0.01;
		this.cube.rotation.y += 0.01;

		// Update controls
		this.controls.update();

		// Render
		this.renderer.render(this.scene, this.camera);
	};

	private onWindowResize(): void {
		const canvas = this.canvasRef().nativeElement;
		const rect = canvas.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;

		// Only update if dimensions are valid
		if (width > 0 && height > 0) {
			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(width, height, false);
		}
	}
}
