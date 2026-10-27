import { forwardRef, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Effect, EffectAttribute, BlendFunction, type DepthOfFieldEffect } from 'postprocessing'
import { Bloom, DepthOfField, EffectComposer, HueSaturation, Noise, SMAA, Vignette } from '@react-three/postprocessing'
import { useFrame, useThree } from '@react-three/fiber'
import { camState, player } from '../lib/actors'
import { useStore } from '../store'

/** Depth-based soft outlines: a thin warm-ink edge rather than a cartoon line. */
class InkOutlineEffect extends Effect {
  constructor({ thickness = 1.0, strength = 0.2, color = new THREE.Color('#3b3430') } = {}) {
    super('InkOutline', /* glsl */ `
      uniform float uThickness; uniform float uStrength; uniform vec3 uInk; uniform vec2 uTexel;
      float linZ(vec2 uv){ return -getViewZ(readDepth(uv)); }
      void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor){
        float z = -getViewZ(depth);
        vec2 o = uTexel * uThickness;
        float zl = linZ(uv - vec2(o.x, 0.0)); float zr = linZ(uv + vec2(o.x, 0.0));
        float zu = linZ(uv + vec2(0.0, o.y)); float zd = linZ(uv - vec2(0.0, o.y));
        float diff = max(max(zl - z, zr - z), max(zu - z, zd - z));
        float edge = smoothstep(0.04, 0.1, diff / max(z, 0.001));
        edge *= 1.0 - smoothstep(40.0, 140.0, z) * 0.8;
        vec3 inked = mix(inputColor.rgb, inputColor.rgb * uInk * 1.7, uStrength);
        outputColor = vec4(mix(inputColor.rgb, inked, edge), inputColor.a);
      }`, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uThickness', new THREE.Uniform(thickness)], ['uStrength', new THREE.Uniform(strength)],
        ['uInk', new THREE.Uniform(color)], ['uTexel', new THREE.Uniform(new THREE.Vector2(1 / 1280, 1 / 720))],
      ]),
    })
  }
  setSize(width: number, height: number) { (this.uniforms.get('uTexel')!.value as THREE.Vector2).set(1 / width, 1 / height) }
}
const InkOutline = forwardRef<InkOutlineEffect, { thickness?: number }>(function InkOutline({ thickness = 1 }, ref) {
  const effect = useMemo(() => new InkOutlineEffect({ thickness }), [thickness])
  return <primitive ref={ref} object={effect} dispose={null} />
})

/** Colour grade: cool, lifted shadows (dusk blue), warm highlights (ivory), gentle S-curve. */
class GradeEffect extends Effect {
  constructor() {
    super('Grade', /* glsl */ `
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
        vec3 c = clamp(inputColor.rgb, 0.0, 1.0);
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        vec3 shadow = vec3(0.30, 0.34, 0.42);
        vec3 high = vec3(1.04, 1.0, 0.93);
        c = mix(c, c * shadow * 2.4, (1.0 - smoothstep(0.0, 0.45, l)) * 0.12);
        c = mix(c, c * high, smoothstep(0.5, 1.0, l));
        c = mix(vec3(l), c, 1.06);
        c = c * c * (3.0 - 2.0 * c) * 0.18 + c * 0.82;
        outputColor = vec4(c, inputColor.a);
      }`, { blendFunction: BlendFunction.NORMAL })
  }
}
function Grade() {
  const e = useMemo(() => new GradeEffect(), [])
  return <primitive object={e} dispose={null} />
}

function Focus({ dof }: { dof: React.RefObject<DepthOfFieldEffect | null> }) {
  useFrame(({ camera }) => {
    const e = dof.current
    if (!e) return
    const { phase, seated } = useStore.getState()
    const d = camera.position.distanceTo(camState.cine ? camState.look : player.head)
    const ee = e as unknown as { worldFocusDistance: number; worldFocusRange: number; bokehScale: number }
    ee.worldFocusDistance = THREE.MathUtils.lerp(ee.worldFocusDistance || d, d, 0.15)
    ee.worldFocusRange = seated ? 0.6 : phase === 'play' ? Math.max(4, d * 0.9) : Math.max(5, d * 0.7)
    ee.bokehScale = seated ? 0.8 : 1.6
  })
  return null
}

export function Effects({ lite = false }: { lite?: boolean }) {
  const dpr = useThree((s) => s.viewport.dpr)
  const dof = useRef<DepthOfFieldEffect>(null)
  return (
    <>
      <Focus dof={dof} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <InkOutline thickness={Math.max(1, dpr * 0.8)} />
        {!lite && <DepthOfField ref={dof} worldFocusDistance={8} worldFocusRange={6} bokehScale={1.6} />}
        <Bloom intensity={0.5} luminanceThreshold={0.86} luminanceSmoothing={0.25} mipmapBlur radius={0.7} />
        <Grade />
        <HueSaturation saturation={0.06} />
        <Vignette offset={0.32} darkness={0.38} />
        <Noise premultiply opacity={0.07} />
        <SMAA />
      </EffectComposer>
    </>
  )
}
