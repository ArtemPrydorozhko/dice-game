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
  constructor(model, physics, physicMaterial, boardHitSound, diceHitSound) {
    this.physics = physics;
    this.object = model.scene.children[0].clone();
    this.object.scale.setScalar(0.35);
    this.object.castShadow = true;
    this.object.recieveShadow = true;
    this.object.children.forEach((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });
    this.listeners = [];

    if (physics) {
      const shape = new CANNON.Box(new CANNON.Vec3(0.35, 0.35, 0.35));
      this.body = new CANNON.Body({
        mass: 0.75,
        shape,
        material: physicMaterial,
      });
      this.body.position.copy(this.object.position);
      this.body.quaternion.copy(this.object.quaternion);

      this.boardHitSound = boardHitSound;
      this.diceHitSound = diceHitSound;

      const onCollide = this.onCollide.bind(this);
      this.body.addEventListener('collide', onCollide);
      this.listeners.push(() => {
        this.body.removeEventListener('collide', onCollide);
      });
    }
  }

  getPosition() {
    const { x, y, z } = this.object.position;
    return { x, y, z };
  }

  getRotation() {
    const { x, y, z } = this.object.rotation;
    return { x, y, z };
  }

  setPosition(x, y, z) {
    this.object.position.set(x, y, z);
    if (this.physics) {
      this.body.position.copy(this.object.position);
    }
  }

  setRotation(x, y, z) {
    this.object.rotation.set(x, y, z);
    if (this.physics) {
      this.body.quaternion.copy(this.object.quaternion);
    }
  }

  applyForce(forceX, forceY, forceZ, pointX, pointY, pointZ) {
    if (this.physics) {
      this.body.applyForce(
        new CANNON.Vec3(forceX, forceY, forceZ),
        new CANNON.Vec3(pointX, pointY, pointZ),
      );
    }
  }

  onCollide(collision) {
    if (
      collision.body.material?.name !== 'boardMaterial' &&
      collision.body.material?.name !== 'diceMaterial'
    ) {
      return;
    }

    const maxImpact = 5;
    const minImpact = 1;
    const impact = Math.min(
      collision.contact.getImpactVelocityAlongNormal(),
      maxImpact,
    );
    if (impact < minImpact) {
      return;
    }

    // normalize to [1, 0.1] range
    const normalizedImpact =
      ((impact - minImpact) / (maxImpact - minImpact)) * 0.9 + 0.1;

    const impactSound =
      collision.body.material.name === 'boardMaterial'
        ? this.boardHitSound
        : this.diceHitSound;

    impactSound.currentTime = 0;
    impactSound.volume = normalizedImpact;
    impactSound.play();
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
    this.listeners.forEach((removeListener) => removeListener());
  }
}
