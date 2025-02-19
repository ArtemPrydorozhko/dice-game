import * as THREE from 'three';
import { EventEmitter } from './EventEmitter';

export default class UserPointerHandler {
  constructor(width, height, camera) {
    this.width = width;
    this.height = height;
    this.camera = camera;

    this.events = new EventEmitter();
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.listeners = [];
    const clickListener = this.clickHandler.bind(this);
    window.addEventListener('click', clickListener);
    this.listeners.push(() => {
      window.removeEventListener('click', clickListener);
    });
  }

  clickHandler(event) {
    this.pointer.x = (event.clientX / this.width) * 2 - 1;
    this.pointer.y = -(event.clientY / this.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera.threeJSCamera);
    this.events.emit('click');
  }

  setDimensions(width, height) {
    this.width = width;
    this.height = height;
  }

  getIntersectedObject(objects) {
    return this.raycaster.intersectObjects(objects)[0];
  }

  destroy() {
    this.listeners.forEach((unsubscribe) => unsubscribe());
  }
}
