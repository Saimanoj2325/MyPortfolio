// Merges chosen CC0 pieces into public/models/kit.glb, each piece wrapped in a node named by its key.
//  - Quaternius Stylized Nature MegaKit [Standard]  (trees, rocks, grass, flowers)
//  - Quaternius Fantasy Props MegaKit [Standard]    (lanterns, books, scrolls, workbench, banners)
// Normal/ORM maps are dropped (the toon ramp does the shading) and colour maps resized to 512px WebP.
// Architecture (ruins, citadel, tower, gates, terminal) is procedural, see src/three/zones/.
// Run: node tools/build-kit.mjs
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, dedup, prune, weld, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const NAT = process.env.NATURE_SRC || '/tmp/assets/snm/glTF/';
const PROPS = process.env.PROPS_SRC || '/tmp/assets/fpm/Exports/glTF/';
const nature = {
  tree_a: 'CommonTree_1', tree_b: 'CommonTree_2', tree_c: 'CommonTree_3',
  pine_a: 'Pine_1', pine_b: 'Pine_2', pine_c: 'Pine_3',
  twisted_a: 'TwistedTree_1', twisted_b: 'TwistedTree_3',
  dead_a: 'DeadTree_1', dead_b: 'DeadTree_3',
  rock_a: 'Rock_Medium_1', rock_b: 'Rock_Medium_2', rock_c: 'Rock_Medium_3',
  bush: 'Bush_Common', bush_flowers: 'Bush_Common_Flowers', fern: 'Fern_1', plant: 'Plant_1',
  grass_tall: 'Grass_Wispy_Tall', grass_short: 'Grass_Common_Short', flowers: 'Flower_3_Group', flowers_b: 'Flower_4_Group',
  mushroom: 'Mushroom_Common', pebble_a: 'Pebble_Round_1', pebble_b: 'Pebble_Round_3',
  path_wide: 'RockPath_Round_Wide', path_small: 'RockPath_Round_Small_1',
};
const props = {
  lantern: 'Lantern_Wall', torch: 'Torch_Metal', workbench: 'Workbench', books: 'Book_Stack_1', books_b: 'BookGroup_Medium_1',
  bookcase: 'Bookcase_2', bookstand: 'BookStand', scroll: 'Scroll_1', scroll_b: 'Scroll_2', chest: 'Chest_Wood',
  crate: 'Crate_Wooden', crate_metal: 'Crate_Metal', barrel: 'Barrel',
  anvil: 'Anvil', bench: 'Bench', table: 'Table_Large', stool: 'Stool', candles: 'CandleStick_Triple', candle: 'Candle_1',
  bag: 'Bag', rope: 'Rope_1', chain: 'Chain_Coil', mug: 'Mug', stall: 'Stall_Empty', cart: 'Stall_Cart_Empty',
  shelf: 'Shelf_Simple', weaponstand: 'WeaponStand', key: 'Key_Gold', pot: 'Pot_1', bucket: 'Bucket_Wooden_1', chair: 'Chair_1',
};

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const out = new Document();
out.createBuffer();
const mainScene = out.createScene('kit');
const add = async (key, file) => {
  const src = await io.read(file);
  for (const m of src.getRoot().listMaterials()) { m.setNormalTexture(null); m.setOcclusionTexture(null); m.setMetallicRoughnessTexture(null); m.setMetallicFactor(0); m.setRoughnessFactor(1); }
  const map = mergeDocuments(out, src);
  const scene = map.get(src.getRoot().listScenes()[0]);
  const wrap = out.createNode(key);
  for (const child of scene.listChildren()) { scene.removeChild(child); wrap.addChild(child); }
  scene.dispose();
  mainScene.addChild(wrap);
};
for (const [k, f] of Object.entries(nature)) await add(k, `${NAT}${f}.gltf`);
for (const [k, f] of Object.entries(props)) await add(k, `${PROPS}${f}.gltf`);
const buf = out.getRoot().listBuffers()[0];
for (const acc of out.getRoot().listAccessors()) acc.setBuffer(buf);
for (const b of out.getRoot().listBuffers()) if (b !== buf) b.dispose();
out.getRoot().setDefaultScene(mainScene);
await out.transform(
  dedup(), prune({ keepLeaves: true }), weld(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 80 }),
  ...(process.env.NO_MESHOPT ? [] : [meshopt({ encoder: MeshoptEncoder, level: 'medium' })]),
);
await io.write('public/models/kit.glb', out);
console.log('pieces', Object.keys(nature).length + Object.keys(props).length, 'textures', out.getRoot().listTextures().map((t) => t.getName()).join(','), 'materials', out.getRoot().listMaterials().length);
