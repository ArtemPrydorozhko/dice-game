import * as THREE from 'three';

import Debug from './utils/Debug.js';
import Camera from './Camera.js';
import Renderer from './Renderer.js';
import World from './world/World.js';
import Controller from './behavior/Controller.js';
import UserPointerHandler from './utils/UserPointerHandler.js';

export default class Main {
  constructor(canvas) {
    this.canvas = canvas;
    this.listeners = [];
    window.mainApp = this;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    const resizeListener = this.resize.bind(this);
    window.addEventListener('resize', resizeListener);
    this.listeners.push(() => {
      window.removeEventListener('resize', resizeListener);
    });

    this.start = Date.now();
    this.currentTime = this.start;
    this.elapsed = 0;
    this.delta = 16;

    this.debug = Debug.getInstance();

    this.camera = new Camera(this.canvas, this.width, this.height);
    this.world = new World(this.camera);
    this.renderer = new Renderer(
      this.canvas,
      this.width,
      this.height,
      this.pixelRatio,
      this.world.scene,
      this.camera.threeJSCamera,
    );
    this.userPointerHelper = new UserPointerHandler(
      this.width,
      this.height,
      this.camera,
    );
    this.controller = new Controller(
      this.world,
      this.userPointerHelper,
      this.renderer,
    );

    window.requestAnimationFrame(() => {
      this.tick();
    });
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    this.camera.resize(this.width, this.height);
    this.renderer.resize(this.width, this.height, this.pixelRatio);
    this.userPointerHelper.setDimensions(this.width, this.height);
  }

  update() {
    this.camera.update();
    this.world.update();
    this.renderer.update(this.world.scene, this.camera.threeJSCamera);
  }

  tick() {
    const currentTime = Date.now();
    this.delta = currentTime - this.current;
    this.currentTime = currentTime;
    this.elapsed = this.currentTime - this.start;

    this.update();

    window.requestAnimationFrame(() => {
      this.tick();
    });
  }

  destroy() {
    this.listeners.forEach((unsubscribe) => unsubscribe());

    this.world.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();

        for (const key in child.material) {
          const value = child.material[key];

          if (value && typeof value.dispose === 'function') {
            value.dispose();
          }
        }
      }
    });

    this.camera.controls.dispose();
    this.renderer.webGLRenderer.dispose();

    if (this.debug.active) {
      this.debug.ui.destroy();
    }
  }
}
