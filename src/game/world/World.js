import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import Environment from './Environment.js';
import Floor from './Floor.js';
import ResourceLoader from '../utils/ResourceLoader.js';
import Board from './Board.js';
import Dice from './Dice.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import urlBuilder from '../utils/urlBuilder.js';
import EventBus from '../utils/EventBus.js';

export default class World {
  constructor(camera) {
    this.camera = camera;
    this.listeners = [];
    this.scene = new THREE.Scene();
    this.resourceLoader = new ResourceLoader();

    this.physicWorld = new CANNON.World();
    this.physicWorld.gravity.set(0, -9.82, 0);
    this.physicDiceMaterial = new CANNON.Material('diceMaterial');
    const physicDiceContactMaterial = new CANNON.ContactMaterial(
      this.physicDiceMaterial,
      this.physicDiceMaterial,
      {
        friction: 0.03,
        restitution: 0.2,
      },
    );
    this.physicWorld.addContactMaterial(physicDiceContactMaterial);
    this.physicBoardMaterial = new CANNON.Material('boardMaterial');
    const physicBoardContactMaterial = new CANNON.ContactMaterial(
      this.physicDiceMaterial,
      this.physicBoardMaterial,
      {
        friction: 0.1,
        restitution: 0.6,
      },
    );
    this.physicWorld.addContactMaterial(physicBoardContactMaterial);

    this.physicalDices = new Set();

    this.events = new EventEmitter();
    this.eventBus = EventBus.getInstance();

    this.setWorld();
  }

  async setWorld() {
    this.environment = new Environment();
    this.scene.add(this.environment.ambientLight);
    this.scene.add(this.environment.directionalLight);
    // this.scene.add(this.environment.cameraHelper);

    await this.loadResources();

    this.floor = new Floor(this.floorTextures);
    this.scene.add(this.floor.mesh);
    this.board = new Board(this.boardModel, this.physicBoardMaterial);
    this.scene.add(this.board.object);
    this.physicWorld.addBody(this.board.body);
    this.board.restrictionWalls.forEach((wall) => {
      this.physicWorld.addBody(wall);
    });

    const listener = new THREE.AudioListener();
    this.camera.threeJSCamera.add(listener);
    this.backgroundMusic = new THREE.Audio(listener);
    this.backgroundMusic.setBuffer(this.backgroundMusicBuffer);
    this.backgroundMusic.setLoop(true);
    this.backgroundMusic.setVolume(0.5);

    const start = this.start.bind(this);
    this.eventBus.on('loadingOverlay.play', start);
    this.listeners.push(() => {
      this.eventBus.removeListener('loadingOverlay.play', start);
    });
  }

  createDice(physics = true, addToScene = true) {
    const dice = new Dice(
      this.diceModel,
      physics,
      this.physicDiceMaterial,
      this.diceHitboardSound,
      this.diceHitDiceSound,
    );
    if (addToScene) {
      this.scene.add(dice.object);
    }
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

  start() {
    this.backgroundMusic.play();
    // this.events.emit('ready');
  }

  async loadResources() {
    this.diceHitboardSound = new Audio(
      urlBuilder.buildUrl('/sounds/dice-hit-board.mp3'),
    );
    this.diceHitDiceSound = new Audio(
      urlBuilder.buildUrl('/sounds/dice-hit-dice.mp3'),
    );

    this.resourceLoader.loadingManager.onProgress = (
      _url,
      itemsLoaded,
      itemsTotal,
    ) => {
      this.eventBus.emit('assetLoadingProgress', itemsLoaded / itemsTotal);
    };
    this.resourceLoader.loadingManager.onLoad = () => {
      setTimeout(() => {
        this.eventBus.emit('assetLoadingComplete');
      }, 500);
    };

    this.floorTextures = {};
    [
      this.diceModel,
      this.boardModel,
      this.floorTextures.colorTexture,
      this.floorTextures.armTexture,
      this.floorTextures.normalTexture,
      this.backgroundMusicBuffer,
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
      this.resourceLoader.load({
        type: 'audio',
        path: urlBuilder.buildUrl('/sounds/background-music.mp3'),
      }),
    ]);

    this.floorTextures.colorTexture.colorSpace = THREE.SRGBColorSpace;
    Object.values(this.floorTextures).forEach((texture) => {
      texture.repeat.set(2, 2);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
    });
  }
}
