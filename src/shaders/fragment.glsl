precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

varying vec2 vUv;

// Simplex-style noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float f = 0.0;
  float w = 0.5;
  for (int i = 0; i < 5; i++) {
    f += w * snoise(p);
    p *= 2.0;
    w *= 0.5;
  }
  return f;
}

void main() {
  vec2 uv = vUv;
  float t = uTime * 0.25;

  // Mouse influence
  vec2 mouse = uMouse;
  float mouseDist = length(uv - mouse);
  float mouseInfluence = smoothstep(0.4, 0.0, mouseDist);

  // Flowing water layers
  vec2 p = uv * 3.0;

  // Layer 1 - large flow
  float n1 = fbm(p + vec2(t * 0.3, t * 0.1));

  // Layer 2 - medium detail
  float n2 = fbm(p * 1.8 + vec2(-t * 0.2, t * 0.15) + n1 * 0.5);

  // Layer 3 - fine detail
  float n3 = fbm(p * 3.5 + vec2(t * 0.1, -t * 0.2) + n2 * 0.3);

  // Mouse ripple
  float ripple = sin(mouseDist * 30.0 - uTime * 4.0) * mouseInfluence * 0.15;

  // Combine into water height
  float water = n1 * 0.5 + n2 * 0.3 + n3 * 0.2 + ripple;

  // Derive normals from height for lighting
  float eps = 0.005;
  float hL = fbm((uv + vec2(-eps, 0.0)) * 3.0 + vec2(t * 0.3, t * 0.1));
  float hR = fbm((uv + vec2(eps, 0.0)) * 3.0 + vec2(t * 0.3, t * 0.1));
  float hU = fbm((uv + vec2(0.0, eps)) * 3.0 + vec2(t * 0.3, t * 0.1));
  float hD = fbm((uv + vec2(0.0, -eps)) * 3.0 + vec2(t * 0.3, t * 0.1));
  vec2 normal = vec2(hL - hR, hU - hD) * 8.0;

  // Water colors - cyan/teal palette
  vec3 deep = vec3(0.01, 0.12, 0.20);
  vec3 mid = vec3(0.04, 0.30, 0.42);
  vec3 shallow = vec3(0.15, 0.55, 0.65);
  vec3 highlight = vec3(0.45, 0.85, 0.92);
  vec3 foam = vec3(0.85, 0.95, 1.0);

  // Color based on water height and normals
  float lighting = dot(normalize(vec3(normal, 1.0)), normalize(vec3(0.3, 0.5, 1.0)));
  lighting = lighting * 0.5 + 0.5;

  vec3 color = mix(deep, mid, smoothstep(-0.3, 0.2, water));
  color = mix(color, shallow, smoothstep(0.2, 0.6, water) * lighting);
  color = mix(color, highlight, smoothstep(0.6, 0.9, water) * lighting);

  // Specular highlights
  float spec = pow(max(0.0, lighting), 16.0) * smoothstep(0.3, 0.8, water);
  color += highlight * spec * 0.5;

  // Foam on peaks
  float foamAmount = smoothstep(0.65, 0.85, water + ripple * 0.5);
  color = mix(color, foam, foamAmount * 0.3);

  // Subtle color variation
  color += vec3(0.02, 0.0, 0.03) * sin(water * 6.0 + t);

  // Vignette
  float vig = 1.0 - length((uv - 0.5) * 1.1);
  color *= smoothstep(0.0, 0.6, vig);

  gl_FragColor = vec4(color, 1.0);
}
