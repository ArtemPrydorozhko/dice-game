import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import Environment from './Environment.js';
import Floor from './Floor.js';
import ResourceLoader from '../utils/ResourceLoader.js';
import Board from './Board.js';
import Dice from './Dice.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import urlBuilder from '../utils/urlBuilder.js';

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
    this.environment = new Environment();
    this.scene.add(this.environment.ambientLight);
    this.scene.add(this.environment.directionalLight);
    // this.scene.add(this.environment.cameraHelper);
    this.floorTextures = {};
    [
      this.diceModel,
      this.boardModel,
      this.floorTextures.colorTexture,
      this.floorTextures.armTexture,
      this.floorTextures.normalTexture,
    ] = await Promise.all([
      this.resourceLoader.load({
        type: 'gltfModel',
        path: urlBuilder.buildUrl('/models/dice/dice.glb'),
      }),
      this.resourceLoader.load({
        type: 'gltfModel',
        path: urlBuilder.buildUrl('/models/board/board.glb'),
      }),
      this.resourceLoader.load({
        type: 'texture',
        path: urlBuilder.buildUrl('/textures/floor/worn_planks_diff_2k.jpg'),
      }),
      this.resourceLoader.load({
        type: 'texture',
        path: urlBuilder.buildUrl('/textures/floor/worn_planks_arm_2k.jpg'),
      }),
      this.resourceLoader.load({
        type: 'texture',
        path: urlBuilder.buildUrl('/textures/floor/worn_planks_nor_gl_2k.png'),
      }),
    ]);
    this.floorTextures.colorTexture.colorSpace = THREE.SRGBColorSpace;
    Object.values(this.floorTextures).forEach((texture) => {
      texture.repeat.set(2, 2);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
    });
    this.floor = new Floor(this.floorTextures);
    this.scene.add(this.floor.mesh);
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
