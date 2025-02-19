import * as CANNON from 'cannon-es';
import Debug from '../utils/Debug.js';
import { wait } from '../utils/time.js';
import { MainMenu } from '../ui/MainMenu.js';
import { ControllPanel } from '../ui/ControllPanel.js';
import DiceCombination from './DiceCombination.js';
import { EventEmitter } from '../utils/EventEmitter.js';

const p1DicePositions = [
  { x: 6.3, y: 2.15, z: 2 },
  { x: 6.1, y: 2.15, z: 3.75 },
  { x: 5.65, y: 2.15, z: 5.45 },
  { x: 4.85, y: 2.15, z: 7.1 },
  { x: 3.6, y: 2.15, z: 8.35 },
];
const p2DicePositions = p1DicePositions.map((coords) => ({
  x: -coords.x,
  y: coords.y,
  z: -coords.z,
}));

export default class Controller {
  constructor(world, userPointerHelper, renderer) {
    this.world = world;
    this.userPointerHelper = userPointerHelper;
    this.renderer = renderer;
    this.p1Turn = true;
    this.rollingDices = [];
    this.p1Dices = [];
    this.p2Dices = [];
    this.selectedDices = new Set();
    this.rollingDelay = 5000;
    this.events = new EventEmitter();

    this.gameSteps = [
      'Player 1 rolling',
      'Player 2 rolling',
      'Player 1 selecting',
      'Player 1 rerolling',
      'Player 2 selecting',
      'Player 2 rerolling',
      'Result',
      'Restart',
    ];
    this.currentStep = 0;

    this.onWorldReady = this.startGame.bind(this);
    this.world.events.on('ready', this.onWorldReady);

    this.mainMenu = new MainMenu();
    this.onPlay1 = this.play1.bind(this);
    this.mainMenu.events.on('play1', this.onPlay1);

    this.controllPanel = new ControllPanel();
    this.onAction = this.nextAction.bind(this);
    this.controllPanel.events.on('action', this.onAction);

    this.onSelectDice = this.selectDice.bind(this);
    this.userPointerHelper.events.on('click', this.onSelectDice);

    this.debug = Debug.getInstance();
    if (this.debug.active) {
      this.debugFolder = this.debug.ui.addFolder('Game Controller');
      this.debugFolder.add(this, 'play1');
      this.debugFolder.add(this, 'createTest');
      this.debugFolder.add(this, 'removePlayerDices');
    }
  }

  startGame() {
    this.mainMenu.open();
  }

  async play1() {
    this.currentStep = -1;
    this.mainMenu.close();
    this.controllPanel.update('Player 1 turn', 'Roll');
    this.controllPanel.open();
  }

  async nextAction() {
    this.currentStep++;
    const currentState = this.gameSteps[this.currentStep];

    if (currentState === 'Player 1 rolling') {
      this.p1Turn = true;
      this.controllPanel.update('Player 1 rolling...');
      await this.rollPlayerDices();
      this.controllPanel.update('Player 2 turn', 'Roll');
      return;
    }

    if (currentState === 'Player 2 rolling') {
      this.p1Turn = false;
      this.controllPanel.update('Player 2 rolling...');
      await this.rollPlayerDices();
      this.nextAction();
      return;
    }

    if (currentState === 'Player 1 selecting') {
      this.p1Turn = true;
      this.controllPanel.update(
        'Player 1 selecting dices to reroll...',
        'Reroll selected',
      );
      return;
    }

    if (currentState === 'Player 1 rerolling') {
      if (this.selectedDices.size === 0) {
        this.nextAction();
        return;
      }

      this.p1Turn = true;
      this.controllPanel.update('Player 1 rerolling...');
      await this.rollSelectedDices();
      this.nextAction();
      return;
    }

    if (currentState === 'Player 2 selecting') {
      this.p1Turn = false;
      this.controllPanel.update(
        'Player 2 selecting dices to reroll...',
        'Reroll selected',
      );
      return;
    }

    if (currentState === 'Player 2 rerolling') {
      if (this.selectedDices.size === 0) {
        this.nextAction();
        return;
      }

      this.p1Turn = false;
      this.controllPanel.update('Player 2 rerolling...');
      await this.rollSelectedDices();
      this.nextAction();

      return;
    }

    if (currentState === 'Result') {
      const p1Faces = this.p1Dices.map((dice) => dice.getTopFace());
      const p2Faces = this.p2Dices.map((dice) => dice.getTopFace());
      const p1Combination = new DiceCombination(p1Faces);
      const p2Combination = new DiceCombination(p2Faces);
      const result = DiceCombination.compareCombinations(
        p1Combination,
        p2Combination,
      );
      const resultText =
        result === 1
          ? 'Player 1 wins'
          : result === -1
            ? 'Player 2 wins'
            : 'Draw';
      this.controllPanel.update(resultText, 'Play again');
      return;
    }

    if (currentState === 'Restart') {
      this.removePlayerDices();
      this.play1();
      return;
    }
  }

