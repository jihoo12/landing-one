import './style.css'
import * as THREE from 'three'
import vertexShader from './shaders/vertex.glsl?raw'
import fragmentShader from './shaders/fragment.glsl?raw'

// Scene setup
const canvas = document.getElementById('water-canvas') as HTMLCanvasElement
const scene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Water shader quad
const uniforms = {
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
}

const waterGeometry = new THREE.PlaneGeometry(2, 2)
const waterMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
})
const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial)
scene.add(waterMesh)

// Particle system - bubbles and water debris
const particleCount = 80
const particleGeometry = new THREE.BufferGeometry()
const positions = new Float32Array(particleCount * 3)
const speeds = new Float32Array(particleCount)
const sizes = new Float32Array(particleCount)
const offsets = new Float32Array(particleCount)

for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 2
  positions[i * 3 + 1] = (Math.random() - 0.5) * 2
  positions[i * 3 + 2] = 0
  speeds[i] = 0.2 + Math.random() * 0.6
  sizes[i] = 2.0 + Math.random() * 4.0
  offsets[i] = Math.random() * Math.PI * 2
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
particleGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
particleGeometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1))

const particleMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float aSize;
    attribute float aSpeed;
    attribute float aOffset;
    uniform float uTime;
    varying float vAlpha;
    varying float vEdge;

    void main() {
      vec3 pos = position;

      // Float upward with wave motion
      pos.y += mod(uTime * aSpeed * 0.15, 2.4) - 1.2;
      pos.x += sin(uTime * 0.5 + aOffset + pos.y * 2.0) * 0.04;

      vAlpha = smoothstep(-1.2, -0.6, pos.y) * smoothstep(1.2, 0.6, pos.y);
      vAlpha *= 0.25 + 0.15 * sin(uTime + aOffset);

      // Edge glow for bubble feel
      vec2 center = (gl_Position.xy / gl_Position.w) * 0.5 + 0.5;

      gl_Position = vec4(pos, 0.0, 1.0);
      gl_PointSize = aSize * min(uResolution.x / 600.0, 2.0);
      vEdge = 1.0;
    }
  `,
  fragmentShader: `
    precision highp float;
    varying float vAlpha;
    varying float vEdge;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);

      // Bubble: bright edge, transparent center
      float ring = smoothstep(0.5, 0.3, d) - smoothstep(0.3, 0.15, d);
      float core = smoothstep(0.5, 0.0, d) * 0.3;

      float alpha = (ring * 0.6 + core) * vAlpha;
      vec3 color = mix(vec3(0.5, 0.85, 1.0), vec3(0.85, 0.98, 1.0), ring);

      gl_FragColor = vec4(color, alpha);
    }
  `,
  uniforms: {
    uTime: uniforms.uTime,
    uResolution: uniforms.uResolution,
  },
  transparent: true,
  depthWrite: false,
})

const particles = new THREE.Points(particleGeometry, particleMaterial)
scene.add(particles)

// Mouse tracking
const mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 }

window.addEventListener('mousemove', (e) => {
  mouse.targetX = e.clientX / window.innerWidth
  mouse.targetY = 1.0 - e.clientY / window.innerHeight
})

window.addEventListener('touchmove', (e) => {
  const touch = e.touches[0]
  mouse.targetX = touch.clientX / window.innerWidth
  mouse.targetY = 1.0 - touch.clientY / window.innerHeight
})

// Resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
})

// Animation loop
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)

  const elapsed = clock.getElapsedTime()
  uniforms.uTime.value = elapsed

  // Smooth mouse interpolation
  mouse.x += (mouse.targetX - mouse.x) * 0.03
  mouse.y += (mouse.targetY - mouse.y) * 0.03
  uniforms.uMouse.value.set(mouse.x, mouse.y)

  renderer.render(scene, camera)
}

animate()
