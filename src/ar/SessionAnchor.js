import * as THREE from 'three';
import { debugState } from '../debugState.js';

/**
 * Immutable per-visit AR snapshot.
 * Captured once at MindAR FOUND. Never recomputed from later FOUND/LOST.
 */
export class SessionAnchor {
  constructor() {
    this.locked = false;
    this.targetWorld = new THREE.Matrix4();
    this.cameraAtFound = new THREE.Matrix4();
    this.exhibitionMatrix = new THREE.Matrix4();
  }

  capture({ worldMatrix, camera }) {
    if (this.locked) return;
    if (worldMatrix) {
      const m = worldMatrix.length === 16 ? worldMatrix : null;
      if (m) this.targetWorld.fromArray(m);
    }
    camera.updateMatrixWorld(true);
    this.cameraAtFound.copy(camera.matrixWorld);
    this.locked = true;
    debugState.anchor = 'LOCKED';
    debugState.worldAnchor = 'LOCKED';
  }

  bindExhibition(root) {
    if (!this.locked) return;
    root.updateMatrixWorld(true);
    this.exhibitionMatrix.copy(root.matrix);
  }

  clear() {
    this.locked = false;
    this.targetWorld.identity();
    this.cameraAtFound.identity();
    this.exhibitionMatrix.identity();
    debugState.anchor = 'NONE';
    debugState.worldAnchor = 'NOT CREATED';
  }
}