  async rollPlayerDices() {
    this.rollDices(5);
    await wait(this.rollingDelay);
    this.setPlayerDices();
    this.removeRollingDices();
  }

  async rollSelectedDices() {
    const playerDices = this.p1Turn ? this.p1Dices : this.p2Dices;
    const order = Array.from(this.selectedDices.values()).map((selectedDice) =>
      playerDices.indexOf(selectedDice),
    );
    this.removeSelected();

    this.rollDices(order.length);
    await wait(this.rollingDelay);
    this.setPlayerDices(order);
    this.removeRollingDices();
  }

  removePlayerDices() {
    this.p1Dices.forEach((dice) => {
      this.world.removeDice(dice);
    });
    this.p2Dices.forEach((dice) => {
      this.world.removeDice(dice);
    });
    this.p1Dices = [];
    this.p2Dices = [];
  }

  removeSelected() {
    this.selectedDices.forEach((dice) => {
      this.world.removeDice(dice);
    });
    this.selectedDices.clear();
    this.renderer.setSelecteObjects([]);
  }

  createTest() {
    const dice = this.world.createDice(false);
    this.debugFolder.add(dice.object.position, 'x');
    this.debugFolder.add(dice.object.position, 'y');
    this.debugFolder.add(dice.object.position, 'z');
    this.debugFolder.add(dice.object.rotation, 'x');
    this.debugFolder.add(dice.object.rotation, 'y');
    this.debugFolder.add(dice.object.rotation, 'z');
  }

  rollDices(amount) {
    const startingPositions = [
      [1, 4, 5],
      [-0.2, 4, 5.5],
      [-1, 4, 4],
      [-0.1, 4, 3],
      [0.5, 4, 3.8],
    ];

    const forceRangeX = [-50, 50];
    const forceRangeY = [-50, 50];
    const forceRangeZ = [-250, -500];

    const positionDeviation = Math.random() - 0.5;
    const forcePointCoord = Math.random() * 0.05 + 0.05;
    const forceX =
      Math.random() * (forceRangeX[1] - forceRangeX[0]) + forceRangeX[0];
    const forceY =
      Math.random() * (forceRangeY[1] - forceRangeY[0]) + forceRangeY[0];
    const forceZ =
      Math.random() * (forceRangeZ[1] - forceRangeZ[0]) + forceRangeZ[0];

    for (let i = 0; i < amount; i++) {
      const dice = this.world.createDice(true);

      dice.object.position.set(
        startingPositions[i][0] + positionDeviation,
        startingPositions[i][1] + positionDeviation,
        startingPositions[i][2] + positionDeviation,
      );

      dice.object.rotation.x = Math.random() * 2 * Math.PI;
      dice.object.rotation.y = Math.random() * 2 * Math.PI;
      dice.object.rotation.z = Math.random() * 2 * Math.PI;

      dice.body.position.copy(dice.object.position);
      dice.body.quaternion.copy(dice.object.quaternion);

      dice.body.applyForce(
        new CANNON.Vec3(forceX, forceY, forceZ),
        new CANNON.Vec3(forcePointCoord, forcePointCoord, forcePointCoord),
      );

      this.rollingDices.push(dice);
    }
  }

  removeRollingDices() {
    this.rollingDices.forEach((dice) => {
      this.world.removeDice(dice);
    });
    this.rollingDices = [];
  }

  setPlayerDices(order) {
    const defaultOrder = [0, 1, 2, 3, 4];
    order = order || defaultOrder;

    const dicePositions = this.p1Turn ? p1DicePositions : p2DicePositions;
    const playerDices = this.p1Turn ? this.p1Dices : this.p2Dices;
    this.rollingDices.forEach((boardDice, i) => {
      const playerDice = this.world.createDice(false);
      const position = order[i];
      playerDice.object.position.set(
        dicePositions[position].x,
        dicePositions[position].y,
        dicePositions[position].z,
      );
      const diceTopFace = boardDice.getTopFace();
      playerDice.rotateDiceFromFace(diceTopFace);
      playerDices[position] = playerDice;
    });
  }

  selectDice() {
    const currentState = this.gameSteps[this.currentStep];
    if (
      currentState !== 'Player 1 selecting' &&
      currentState !== 'Player 2 selecting'
    ) {
      return;
    }
    const playerDices = this.p1Turn ? this.p1Dices : this.p2Dices;
    const intersection = this.userPointerHelper.getIntersectedObject(
      playerDices.map((dice) => dice.object),
    );

    if (!intersection) {
      return;
    }

    const selectedDice = playerDices.find(
      (dice) => dice.object === intersection.object.parent,
    );

    if (this.selectedDices.has(selectedDice)) {
      this.selectedDices.delete(selectedDice);
    } else {
      this.selectedDices.add(selectedDice);
    }

    this.renderer.setSelecteObjects(
      Array.from(this.selectedDices).map((dice) => dice.object),
    );
  }
}
