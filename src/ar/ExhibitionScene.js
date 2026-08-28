import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { ArcticWorld } from './ArcticWorld.js';
import { createViewpointPad } from '../assets/FieldYard.js';
import { tickRoofCrew } from '../assets/CrewFigures.js';

/**
 * Static exhibition world.
 *
 * scene
 *  ├── ArcticWorld (day sky, snow, mountains, helis)
 *  ├── camera
 *  ├── lights
 *  └── exhibitionRoot       (ONE frozen world transform)
 *       └── rigModel
 *
 * The root transform is written once per visit, then matrixAutoUpdate=false.
 * Camera motion must not write this object. MindAR never enters this scene.
 */
export class ExhibitionScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.name = 'Exhibition';

    this.anchor = new THREE.Group();
    this.anchor.name = 'ExhibitionRoot';
    this.scene.add(this.anchor);

    this.world = new ArcticWorld(this.scene);

    this.scene.add(new THREE.AmbientLight(0xd7e6f2, 0.68));
    this.scene.add(new THREE.HemisphereLight(0xc5dceb, 0x8aa3b0, 0.78));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.22);
    sun.position.set(36, 88, 22);
    if (!CONFIG.performance.disableHeavyEffects) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 8;
      sun.shadow.camera.far = 220;
      sun.shadow.camera.left = -90;
      sun.shadow.camera.right = 90;
      sun.shadow.camera.top = 90;
      sun.shadow.camera.bottom = -90;
      sun.shadow.bias = -0.0008;
    }
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb9cfe0, 0.42);
    fill.position.set(-22, 18, -12);
    this.scene.add(fill);

    this.model = null;
    this.locked = false;
    this.transformUpdates = 0;
    this.scaleMode = 'huge';
    this.scaling = false;
    this._scaleRaf = 0;
    this._matState = [];
    this._fixedPos = new THREE.Vector3();
    this._fixedQuat = new THREE.Quaternion();
    this._fixedScale = new THREE.Vector3();
    this._hugeScale = new THREE.Vector3(1, 1, 1);
    this._overviewScale = new THREE.Vector3(1, 1, 1);
    this._tweenScale = new THREE.Vector3();
    this._fromScale = new THREE.Vector3();
    this._fixedMatrix = new THREE.Matrix4();
    this._box = new THREE.Box3();
    this._size = new THREE.Vector3();
    this._center = new THREE.Vector3();
    this._invWorld = new THREE.Matrix4();
    this._localPos = new THREE.Vector3();
    this.colliders = [];
    this.viewpoints = [];
    this.pads = null;
  }

  tick(now) {
    this.world?.tick(now);
    tickRoofCrew(this.model, now * 0.001);
  }

  attach(model) {
    this.model = model;
    if (model.parent !== this.anchor) this.anchor.add(model);
    model.visible = false;
  }

  placeStatic() {
    if (!this.model || this.locked) return;

    if (this.model.parent !== this.anchor) this.anchor.add(this.model);

    // One-shot world pose. Not worldMatrix * postMatrix: a tall rig cannot
    // sit on the paper target. MindAR is only the trigger.
    this.anchor.matrixAutoUpdate = true;
    this.anchor.position.set(0, 0, 0);
    this.anchor.quaternion.identity();
    this.anchor.rotation.y = CONFIG.exhibition.startYaw;
    this.anchor.scale.set(1, 1, 1);
    this.model.visible = true;
    this.anchor.updateMatrixWorld(true);

    const contact = this.anchor.getObjectByName('ContactShadow');
    if (contact) contact.visible = false;

    this._box.setFromObject(this.anchor);
    this._box.getSize(this._size);
    const height = Math.max(this._size.y, 0.01);
    const scale = CONFIG.exhibition.hugeHeight / height;
    this.anchor.scale.setScalar(scale);
    this.anchor.updateMatrixWorld(true);

    this._box.setFromObject(this.anchor);
    this._box.getSize(this._size);
    this._box.getCenter(this._center);
    const distance = CONFIG.exhibition.distance;
    this.anchor.position.set(
      this.anchor.position.x - this._center.x,
      this.anchor.position.y - this._box.min.y + 0.03,
      this.anchor.position.z - this._box.max.z - distance,
    );

    this._freezeRoot();
    if (contact) contact.visible = true;
    this._hugeScale.copy(this.anchor.scale);
    const overviewRatio = CONFIG.exhibition.overviewHeight / CONFIG.exhibition.hugeHeight;
    this._overviewScale.copy(this._hugeScale).multiplyScalar(overviewRatio);
    this.scaleMode = 'huge';
    this.scaling = false;
    if (this.model) {
      this.model.updateMatrix();
      this.model.matrix.decompose(this.model.position, this.model.quaternion, this.model.scale);
      this.model.matrixAutoUpdate = false;
    }
    this.locked = true;
    this.transformUpdates = 1;
    this._buildColliders();
    this._ensureIndustrialDetail();
    this._placeViewpoints();
    this.cacheMaterials();
    this.setOpacity(0);
  }

  _freezeRoot() {
    this.anchor.matrix.compose(this.anchor.position, this.anchor.quaternion, this.anchor.scale);
    this.anchor.matrix.decompose(this.anchor.position, this.anchor.quaternion, this.anchor.scale);
    this.anchor.matrixAutoUpdate = false;
    this.anchor.updateMatrixWorld(true);
    this._fixedMatrix.copy(this.anchor.matrix);
    this._fixedPos.copy(this.anchor.position);
    this._fixedQuat.copy(this.anchor.quaternion);
    this._fixedScale.copy(this.anchor.scale);
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
    this._cancelScaleTween();
    if (this.model) {
      this.model.visible = false;
      this.model.matrixAutoUpdate = true;
    }
    this.restoreMaterials();
    this.anchor.matrixAutoUpdate = true;
    this.anchor.position.set(0, 0, 0);
    this.anchor.quaternion.identity();
    this.anchor.scale.set(1, 1, 1);
    this.anchor.matrix.identity();
    this.anchor.updateMatrixWorld(true);
    this.locked = false;
    this.scaleMode = 'huge';
    this.scaling = false;
    this.transformUpdates = 0;
    this.colliders = [];
    this._clearViewpoints();
  }

  getViewpoint(id) {
    return this.viewpoints.find((item) => item.id === id) || null;
  }

  _clearViewpoints() {
    this.viewpoints = [];
    if (this.pads?.parent) this.pads.parent.remove(this.pads);
    this.pads = null;
  }

  _placeViewpoints() {
    this._clearViewpoints();
    this.anchor.updateMatrixWorld(true);
    this._box.setFromObject(this.anchor);
    this._box.getCenter(this._center);
    this._box.getSize(this._size);
    const cx = this._center.x;
    const cz = this._center.z;
    const eye = CONFIG.exhibition.eyeHeight;
    const spawn = new THREE.Vector3(0, eye, 0);
    const radius = Math.max(18, Math.hypot(spawn.x - cx, spawn.z - cz));
    const baseAng = Math.atan2(spawn.x - cx, spawn.z - cz);
    const ring = [
      { id: 'front', label: 'Перед' },
      { id: 'right', label: 'Справа' },
      { id: 'back', label: 'Сзади' },
      { id: 'left', label: 'Слева' },
    ];
    this.pads = new THREE.Group();
    this.pads.name = 'ViewpointPads';
    ring.forEach((item, i) => {
      const a = baseAng + i * (Math.PI / 2);
      const position = new THREE.Vector3(
        cx + Math.sin(a) * radius,
        eye,
        cz + Math.cos(a) * radius,
      );
      this.viewpoints.push({ ...item, position });
      const pad = createViewpointPad(item.id, item.label);
      pad.position.set(position.x, 0.04, position.z);
      this.pads.add(pad);
    });
    const balcony = new THREE.Vector3(
      cx + this._size.x * 0.36,
      this._box.min.y + this._size.y * 0.45,
      cz + this._size.z * 0.16,
    );
    this.viewpoints.push({
      id: 'balcony',
      label: 'Балкон',
      position: balcony,
    });
    const high = createViewpointPad('balcony', 'Балкон');
    high.position.set(balcony.x, balcony.y - eye + 0.04, balcony.z);
    this.pads.add(high);
    this.scene.add(this.pads);
  }

  _buildColliders() {
    // Local boxes on ExhibitionRoot. Uniform hugeHeight scale maps them to world metres.
    this.colliders = [
      { min: [-1.85, 0.0, -1.72], max: [1.95, 1.18, 1.28], slide: 'xz' },
      { min: [0.32, 1.02, -0.28], max: [1.18, 6.45, 0.48], slide: 'xz' },
      { min: [0.88, 0.32, 0.12], max: [1.72, 0.78, 0.98], slide: 'xz' },
    ].map((item) => ({
      min: new THREE.Vector3(...item.min),
      max: new THREE.Vector3(...item.max),
      slide: item.slide,
    }));
  }

  _ensureIndustrialDetail() {
    const rig = this.model?.getObjectByName('ArcticDrillingRig');
    if (!rig || rig.getObjectByName('IndustrialLights')) return;

    const group = new THREE.Group();
    group.name = 'IndustrialLights';

    const redMat = new THREE.MeshStandardMaterial({
      color: 0xff2a18,
      emissive: 0xff1e0a,
      emissiveIntensity: 2.8,
      roughness: 0.45,
      metalness: 0.08,
    });
    const warmMat = new THREE.MeshStandardMaterial({
      color: 0xffc56a,
      emissive: 0xffa845,
      emissiveIntensity: 1.8,
      roughness: 0.5,
      metalness: 0.04,
    });
    const bulb = new THREE.SphereGeometry(0.12, 10, 10);
    const markers = [
      { p: [2.35, 22.95, 0.55], mat: redMat, s: 1.15 },
      { p: [2.35, 16.4, 0.55], mat: redMat, s: 0.95 },
      { p: [2.35, 10.2, 0.55], mat: redMat, s: 0.9 },
      { p: [3.15, 8.05, 0.55], mat: warmMat, s: 1.05 },
      { p: [1.2, 4.05, 0.62], mat: warmMat, s: 0.85 },
      { p: [0.4, 4.0, -5.55], mat: warmMat, s: 0.8 },
      { p: [5.0, 2.2, 1.55], mat: warmMat, s: 0.75 },
    ];
    for (const item of markers) {
      const mesh = new THREE.Mesh(bulb, item.mat);
      mesh.position.set(...item.p);
      mesh.scale.setScalar(item.s);
      group.add(mesh);
    }

    const crown = new THREE.PointLight(0xff3318, 2.1, 18, 2);
    crown.position.set(2.35, 22.6, 0.55);
    group.add(crown);
    const work = new THREE.PointLight(0xffcc88, 1.55, 14, 2);
    work.position.set(2.2, 8.1, 0.7);
    group.add(work);

    rig.add(group);

    rig.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of mats) {
        if (mat.color?.getHex?.() === 0x243038) {
          mat.emissive.setHex(0x2d5360);
          mat.emissiveIntensity = 0.32;
        }
      }
    });

    if (!this.anchor.getObjectByName('ContactShadow')) {
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(2.35, 28),
        new THREE.MeshBasicMaterial({
          color: 0x6d7d88,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        }),
      );
      shadow.name = 'ContactShadow';
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(0.05, 0.025, -0.18);
      this.anchor.add(shadow);
    }
  }

  resolveCamera(worldPos) {
    if (!this.locked || !this.colliders.length) return worldPos;
    this.anchor.updateMatrixWorld(true);
    this._invWorld.copy(this.anchor.matrixWorld).invert();
    this._localPos.copy(worldPos).applyMatrix4(this._invWorld);
    const pad = CONFIG.worldTracking.collisionPadding / Math.max(this.anchor.scale.x, 0.01);
    for (const box of this.colliders) {
      const x0 = box.min.x - pad;
      const x1 = box.max.x + pad;
      const y0 = box.min.y - pad;
      const y1 = box.max.y + pad;
      const z0 = box.min.z - pad;
      const z1 = box.max.z + pad;
      if (
        this._localPos.x <= x0 || this._localPos.x >= x1
        || this._localPos.y <= y0 || this._localPos.y >= y1
        || this._localPos.z <= z0 || this._localPos.z >= z1
      ) continue;
      const dxL = this._localPos.x - x0;
      const dxR = x1 - this._localPos.x;
      const dyL = this._localPos.y - y0;
      const dyR = y1 - this._localPos.y;
      const dzL = this._localPos.z - z0;
      const dzR = z1 - this._localPos.z;
      if (box.slide === 'xz') {
        const horiz = Math.min(dxL, dxR, dzL, dzR);
        if (horiz === dxL) this._localPos.x = x0;
        else if (horiz === dxR) this._localPos.x = x1;
        else if (horiz === dzL) this._localPos.z = z0;
        else this._localPos.z = z1;
      } else {
        const min = Math.min(dxL, dxR, dyL, dyR, dzL, dzR);
        if (min === dxL) this._localPos.x = x0;
        else if (min === dxR) this._localPos.x = x1;
        else if (min === dyL) this._localPos.y = y0;
        else if (min === dyR) this._localPos.y = y1;
        else if (min === dzL) this._localPos.z = z0;
        else this._localPos.z = z1;
      }
    }
    worldPos.copy(this._localPos).applyMatrix4(this.anchor.matrixWorld);
    if (worldPos.y < CONFIG.worldTracking.minEyeY) worldPos.y = CONFIG.worldTracking.minEyeY;
    return worldPos;
  }

  enforceLock() {
    if (!this.locked || this.scaling) return;
    const scale = this.scaleMode === 'overview' ? this._overviewScale : this._hugeScale;
    const posDrift = this.anchor.position.distanceToSquared(this._fixedPos) > 1e-8;
    const rotDrift = this.anchor.quaternion.angleTo(this._fixedQuat) > 1e-4;
    const scaleDrift = Math.abs(this.anchor.scale.x - scale.x) > 1e-5;
    if (!posDrift && !rotDrift && !scaleDrift && !this.anchor.matrixAutoUpdate) return;
    this.anchor.matrix.compose(this._fixedPos, this._fixedQuat, scale);
    this.anchor.matrix.decompose(this.anchor.position, this.anchor.quaternion, this.anchor.scale);
    this.anchor.matrixAutoUpdate = false;
    this.anchor.updateMatrixWorld(true);
  }

  animateScale(mode) {
    if (!this.locked || this.scaling) return Promise.resolve(this.scaleMode);
    if (mode === this.scaleMode) return Promise.resolve(this.scaleMode);
    const target = mode === 'overview' ? this._overviewScale : this._hugeScale;
    this._fromScale.copy(this.anchor.scale);
    this._cancelScaleTween();
    this.scaling = true;
    const duration = CONFIG.exhibition.scaleMs;
    const start = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = t * t * (3 - 2 * t);
        this._tweenScale.lerpVectors(this._fromScale, target, eased);
        this.anchor.matrix.compose(this._fixedPos, this._fixedQuat, this._tweenScale);
        this.anchor.matrix.decompose(this.anchor.position, this.anchor.quaternion, this.anchor.scale);
        this.anchor.matrixAutoUpdate = false;
        this.anchor.updateMatrixWorld(true);
        if (t < 1) {
          this._scaleRaf = requestAnimationFrame(tick);
        } else {
          this.anchor.scale.copy(target);
          this.anchor.matrix.compose(this._fixedPos, this._fixedQuat, this.anchor.scale);
          this.anchor.matrix.decompose(this.anchor.position, this.anchor.quaternion, this.anchor.scale);
          this.anchor.matrixAutoUpdate = false;
          this.anchor.updateMatrixWorld(true);
          this.scaleMode = mode;
          this.scaling = false;
          this._scaleRaf = 0;
          resolve(mode);
        }
      };
      this._scaleRaf = requestAnimationFrame(tick);
    });
  }

  _cancelScaleTween() {
    if (this._scaleRaf) {
      cancelAnimationFrame(this._scaleRaf);
      this._scaleRaf = 0;
    }
    this.scaling = false;
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
