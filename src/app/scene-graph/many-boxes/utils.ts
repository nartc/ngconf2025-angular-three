import * as THREE from 'three';
import shapesJson from './shapes.json';

console.log(shapesJson);

function generateRandomPointInTriangle(...vertices: THREE.Vector3[]) {
	const [v1, v2, v3] = vertices;
	const r1 = Math.random();
	const r2 = Math.random();
	const r3 = Math.random();
	const sum = r1 + r2 + r3;

	return new THREE.Vector3()
		.addScaledVector(v1, r1 / sum)
		.addScaledVector(v2, r2 / sum)
		.addScaledVector(v3, r3 / sum);
}

function createGeometryFromCurve(
	curveData: (typeof shapesJson)[keyof typeof shapesJson],
) {
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		'position',
		new THREE.Float32BufferAttribute(
			curveData.data.attributes.position.array,
			3,
		),
	);
	geometry.setAttribute(
		'normal',
		new THREE.Float32BufferAttribute(
			curveData.data.attributes.normal.array,
			3,
		),
	);
	geometry.setAttribute(
		'uv',
		new THREE.Float32BufferAttribute(curveData.data.attributes.uv.array, 2),
	);
	geometry.setIndex(
		new THREE.Uint16BufferAttribute(curveData.data.index.array, 1),
	);
	return geometry;
}

function createCubePositions(size: number) {
	const data = new Float32Array(size * size * 4);
	const gridSize = Math.cbrt(size * size); // Calculate cube root for grid dimensions
	const actualGridSize = Math.ceil(gridSize); // Round up to ensure we have enough positions
	const spacing = 0.15; // Distance between boxes

	let index = 0;
	for (let x = 0; x < actualGridSize && index < size * size; x++) {
		for (let y = 0; y < actualGridSize && index < size * size; y++) {
			for (let z = 0; z < actualGridSize && index < size * size; z++) {
				const i = index * 4;

				// Center the cube around origin
				data[i] = (x - actualGridSize / 2) * spacing;
				data[i + 1] = (y - actualGridSize / 2) * spacing;
				data[i + 2] = (z - actualGridSize / 2) * spacing;
				data[i + 3] = 1.0;

				index++;
			}
		}
	}

	return data;
}

function createLogoPositions(size: number) {
	const data = new Float32Array(size * size * 4);
	const curves = [
		shapesJson.curve,
		shapesJson.curveTwo,
		shapesJson.curveThree,
		shapesJson.curveFour,
	];

	const scale = 8;
	const baseRotation = new THREE.Euler(Math.PI / 2, 0, 0);
	const positions = Array(4).fill(new THREE.Vector3(0, 0, 0));

	for (let i = 0; i < data.length; i += 4) {
		const shapeIndex = Math.floor((i / data.length) * curves.length);
		const curveData = curves[shapeIndex];

		const matrix = new THREE.Matrix4()
			.makeRotationFromEuler(baseRotation)
			.setPosition(positions[shapeIndex])
			.scale(new THREE.Vector3(scale, scale, scale));

		const geometry = createGeometryFromCurve(curveData);
		const positionsArr = geometry.attributes['position'].array;
		const indices = curveData.data.index.array;

		const triangleIndex =
			Math.floor(Math.random() * (indices.length / 3)) * 3;

		const vertices = [0, 1, 2].map((offset) => {
			const idx = indices[triangleIndex + offset] * 3;
			return new THREE.Vector3(
				positionsArr[idx],
				positionsArr[idx + 1],
				positionsArr[idx + 2],
			);
		});

		const pos = generateRandomPointInTriangle(...vertices);
		pos.applyMatrix4(matrix);

		data[i] = pos.x;
		data[i + 1] = pos.y;
		data[i + 2] = pos.z;
		data[i + 3] = 1.0;
	}

	return data;
}

