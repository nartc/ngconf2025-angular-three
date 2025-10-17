uniform sampler2D uPositions;
uniform float uScale;

varying vec3 vPosition;
varying vec3 vNormal;

void main() {
    // Get instance position from FBO texture
    vec2 uv = vec2(
        mod(float(gl_InstanceID), 256.0) / 256.0,
        floor(float(gl_InstanceID) / 256.0) / 256.0
    );

    vec3 instancePos = texture2D(uPositions, uv).xyz;
    vPosition = instancePos;

    // Apply instance transformation to vertex position
    vec3 transformed = position * uScale + instancePos;

    // Calculate normal for lighting
    vNormal = normalMatrix * normal;

    vec4 modelPosition = modelMatrix * vec4(transformed, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;

    gl_Position = projectionMatrix * viewPosition;
}
