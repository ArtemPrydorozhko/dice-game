import * as THREE from 'three';

export default class Floor {
  constructor() {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({
        color: '#444444',
        metalness: 0,
        roughness: 0.5,
      }),
    );
    this.mesh.receiveShadow = true;
    this.mesh.rotation.x = -Math.PI * 0.5;
  }
}