export function createSimulationMaterial(size: number) {
	// Create cube grid positions as starting point
	const cubeData = createCubePositions(size);
	const logoData = createLogoPositions(size);

	// Create textures for all three states
	const cubeTexture = new THREE.DataTexture(
		cubeData,
		size,
		size,
		THREE.RGBAFormat,
		THREE.FloatType,
	);
	cubeTexture.needsUpdate = true;

	const logoTexture = new THREE.DataTexture(
		logoData,
		size,
		size,
		THREE.RGBAFormat,
		THREE.FloatType,
	);
	logoTexture.needsUpdate = true;

	// Start with cube positions as current positions
	const positionsTexture = cubeTexture.clone();

	const simulationVertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

	const simulationFragmentShader = `
        uniform sampler2D positions;
        uniform sampler2D cubePositions;
        uniform sampler2D logoPositions;
        uniform float uTime;
        uniform float uFrequency;
        uniform float uAnimationProgress;
        uniform bool uIsAnimating;
        varying vec2 vUv;

        // Simplex noise implementation
        vec3 mod289(vec3 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 mod289(vec4 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 permute(vec4 x) {
            return mod289(((x * 34.0) + 1.0) * x);
        }

        vec4 taylorInvSqrt(vec4 r) {
            return 1.79284291400159 - 0.85373472095314 * r;
        }

        float snoise(vec3 v) {
            const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

            vec3 i = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);

            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);

            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;

            i = mod289(i);
            vec4 p = permute(permute(permute(
                            i.z + vec4(0.0, i1.z, i2.z, 1.0))
                            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;

            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);

            vec4 x = x_ * ns.x + ns.yyyy;
            vec4 y = y_ * ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);

            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);

            vec4 s0 = floor(b0) * 2.0 + 1.0;
            vec4 s1 = floor(b1) * 2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));

            vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);

            vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;

            vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
        }

        vec3 snoiseVec3(vec3 x) {
            float s = snoise(vec3(x));
            float s1 = snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2));
            float s2 = snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4));
            return vec3(s, s1, s2);
        }

        vec3 curlNoise(vec3 p) {
            const float e = .1;
            vec3 dx = vec3(e, 0.0, 0.0);
            vec3 dy = vec3(0.0, e, 0.0);
            vec3 dz = vec3(0.0, 0.0, e);

            vec3 p_x0 = snoiseVec3(p - dx);
            vec3 p_x1 = snoiseVec3(p + dx);
            vec3 p_y0 = snoiseVec3(p - dy);
            vec3 p_y1 = snoiseVec3(p + dy);
            vec3 p_z0 = snoiseVec3(p - dz);
            vec3 p_z1 = snoiseVec3(p + dz);

            float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
            float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
            float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

            const float divisor = 1.0 / (2.0 * e);
            return normalize(vec3(x, y, z) * divisor);
        }

        void main() {
            vec3 cubePos = texture2D(cubePositions, vUv).rgb;
            vec3 logoPos = texture2D(logoPositions, vUv).rgb;

            vec3 finalPos;

            if (!uIsAnimating && uAnimationProgress == 0.0) {
                // Static cube formation - initial state
                finalPos = cubePos;
            } else if (!uIsAnimating && uAnimationProgress >= 1.0) {
                // Static logo formation - final state
                finalPos = logoPos;
            } else {
                // Animation in progress - smooth continuous transition

                // Create smooth time progression that starts gradually
                float animTime = uTime * 0.1 * smoothstep(0.0, 0.15, uAnimationProgress);

                // Calculate curl noise with smoother time progression
                vec3 noise1 = curlNoise(cubePos * uFrequency + animTime) * 0.3;
                vec3 noise2 = curlNoise(cubePos * uFrequency * 2.5 + animTime * 0.6) * 0.2;

                // Ultra-smooth intensity curves with extended ramp
                float noiseIntensity;
                float logoMixFactor;

                if (uAnimationProgress < 0.7) {
                    // Extended smooth ramp up with double smoothstep for ultra-smooth start
                    float rampProgress = uAnimationProgress / 0.7;
                    float ultraSmooth = smoothstep(0.0, 1.0, smoothstep(0.0, 1.0, rampProgress));
                    noiseIntensity = ultraSmooth * 0.8;
                    logoMixFactor = 0.0;
                } else {
                    // Final phase - smooth transition to logo
                    float logoProgress = (uAnimationProgress - 0.7) / 0.3;
                    float smoothLogoProgress = smoothstep(0.0, 1.0, logoProgress);

                    noiseIntensity = 0.8 * (1.0 - smoothLogoProgress);
                    logoMixFactor = smoothstep(0.0, 1.0, smoothLogoProgress);
                }

                // Apply noise with guaranteed smooth intensity
                vec3 noisyPos = cubePos + noise1 * noiseIntensity + noise2 * (noiseIntensity * 0.5);

                // Final smooth blend to logo position
                finalPos = mix(noisyPos, logoPos, logoMixFactor);
            }

            gl_FragColor = vec4(finalPos, 1.0);
        }
    `;

	return new THREE.ShaderMaterial({
		uniforms: {
			positions: { value: positionsTexture },
			cubePositions: { value: cubeTexture },
			logoPositions: { value: logoTexture },
			uFrequency: { value: 0.5 },
			uTime: { value: 0 },
			uAnimationProgress: { value: 0.0 }, // 0 = start, 1 = complete
			uIsAnimating: { value: false },
		},
		vertexShader: simulationVertexShader,
		fragmentShader: simulationFragmentShader,
	});
}

export function createQuadGeometry() {
	const geometry = new THREE.BufferGeometry();
	const positions = new Float32Array([
		-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
	]);
	const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]);

	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

	return geometry;
}
