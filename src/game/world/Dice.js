import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const faceVectors = [
  {
    vector: new THREE.Vector3(1, 0, 0),
    face: 2,
  },
  {
    vector: new THREE.Vector3(-1, 0, 0),
    face: 5,
  },
  {
    vector: new THREE.Vector3(0, 1, 0),
    face: 6,
  },
  {
    vector: new THREE.Vector3(0, -1, 0),
    face: 1,
  },
  {
    vector: new THREE.Vector3(0, 0, 1),
    face: 4,
  },
  {
    vector: new THREE.Vector3(0, 0, -1),
    face: 3,
  },
];

export default class Dice {
  constructor(model, physics) {
    this.physics = physics;
    this.object = model.scene.children[0].clone();
    this.object.scale.setScalar(0.35);
    this.object.castShadow = true;
    this.object.recieveShadow = true;
    this.object.children.forEach((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });

    if (physics) {
      const shape = new CANNON.Box(new CANNON.Vec3(0.35, 0.35, 0.35));
      this.body = new CANNON.Body({ mass: 0.75, shape: shape });
      this.body.position.copy(this.object.position);
      this.body.quaternion.copy(this.object.quaternion);
    }
  }

  getTopFace() {
    for (const faceVector of faceVectors) {
      const rotatedVector = faceVector.vector
        .clone()
        .applyEuler(this.object.rotation);

      if (Math.round(rotatedVector.y) == 1) {
        return faceVector.face;
      }
    }
  }

  rotateDiceFromFace(face) {
    if (face === 1) {
      this.object.rotation.x = Math.PI;
    } else if (face === 2) {
      this.object.rotation.z = Math.PI / 2;
    } else if (face === 3) {
      this.object.rotation.x = Math.PI / 2;
    } else if (face === 4) {
      this.object.rotation.x = -Math.PI / 2;
    } else if (face === 5) {
      this.object.rotation.z = -Math.PI / 2;
    } else {
      this.object.rotation.set(0, 0, 0);
    }
  }

  syncWithPhysics() {
    if (this.physics) {
      this.object.position.copy(this.body.position);
      this.object.quaternion.copy(this.body.quaternion);
    }
  }

  destroy() {
    this.object.children.forEach((child) => {
      child.geometry.dispose();
      child.material.dispose();
    });
  }
}
