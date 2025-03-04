import * as CANNON from 'cannon-es';
import * as THREE from 'three';

const y = 2;
const restrictionWallpositions = [
  { x: -4.8, y, z: 0 },
  { x: 4.8, y, z: 0 },
  { x: 4.24, y, z: 4, rotationY: -0.28 },
  { x: -4.24, y, z: 4, rotationY: 0.28 },
  { x: -3.1, y, z: 6.8, rotationY: 0.6, sizeZ: 2 },
  { x: 3.1, y, z: 6.8, rotationY: -0.6, sizeZ: 2 },
  { x: -1.7, y, z: 8.2, rotationY: 0.97, sizeZ: 2 },
  { x: 1.7, y, z: 8.2, rotationY: -0.97, sizeZ: 2 },
  { x: 0, y, z: 8.8, rotationY: 1.58, sizeZ: 2 },
  { x: 0, y, z: -8.8, rotationY: -1.58, sizeZ: 2 },
  { x: -1.7, y, z: -8.2, rotationY: -0.97, sizeZ: 2 },
  { x: 1.7, y, z: -8.2, rotationY: 0.97, sizeZ: 2 },
  { x: -3.1, y, z: -6.8, rotationY: -0.6, sizeZ: 2 },
  { x: 3.1, y, z: -6.8, rotationY: 0.6, sizeZ: 2 },
  { x: 4.24, y, z: -4, rotationY: 0.28 },
  { x: -4.24, y, z: -4, rotationY: -0.28 },
];

export default class Board {
  constructor(model, physicMaterial) {
    this.object = model.scene.children[0].clone();
    this.object.castShadow = true;
    this.object.receiveShadow = true;

    const plane = new CANNON.Plane();
    this.body = new CANNON.Body({
      mass: 0,
      shape: plane,
      material: physicMaterial,
    });
    this.body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.body.position.y = 1;

    this.setRestrictionWalls();
  }

  setRestrictionWalls() {
    this.restrictionWalls = [];
    for (let i = 0; i < restrictionWallpositions.length; i++) {
      const position = restrictionWallpositions[i];
      const size = 4;
      const halfExtents = new CANNON.Vec3(
        0.25,
        5,
        position.sizeZ / 2 || size / 2,
      );
      const boxShape = new CANNON.Box(halfExtents);
      const boxBody = new CANNON.Body({ mass: 0, shape: boxShape });
      this.restrictionWalls.push(boxBody);

      // show restriction walls
      //   const box = new THREE.Mesh(
      //     new THREE.BoxGeometry(0.5, 10, position.sizeZ || size),
      //     new THREE.MeshBasicMaterial({ color: 0x0000ff })
      //   );
      // scene.add(box);
      //   box.position.x = position.x;
      //   box.position.y = position.y;
      //   box.position.z = position.z;
      const positionVec = new THREE.Vector3(position.x, position.y, position.z);
      const quaternion = new THREE.Quaternion();
      if (position.rotationY) {
        // box.rotation.y = position.rotationY;
        quaternion.setFromEuler(new THREE.Euler(0, position.rotationY, 0));
      }
      boxBody.position.copy(positionVec);
      boxBody.quaternion.copy(quaternion);
    }
  }
}
