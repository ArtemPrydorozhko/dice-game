import * as THREE from 'three';
import Debug from '../utils/Debug';

export default class Environment {
  constructor() {
    this.debug = Debug.getInstance();

    if (this.debug.active) {
      this.debugFolder = this.debug.ui.addFolder('environment');
      this.debugFolder.close();
    }

    this.setDirectional();
    this.setAmbientLight();
  }

  setAmbientLight() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 2.4);
  }

  setDirectional() {
    this.directionalLight = new THREE.DirectionalLight('#ffffff', 4);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(1024, 1024);
    this.directionalLight.shadow.camera.far = 40;
    this.directionalLight.shadow.camera.left = -20;
    this.directionalLight.shadow.camera.top = 20;
    this.directionalLight.shadow.camera.right = 20;
    this.directionalLight.shadow.camera.bottom = -20;
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.shadow.normalBias = 0.05;
    this.directionalLight.shadow.bias = -0.001;

    this.cameraHelper = new THREE.CameraHelper(
      this.directionalLight.shadow.camera,
    );

    if (this.debug.active) {
      const directionalLightFolder = this.debugFolder
        .addFolder('directionalLight')
        .close();
      directionalLightFolder
        .add(this.directionalLight, 'intensity')
        .name('directionalLightIntensity')
        .min(0)
        .max(10)
        .step(0.001);

      directionalLightFolder
        .add(this.directionalLight.position, 'x')
        .name('directionalLightX')
        .min(-10)
        .max(10)
        .step(0.001);

      directionalLightFolder
        .add(this.directionalLight.position, 'y')
        .name('directionalLightY')
        .min(-10)
        .max(10)
        .step(0.001);

      directionalLightFolder
        .add(this.directionalLight.position, 'z')
        .name('directionalLightZ')
        .min(-10)
        .max(10)
        .step(0.001);

      directionalLightFolder
        .add(this.directionalLight.shadow, 'normalBias')
        .min(-0.05)
        .max(0.05)
        .step(0.001);
      directionalLightFolder
        .add(this.directionalLight.shadow, 'bias')
        .min(-0.05)
        .max(0.05)
        .step(0.001);
    }
  }
}
