# Angular and THREE.js: NGConf 2025

---

# Angular and THREE.js

## An actual match made in heaven

---

# Angular and THREE.js

## An actual match made in heaven

## ...with the right match maker

---

# Chau Tran

## Angular GDE • Nx Team

### github.com/nartc

### nartc.me

---

# Chau Tran

## Angular GDE • Nx Team

### github.com/nartc

### nartc.me

_(nartc == ctran.split('').reverse().join(''))_

---

# Today we're going to discover

---

# Today we're going to discover

- Custom Angular Renderer API

---

# Today we're going to discover

- Custom Angular Renderer API

- Declarative THREE.js with Angular

---

# Today we're going to discover

- Custom Angular Renderer API

- Declarative THREE.js with Angular

- ...and maybe your own discovery of the possibilities

---

# Demo (vanilla THREE.js)

---

## So that wasn't very bad actually

---

## So that wasn't very bad actually

- Setup is already done

---

## So that wasn't very bad actually

- Setup is already done
- `class Box extends THREE.Mesh`

---

## So that wasn't very bad actually

- Setup is already done
- `class Box extends THREE.Mesh`
- ...but I think we can do better...

---

# Demo

---

## THREE.js main building blocks

---

## THREE.js main building blocks

```html
<canvas></canvas>
```

---

## THREE.js main building blocks

```html
<canvas></canvas>
```

```typescript
this.scene = new THREE.Scene();
this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
// ... more config
```

---

## THREE.js main building blocks

```html
<canvas></canvas>
```

```typescript
this.scene = new THREE.Scene();
this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
// ... more config
```

but with the right abstraction

```html
<ngt-canvas></ngt-canvas>
```

---

## and a bit more setup

---

## and a bit more setup

### Raycasting for pointer events

```typescript
this.raycaster = new THREE.Raycaster();
this.raycaster.setFromCamera(this.pointer, this.camera);
const intersects = this.raycaster.intersectObject(this.cube, false);
```

---

## and a bit more setup

### Raycasting for pointer events

```typescript
this.raycaster = new THREE.Raycaster();
this.raycaster.setFromCamera(this.pointer, this.camera);
const intersects = this.raycaster.intersectObject(this.cube, false);
```

### Window resize

```typescript
this.resizeObserver = new ResizeObserver((entries) => {
  // Update camera aspect + renderer size
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(width, height, false);
});
```

---

## and a bit more setup

### Raycasting for pointer events

```typescript
this.raycaster = new THREE.Raycaster();
this.raycaster.setFromCamera(this.pointer, this.camera);
const intersects = this.raycaster.intersectObject(this.cube, false);
```

### Window resize

```typescript
this.resizeObserver = new ResizeObserver((entries) => {
  // Update camera aspect + renderer size
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(width, height, false);
});
```

### Animation loop

```typescript
private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
};
```

---

## and a bit more setup

### Raycasting for pointer events

```typescript
this.raycaster = new THREE.Raycaster();
this.raycaster.setFromCamera(this.pointer, this.camera);
const intersects = this.raycaster.intersectObject(this.cube, false);
```

### Window resize

```typescript
this.resizeObserver = new ResizeObserver((entries) => {
  // Update camera aspect + renderer size
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(width, height, false);
});
```

### Animation loop

```typescript
private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
};
```

but again, with the right abstraction

```html
<ngt-canvas></ngt-canvas>
```

---

## The demo scene graph

---

## The demo scene graph

the cube

```typescript
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial({ color: this.cubeColor() });
this.cube = new THREE.Mesh(geometry, material);
this.scene.add(this.cube);

effect(() => {
  // react to events
  // change cube color
});
```

---

## The demo scene graph

the lighting

```typescript
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
this.scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
directionalLight.position.set(5, 5, 5);
this.scene.add(directionalLight);
```

---

## The demo scene graph

the grid

```typescript
const gridHelper = new THREE.GridHelper(10, 10);
this.scene.add(gridHelper);
```

---

## The demo scene graph

with the power of Angular template

---

## The demo scene graph

with the power of Angular template

the cube

```html
<ngt-mesh
  [scale]="active() ? 1.5 : 1"
  (click)="active.set(!active())"
  (pointerover)="hover.set(true)"
  (pointerout)="hover.set(false)"
>
  <ngt-box-geometry />
  <ngt-mesh-standard-material [color]="hover() ? 'hotpink' : 'orange'" />
</ngt-mesh>
```

---

## The demo scene graph

with the power of Angular template

the lighting

```html
<ngt-ambient-light [intensity]="Math.PI * 0.6" />
<ngt-directional-light [intensity]="Math.PI * 0.4" [position]="5" />
```

---

## The demo scene graph

with the power of Angular template

the grid

```html
<ngt-grid-helper />
```

---

## So...how does it work?

---

## So...how does it work?

```html
<ngt-mesh></ngt-mesh>
```

---

## So...how does it work?

```html
<ngt-mesh></ngt-mesh>
```

Angular calls the Renderer with

```typescript
RENDERER.createElement("ngt-mesh");
```

---

## So...how does it work?

```html
<ngt-mesh></ngt-mesh>
```

Angular calls the Renderer with

```typescript
RENDERER.createElement("ngt-mesh");
```

- `ngt-mesh` --> `new THREE.Mesh()`

---

## So...how does it work?

- `ngt-mesh` --> `new THREE.Mesh()`
- `ngt-box-geometry` --> `new THREE.BoxGeometry()`
- `ngt-mesh-standard-material` --> `new THREE.MeshStandardMaterial()`

...

---

## So...how does it work?

Bindings

`[color]="color() ? 'hotpink' : 'orange'"`

---

## So...how does it work?

Bindings

`[color]="color() ? 'hotpink' : 'orange'"`

Angular calls the Renderer with

```typescript
RENDERER.setProperty(theElement, "color", value);
```

---

## So...how does it work?

Bindings

`(pointerover)="hover.set(true)"`

Angular calls the Renderer with

```typescript
RENDERER.listen(theElement, "pointerover", theCallback);
```

---

## So...how does it work?

Hierarchy

```html
<ngt-mesh>
  <ngt-box-geometry />
</ngt-mesh>
```

Angular calls the Renderer with

```typescript
RENDERER.createElement("ngt-mesh");
RENDERER.createElement("ngt-box-geometry");
RENDERER.appendChild(theParentMesh, theChildBoxGeometry);
```

---

## So...how does it work?

> Angular does all the work, basically.

---

## But...there's more

---

## Closing

---

## Closing

- Angular Core is agnostic

---

## Closing

- Angular Core is agnostic
- Angular Renderer is awesome

---

## Closing

- Angular Core is agnostic
- Angular Renderer is awesome
- Angular Renderer can be provided in 3 places: app bootstrap, route provider, and `createComponent`

---

## Closing

- Angular Core is agnostic
- Angular Renderer is awesome
- Angular Renderer can be provided in 3 places: app bootstrap, route provider, and `createComponent`

> "but Chau, no one wants to look at some boxes"

---
