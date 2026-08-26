import * as THREE from 'three';
import { CONFIG, EXHIBITION_MODEL_SCALE } from '../config.js';

/**
 * Static exhibition world. The model transform is written once per visit
 * and then never updated — camera motion is the only moving part.
 */
export class ExhibitionScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.name = 'Exhibition';

    this.anchor = new THREE.Group();
    this.anchor.name = 'ExhibitionAnchor';
    this.scene.add(this.anchor);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    this.scene.add(new THREE.HemisphereLight(0xdde7ff, 0x1a1a1a, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(6, 14, 8);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9bb8ff, 0.45);
    rim.position.set(-8, 6, -4);
    this.scene.add(rim);

    this.model = null;
    this.locked = false;
    this.transformUpdates = 0;
    this._matState = [];
    this._fixedPos = new THREE.Vector3();
    this._fixedQuat = new THREE.Quaternion();
    this._fixedScale = new THREE.Vector3();
    this._box = new THREE.Box3();
    this._size = new THREE.Vector3();
    this._center = new THREE.Vector3();
  }

  attach(model) {
    this.model = model;
    if (model.parent !== this.anchor) this.anchor.add(model);
    model.visible = false;
  }

  placeStatic() {
    if (!this.model) return;
    this.locked = false;
    this.anchor.matrixAutoUpdate = true;
    this.anchor.position.set(0, 0, 0);
    this.anchor.quaternion.identity();
    this.anchor.scale.set(1, 1, 1);
    this.model.visible = true;
    this.anchor.updateMatrixWorld(true);

    this._box.setFromObject(this.anchor);
    this._box.getSize(this._size);
    const height = Math.max(this._size.y, 0.01);
    const scale = EXHIBITION_MODEL_SCALE / height;
    this.anchor.scale.setScalar(scale);
    this.anchor.updateMatrixWorld(true);

    this._box.setFromObject(this.anchor);
    this._box.getSize(this._size);
    this._box.getCenter(this._center);
    const distance = CONFIG.exhibition.distance;
    this.anchor.position.set(
      this.anchor.position.x - this._center.x,
      this.anchor.position.y - this._box.min.y,
      this.anchor.position.z - this._center.z - distance,
    );
    this.anchor.updateMatrix();
    this.anchor.matrixAutoUpdate = false;
    this.anchor.updateMatrixWorld(true);

    this._fixedPos.copy(this.anchor.position);
    this._fixedQuat.copy(this.anchor.quaternion);
    this._fixedScale.copy(this.anchor.scale);
    this.locked = true;
    this.transformUpdates = 1;
    this.cacheMaterials();
    this.setOpacity(0);
  }

  cacheMaterials() {
    this._matState = [];
    if (!this.model) return;
    this.model.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of mats) {
        this._matState.push({
          mat,
          transparent: mat.transparent,
          opacity: mat.opacity ?? 1,
          depthWrite: mat.depthWrite,
        });
      }
    });
  }

  setOpacity(opacity) {
    for (const item of this._matState) {
      item.mat.transparent = opacity < 0.999 || item.transparent;
      item.mat.opacity = (item.opacity ?? 1) * opacity;
      item.mat.depthWrite = opacity > 0.95 ? item.depthWrite : false;
      item.mat.needsUpdate = true;
    }
  }

  restoreMaterials() {
    for (const item of this._matState) {
      item.mat.transparent = item.transparent;
      item.mat.opacity = item.opacity;
      item.mat.depthWrite = item.depthWrite;
      item.mat.needsUpdate = true;
    }
  }

  fadeIn(durationMs = 400) {
    const start = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = t * t * (3 - 2 * t);
        this.setOpacity(eased);
        if (t < 1) requestAnimationFrame(tick);
        else {
          this.restoreMaterials();
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  hide() {
    if (this.model) this.model.visible = false;
    this.restoreMaterials();
    this.anchor.matrixAutoUpdate = true;
    this.anchor.position.set(0, 0, 0);
    this.anchor.quaternion.identity();
    this.anchor.scale.set(1, 1, 1);
    this.anchor.matrix.identity();
    this.locked = false;
    this.transformUpdates = 0;
  }

  get position() {
    return this.anchor.position;
  }

  get quaternion() {
    return this.anchor.quaternion;
  }

  get scale() {
    return this.anchor.scale;
  }
}
