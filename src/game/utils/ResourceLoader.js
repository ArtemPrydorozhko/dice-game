import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';
import urlBuilder from './urlBuilder';

export default class ResourceLoader {
  constructor() {
    this.loadingManager = new THREE.LoadingManager();
    this.loaders = {};
    this.loaders.gltfLoader = new GLTFLoader(this.loadingManager);
    this.loaders.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.loaders.audioLoader = new THREE.AudioLoader(this.loadingManager);
    // this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader()

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(urlBuilder.buildUrl('/draco/'));
    this.loaders.gltfLoader.setDRACOLoader(dracoLoader);

    this.loaderMap = {
      gltfModel: this.loaders.gltfLoader,
      texture: this.loaders.textureLoader,
      audio: this.loaders.audioLoader,
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
