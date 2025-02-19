import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';

export default class ResourceLoader {
  constructor() {
    this.loaders = {};
    this.loaders.gltfLoader = new GLTFLoader();
    this.loaders.textureLoader = new THREE.TextureLoader();
    // this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader()

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    this.loaders.gltfLoader.setDRACOLoader(dracoLoader);

    this.loaderMap = {
      gltfModel: this.loaders.gltfLoader,
      texture: this.loaders.textureLoader,
    };
  }

  load(source) {
    const { promise, resolve, reject } = Promise.withResolvers();
    this.loaderMap[source.type].load(
      source.path,
      (file) => {
        resolve(file);
      },
      () => {},
      (err) => {
        reject(err);
      },
    );
    return promise;
  }
}
