import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../config.js';
import { arLog } from '../logger.js';

export class RigModel {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'RigModel';
    this.root.visible = false;
    this.loaded = false;
  }

  async load() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(CONFIG.model.url);
    const model = gltf.scene;
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = false;
        if (node.material) {
          node.material.metalness = node.material.metalness ?? 0.3;
          node.material.roughness = node.material.roughness ?? 0.5;
        }
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.position.y += size.y / 2;

    const wrapper = new THREE.Group();
    wrapper.add(model);
    this.applyConfig(wrapper);
    this.root.add(wrapper);
    this.loaded = true;
    arLog('Rig model loaded');
    return this.root;
  }

  applyConfig(target = this.root) {
    const { scale, rotationDeg, offset } = CONFIG.model;
    target.scale.setScalar(scale);
    target.rotation.set(
      THREE.MathUtils.degToRad(rotationDeg[0]),
      THREE.MathUtils.degToRad(rotationDeg[1]),
      THREE.MathUtils.degToRad(rotationDeg[2]),
    );
    target.position.set(offset[0], offset[1], offset[2]);
  }

  show() {
    this.root.visible = true;
  }

  hide() {
    this.root.visible = false;
  }
}

export function createFallbackRig() {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a9098, metalness: 0.4, roughness: 0.4 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xdb731e, metalness: 0.2, roughness: 0.5 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 2.2), new THREE.MeshStandardMaterial({ color: 0x33363c }));
  deck.position.y = 0.08;
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 0.35), steel);
  tower.position.y = 2.0;
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), accent);
  crown.position.y = 3.9;
  group.add(deck, tower, crown);
  return group;
}
