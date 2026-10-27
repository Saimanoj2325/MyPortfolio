// Builds public/models/engineer.glb:
//   Quaternius Universal Base Characters (Superhero_Male, CC0) + Hair_SimpleParted
//   + a trimmed set of Quaternius Universal Animation Library clips (CC0), same humanoid rig.
// Clothing (hoodie / jeans / sneakers) is painted at runtime from skin weights (see src/three/engineerLook.ts).
// Run: node tools/build-character.mjs   (sources default to /tmp/assets, see README "Assets")
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, dedup, resample, meshopt, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const UBC = process.env.UBC_SRC || '/tmp/assets/ubc/Universal Base Characters[Standard]';
const UAL = process.env.UAL_SRC || '/tmp/assets/ual/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';
const BODY = `${UBC}/Base Characters/Godot - UE/Superhero_Male_FullBody.gltf`;
const HAIR = `${UBC}/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/Hair_SimpleParted.gltf`;

const KEEP = new Map([
  ['Idle_Loop', 'Idle'], ['Walk_Loop', 'Walk'], ['Jog_Fwd_Loop', 'Jog'], ['Sprint_Loop', 'Run'],
  ['Jump_Start', 'JumpStart'], ['Jump_Loop', 'JumpLoop'], ['Jump_Land', 'JumpLand'],
  ['Dance_Loop', 'Dance'], ['Interact', 'Interact'], ['Idle_Talking_Loop', 'Talk'],
  ['Sitting_Idle_Loop', 'Sit'], ['Hit_Head', 'Hit'], ['Roll', 'Roll'], ['PickUp_Table', 'PickUp'],
  ['Fixing_Kneeling', 'Fix'], ['Crouch_Idle_Loop', 'Crouch'], ['Death01', 'Fall'], ['Spell_Simple_Shoot', 'Cast'],
]);
const KEEP_TRANSLATION = new Set(['pelvis']);

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read(BODY);
const root = doc.getRoot();
const scene = root.listScenes()[0];
const skin = root.listSkins()[0];
const byName = new Map(root.listNodes().map((n) => [n.getName(), n]));
const jointNames = skin.listJoints().map((j) => j.getName());

// ---- hair: merge, re-bind to the body skin (same joint order) ----
{
  const hair = await io.read(HAIR);
  const hj = hair.getRoot().listSkins()[0].listJoints().map((j) => j.getName());
  if (hj.join() !== jointNames.join()) throw new Error('hair joint order differs');
  const map = mergeDocuments(doc, hair);
  const hs = map.get(hair.getRoot().listScenes()[0]);
  const hairNode = root.listNodes().find((n) => n.getName() === 'Hair_SimpleParted' && n.getMesh());
  const meshParent = byName.get('SuperHero_Male').getParentNode() || null;
  hairNode.getParentNode()?.removeChild(hairNode);
  if (meshParent) meshParent.addChild(hairNode); else scene.addChild(hairNode);
  hairNode.setSkin(skin);
  for (const s of root.listSkins()) if (s !== skin) s.dispose();
  hs.dispose();
  for (const n of hair.getRoot().listNodes()) { const mn = map.get(n); if (mn && mn !== hairNode) mn.dispose(); }
}

// ---- animations from UAL, retargeted by bone name ----
{
  const ual = await io.read(UAL);
  for (const a of ual.getRoot().listAnimations()) if (!KEEP.has(a.getName())) a.dispose();
  const ualPelvis = ual.getRoot().listNodes().find((n) => n.getName() === 'pelvis').getTranslation()[2];
  const ratio = byName.get('pelvis').getTranslation()[2] / ualPelvis; // body is a bit taller than the mannequin
  const map = mergeDocuments(doc, ual);
  for (const a of root.listAnimations()) {
    if (!KEEP.has(a.getName())) continue;
    a.setName(KEEP.get(a.getName()));
    for (const ch of a.listChannels()) {
      const tn = ch.getTargetNode()?.getName();
      const path = ch.getTargetPath();
      const target = byName.get(tn);
      const ok = target && (path === 'rotation' || (path === 'translation' && KEEP_TRANSLATION.has(tn)));
      if (!ok) { const s = ch.getSampler(); ch.dispose(); s?.dispose(); continue; }
      ch.setTargetNode(target);
      if (path === 'translation') {
        const out = ch.getSampler().getOutput().clone();
        const arr = out.getArray();
        for (let i = 0; i < arr.length; i++) arr[i] *= ratio;
        ch.getSampler().setOutput(out);
      }
    }
  }
  map.get(ual.getRoot().listScenes()[0]).dispose();
  for (const n of ual.getRoot().listNodes()) map.get(n)?.dispose();
  for (const m of ual.getRoot().listMeshes()) map.get(m)?.dispose();
  for (const s of root.listSkins()) if (s !== skin) s.dispose();
}

// ---- strip what the toon look does not use ----
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
  for (const sem of ['TEXCOORD_1', 'TEXCOORD_2', 'TEXCOORD_3', 'COLOR_0', 'COLOR_1']) p.getAttribute(sem) && p.setAttribute(sem, null);
}
for (const mat of root.listMaterials()) {
  mat.setNormalTexture(null); mat.setMetallicRoughnessTexture(null); mat.setOcclusionTexture(null);
  mat.setMetallicFactor(0); mat.setRoughnessFactor(1);
}

const buf = root.listBuffers()[0];
for (const acc of root.listAccessors()) acc.setBuffer(buf);
for (const b of root.listBuffers()) if (b !== buf) b.dispose();

await doc.transform(
  prune(), dedup(), resample(), weld(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 82 }),
  ...(process.env.NO_MESHOPT ? [] : [meshopt({ encoder: MeshoptEncoder, level: 'medium' })]),
);
await io.write('public/models/engineer.glb', doc);
console.log('anims:', root.listAnimations().map((a) => `${a.getName()}(${a.listChannels().length})`).join(' '));
console.log('meshes:', root.listMeshes().map((m) => m.getName()).join(', '), 'textures', root.listTextures().length);
