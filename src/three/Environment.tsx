// Light, sky and air per chapter: golden morning meadow → bright village → misty river →
// warm late-afternoon workshop → dusk with stars at the summit. Moods blend smoothly.
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { boat, camState, player } from '../lib/actors'
import { runtime, useStore } from '../store'
import { chapterOf } from '../story/machine'
import { riverMat, pollenMat } from './Terrain'
import { crossing } from './Boat'
import { windUniforms } from './materials'

type Mood = { zen: string; hor: string; sun: string; sunI: number; hemi: number; fog: string; near: number; far: number; elev: number; azim: number; exposure: number; pollen: number; cloud: number }
const MOODS: Record<string, Mood> = {
  morning: { zen: '#8fb4d2', hor: '#f8dcb2', sun: '#ffd49a', sunI: 2.9, hemi: 1.2, fog: '#f1dcbc', near: 45, far: 210, elev: 0.36, azim: 2.4, exposure: 1.12, pollen: 1, cloud: 0.6 },
  village: { zen: '#82aedb', hor: '#f3e6cc', sun: '#fff0d6', sunI: 3.0, hemi: 1.3, fog: '#ece3d0', near: 55, far: 220, elev: 0.62, azim: 2.0, exposure: 1.1, pollen: 0.6, cloud: 0.7 },
  river: { zen: '#9fb2bf', hor: '#dfe3df', sun: '#f4ecdf', sunI: 1.8, hemi: 1.15, fog: '#d9dfdc', near: 8, far: 62, elev: 0.5, azim: 1.6, exposure: 1.06, pollen: 0.2, cloud: 0.9 },
  workshop: { zen: '#7f9fc0', hor: '#f1d2a8', sun: '#ffcf94', sunI: 2.6, hemi: 1.05, fog: '#e2ccac', near: 35, far: 170, elev: 0.32, azim: 1.0, exposure: 1.08, pollen: 0.4, cloud: 0.6 },
  summit: { zen: '#7290b8', hor: '#f5c99c', sun: '#ffc189', sunI: 2.5, hemi: 1.0, fog: '#e8c6a2', near: 60, far: 240, elev: 0.22, azim: 0.6, exposure: 1.02, pollen: 0.5, cloud: 0.5 },
  dusk: { zen: '#1f2a46', hor: '#d9876a', sun: '#ff9a6a', sunI: 0.9, hemi: 0.55, fog: '#5d5368', near: 50, far: 230, elev: 0.04, azim: 0.4, exposure: 1.0, pollen: 1.2, cloud: 0.35 },
}
const C = (h: string) => new THREE.Color(h)
const cur = { zen: C('#8fb0c9'), hor: C('#f6d9b0'), sun: C('#ffd9a6'), fog: C('#efd6b4'), sunI: 2.5, hemi: 1.05, near: 30, far: 150, elev: 0.32, azim: 2.4, exposure: 1.05, pollen: 1, cloud: 0.6, stars: 0 }
export const sky = cur
export const sunDir = new THREE.Vector3(0.4, 0.5, 0.6).normalize()

function targetMood(): Mood {
  const s = useStore.getState()
  const ch = chapterOf(s.story.beat)
  const name = ch <= 2 ? 'morning' : ch <= 4 ? 'village' : ch === 5 ? 'river' : ch === 6 ? 'workshop' : 'summit'
  let m = MOODS[name]
  // the crossing: mist thickens mid-river, then lifts on the far bank
  if (ch === 5 && player.mode === 'boat') {
    const k = Math.sin(Math.min(1, crossing.progress) * Math.PI)
    m = { ...m, near: THREE.MathUtils.lerp(16, 6, k), far: THREE.MathUtils.lerp(80, 46, k) }
  }
  if (runtime.dusk > 0) m = lerpMood(m, MOODS.dusk, runtime.dusk)
  return m
}
function lerpMood(a: Mood, b: Mood, t: number): Mood {
  const L = THREE.MathUtils.lerp
  const lc = (x: string, y: string) => '#' + C(x).lerp(C(y), t).getHexString()
  return {
    zen: lc(a.zen, b.zen), hor: lc(a.hor, b.hor), sun: lc(a.sun, b.sun), fog: lc(a.fog, b.fog), sunI: L(a.sunI, b.sunI, t), hemi: L(a.hemi, b.hemi, t),
    near: L(a.near, b.near, t), far: L(a.far, b.far, t), elev: L(a.elev, b.elev, t), azim: L(a.azim, b.azim, t), exposure: L(a.exposure, b.exposure, t), pollen: L(a.pollen, b.pollen, t), cloud: L(a.cloud, b.cloud, t),
  }
}

