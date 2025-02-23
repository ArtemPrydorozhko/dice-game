import * as THREE from 'three';

export default class Floor {
  constructor(textures) {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({
        map: textures.colorTexture,
        normalMap: textures.normalTexture,
        aoMap: textures.armTexture,
        roughnessMap: textures.armTexture,
        metalnessMap: textures.armTexture,
      }),
    );
    this.mesh.receiveShadow = true;
    this.mesh.rotation.x = -Math.PI * 0.5;
  }
}
