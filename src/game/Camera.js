import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Debug from './utils/Debug.js';

export default class Camera {
  constructor(canvas, width, height) {
    this.threeJSCamera = new THREE.PerspectiveCamera(
      35,
      width / height,
      0.1,
      100,
    );
    this.threeJSCamera.position.set(10, 36, 0);

    this.controls = new OrbitControls(this.threeJSCamera, canvas);
    this.controls.enableDamping = true;

    this.debug = Debug.getInstance();
    if (this.debug.active) {
      this.debugFolder = this.debug.ui.addFolder('camera');
      this.debugFolder.add(this.threeJSCamera.position, 'x');
      this.debugFolder.add(this.threeJSCamera.position, 'y');
      this.debugFolder.add(this.threeJSCamera.position, 'z');
    }
  }

  resize(width, height) {
    this.threeJSCamera.aspect = width / height;
    this.threeJSCamera.updateProjectionMatrix();
  }

  update() {
    this.controls.update();
  }
}
