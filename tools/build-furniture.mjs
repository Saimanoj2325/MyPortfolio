// Merges Kenney Furniture Kit (CC0) pieces for the Home interior into public/models/furniture.glb.
// Kenney furniture uses flat material colours; the app recolours them to the palette by material name.
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const SRC = process.env.FURN_SRC || '/tmp/assets/kenney_furniture-kit/Models/GLTF format/';
const pieces = ['desk', 'chairDesk', 'laptop', 'computerScreen', 'computerKeyboard', 'computerMouse', 'bookcaseOpen', 'bookcaseClosedWide', 'books',
  'lampRoundTable', 'lampSquareFloor', 'pottedPlant', 'plantSmall1', 'plantSmall2', 'plantSmall3', 'rugRectangle', 'rugRound', 'loungeChair', 'sideTable',
  'radio', 'speakerSmall', 'coatRackStanding', 'cardboardBoxClosed', 'cardboardBoxOpen', 'kitchenCoffeeMachine', 'tableCoffee', 'bedSingle', 'pillow',
  'loungeSofa', 'cabinetTelevision', 'trashcan', 'lampWall'];
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const out = new Document(); out.createBuffer();
const main = out.createScene('furniture');
for (const key of pieces) {
  const src = await io.read(SRC + key + '.glb');
  const map = mergeDocuments(out, src);
  const scene = map.get(src.getRoot().listScenes()[0]);
  const wrap = out.createNode(key);
  for (const c of scene.listChildren()) { scene.removeChild(c); wrap.addChild(c); }
  scene.dispose(); main.addChild(wrap);
}
const buf = out.getRoot().listBuffers()[0];
for (const a of out.getRoot().listAccessors()) a.setBuffer(buf);
for (const b of out.getRoot().listBuffers()) if (b !== buf) b.dispose();
out.getRoot().setDefaultScene(main);
await out.transform(dedup(), prune({ keepLeaves: true }), weld(), ...(process.env.NO_MESHOPT ? [] : [meshopt({ encoder: MeshoptEncoder, level: 'medium' })]));
await io.write('public/models/furniture.glb', out);
console.log('materials:', [...new Set(out.getRoot().listMaterials().map((m) => m.getName()))].join(', '));