export function Sky() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: new THREE.Vector3() }, uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() }, uStars: { value: 0 }, uCloud: { value: 0.6 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun, uZenith, uHorizon, uSunCol; uniform float uStars, uCloud, uTime;
      varying vec3 vDir;
      float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uZenith, smoothstep(-0.02, 0.55, h));
        col = mix(col, uHorizon * 0.95, smoothstep(0.0, -0.3, h));
        float sun = max(dot(d, uSun), 0.0);
        col += uSunCol * (pow(sun, 8.0) * 0.25 + pow(sun, 80.0) * 0.35 + pow(sun, 1200.0) * 1.6);
        // soft painterly clouds
        vec2 cp = d.xz / max(h + 0.18, 0.05) * 1.1 + vec2(uTime * 0.006, 0.0);
        float cl = smoothstep(0.52, 0.78, fbm(cp)) * smoothstep(0.02, 0.25, h) * uCloud;
        vec3 cloudCol = mix(uHorizon * 1.08, vec3(1.0, 0.97, 0.92), 0.5) + uSunCol * pow(sun, 4.0) * 0.3;
        col = mix(col, cloudCol, cl * 0.75);
        vec3 cell = floor(d * 300.0);
        float star = step(0.9965, hash(cell)) * (0.5 + 0.5 * hash(cell + 7.0));
        col += star * vec3(1.0, 0.95, 0.88) * uStars * smoothstep(0.05, 0.35, h) * (1.0 - cl);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }), [])
  const mesh = useRef<THREE.Mesh>(null)
  useFrame(({ camera }, dt) => {
    mesh.current?.position.copy(camera.position)
    mat.uniforms.uSun.value.copy(sunDir)
    mat.uniforms.uZenith.value.copy(cur.zen)
    mat.uniforms.uHorizon.value.copy(cur.hor)
    mat.uniforms.uSunCol.value.copy(cur.sun)
    mat.uniforms.uStars.value = cur.stars
    mat.uniforms.uCloud.value = cur.cloud
    mat.uniforms.uTime.value += dt
  })
  return (
    <mesh ref={mesh} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[600, 48, 24]} />
    </mesh>
  )
}

export function Lighting() {
  const light = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const target = useMemo(() => new THREE.Object3D(), [])
  const fog = useMemo(() => new THREE.Fog('#efd6b4', 30, 150), [])
  useFrame((_, dt) => {
    const s = useStore.getState()
    windUniforms.uTime.value += dt
    scene.fog = fog
    const L = light.current
    if (!L) return
    const inside = s.place === 'home'
    const m = targetMood()
    const k = 1 - Math.exp(-1.2 * dt)
    cur.zen.lerp(C(m.zen), k); cur.hor.lerp(C(m.hor), k); cur.sun.lerp(C(m.sun), k); cur.fog.lerp(C(m.fog), k)
    const D = (a: number, b: number) => THREE.MathUtils.lerp(a, b, k)
    cur.sunI = D(cur.sunI, m.sunI); cur.hemi = D(cur.hemi, m.hemi); cur.near = D(cur.near, m.near); cur.far = D(cur.far, m.far)
    cur.elev = D(cur.elev, m.elev); cur.azim = D(cur.azim, m.azim); cur.exposure = D(cur.exposure, m.exposure); cur.pollen = D(cur.pollen, m.pollen); cur.cloud = D(cur.cloud, m.cloud)
    cur.stars = runtime.dusk
    sunDir.set(Math.cos(cur.elev) * Math.sin(cur.azim), Math.sin(cur.elev), Math.cos(cur.elev) * Math.cos(cur.azim)).normalize()
    // shadows follow whatever the camera is looking at
    const focus = inside ? player.pos : camState.cine ? camState.look : player.mode === 'boat' ? boat.pos : player.pos
    const far = camState.cine ? 46 : 26
    L.position.copy(focus).addScaledVector(inside ? new THREE.Vector3(-0.35, 0.8, -0.5).normalize() : sunDir, 60)
    target.position.copy(focus)
    target.updateMatrixWorld()
    const sc = L.shadow.camera
    const size = inside ? 6 : far
    if (sc.right !== size) { sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.updateProjectionMatrix() }
    L.color.copy(inside ? C('#ffe3c4') : cur.sun)
    L.intensity = inside ? 1.1 : cur.sunI * Math.min(1, cur.elev * 6 + 0.3)
    if (hemi.current) {
      hemi.current.intensity = inside ? 0.7 : cur.hemi
      hemi.current.color.copy(cur.zen).lerp(C('#ffffff'), 0.55)
      hemi.current.groundColor.copy(cur.fog).multiplyScalar(0.7)
    }
    if (amb.current) amb.current.intensity = inside ? 0.35 : 0.16 + runtime.dusk * 0.12
    fog.color.copy(cur.fog)
    fog.near = inside ? 60 : cur.near
    fog.far = inside ? 200 : cur.far
    gl.toneMappingExposure = THREE.MathUtils.damp(gl.toneMappingExposure, inside ? 1.0 : cur.exposure, 3, dt)
    const rm = riverMat.current
    if (rm) {
      rm.uniforms.uSky.value.copy(cur.hor).lerp(cur.zen, 0.3)
      rm.uniforms.uSun.value.copy(sunDir)
      rm.uniforms.uMist.value = chapterOf(s.story.beat) === 5 ? 1 : 0
    }
    const pm = pollenMat.current
    if (pm) {
      pm.uniforms.uAmount.value = cur.pollen
      pm.uniforms.uColor.value.set(runtime.dusk > 0.5 ? '#ffd27a' : '#fff1c7')
    }
  })
  return (
    <>
      <primitive object={target} />
      <hemisphereLight ref={hemi} args={['#fdf1de', '#8f8574', 1.1]} />
      <ambientLight ref={amb} intensity={0.18} color="#ffe9d2" />
      <directionalLight ref={light} target={target} color="#ffe2bf" intensity={2.4} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.04} shadow-camera-near={1} shadow-camera-far={160} />
    </>
  )
}
