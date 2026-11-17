import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../config.js';
import { arLog } from '../logger.js';
import { debugState } from '../debugState.js';
import { createCoalMineComplex, measureRig } from '../assets/CoalMineComplex.js';

export class RigModel {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'RigModel';
    this.root.visible = false;
    this.loaded = false;
    this.assetKind = 'N/A';
  }

  async load() {
    this.installCoalMine();
    this.syncAssetDebug();
    this.loaded = true;
    return this.root;
  }

  async loadGlb() {
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
    arLog('Coal complex GLB loaded');
  }

  installCoalMine() {
    const complex = createCoalMineComplex();
    this.applyConfig(complex);
    this.root.add(complex);
    this.assetKind = 'COAL QUARRY PROCEDURAL';
    arLog(
      `Coal quarry complex triangles=${complex.userData.triangles} height=${complex.userData.height.toFixed(2)}m`,
    );
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

  syncAssetDebug() {
    const complex = this.root.getObjectByName('CoalMineComplex');
    if (complex) {
      debugState.rigSource = 'COAL QUARRY PROCEDURAL';
      debugState.rigTriangles = String(complex.userData.triangles ?? 0);
      debugState.rigHeight = `${Number(complex.userData.height || 0).toFixed(2)} m`;
      return;
    }
    const stats = measureRig(this.root);
    debugState.rigSource = this.assetKind;
    debugState.rigTriangles = String(stats.triangles);
    debugState.rigHeight = `${stats.height.toFixed(2)} m`;
  }

  show() {
    this.root.visible = true;
  }

  hide() {
    this.root.visible = false;
  }
}

export function createFallbackRig() {
  return createCoalMineComplex();
}
