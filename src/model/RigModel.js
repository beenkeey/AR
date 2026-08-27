import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../config.js';
import { arLog } from '../logger.js';
import { debugState } from '../debugState.js';
import { createArcticDrillingRig, measureRig } from '../assets/ArcticDrillingRig.js';

export class RigModel {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'RigModel';
    this.root.visible = false;
    this.loaded = false;
    this.assetKind = 'N/A';
  }

  async load() {
    this.installArctic();
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
    arLog('Rig GLB loaded');
  }

  installArctic() {
    const rig = createArcticDrillingRig();
    this.applyConfig(rig);
    this.root.add(rig);
    this.assetKind = 'ARCTIC PROCEDURAL';
    arLog(
      `Arctic procedural rig triangles=${rig.userData.triangles} height=${rig.userData.height.toFixed(2)}m`,
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
    const arctic = this.root.getObjectByName('ArcticDrillingRig');
    if (arctic) {
      debugState.rigSource = 'ARCTIC PROCEDURAL';
      debugState.rigTriangles = String(arctic.userData.triangles ?? 0);
      debugState.rigHeight = `${Number(arctic.userData.height || 0).toFixed(2)} m`;
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
  return createArcticDrillingRig();
}
