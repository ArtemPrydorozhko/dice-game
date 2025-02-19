import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import Environment from './Environment.js';
import Floor from './Floor.js';
import ResourceLoader from '../utils/ResourceLoader.js';
import Board from './Board.js';
import Dice from './Dice.js';
import { EventEmitter } from '../utils/EventEmitter.js';

export default class World {
  constructor() {
    this.scene = new THREE.Scene();
    this.resourceLoader = new ResourceLoader();

    this.physicWorld = new CANNON.World();
    this.physicWorld.gravity.set(0, -9.82, 0);

    this.physicalDices = new Set();

    this.events = new EventEmitter();

    this.setWorld();
  }

  async setWorld() {
    this.floor = new Floor();
    this.scene.add(this.floor.mesh);

    this.environment = new Environment();
    this.scene.add(this.environment.ambientLight);
    this.scene.add(this.environment.directionalLight);
    // this.scene.add(this.environment.cameraHelper);

    [this.diceModel, this.boardModel] = await Promise.all([
      this.resourceLoader.load({
        type: 'gltfModel',
        path: '/models/dice/dice.glb',
      }),
      this.resourceLoader.load({
        type: 'gltfModel',
        path: '/models/board/board.glb',
      }),
    ]);
    this.board = new Board(this.boardModel);
    this.scene.add(this.board.object);
    this.physicWorld.addBody(this.board.body);
    this.board.restrictionWalls.forEach((wall) => {
      this.physicWorld.addBody(wall);
    });

    this.events.emit('ready');
  }

  createDice(physics = true) {
    const dice = new Dice(this.diceModel, physics);
    this.scene.add(dice.object);
    if (physics) {
      this.physicWorld.addBody(dice.body);
      this.physicalDices.add(dice);
    }
    return dice;
  }

  removeDice(dice) {
    this.scene.remove(dice.object);
    if (dice.physics) {
      this.physicWorld.removeBody(dice.body);
      this.physicalDices.delete(dice);
    }
    dice.destroy();
  }

  update() {
    this.physicWorld.fixedStep();
    this.physicalDices.forEach((dice) => {
      dice.syncWithPhysics();
    });
  }
}
