import * as CANNON from 'cannon-es';
import Debug from '../utils/Debug.js';
import { wait } from '../utils/time.js';
import DiceCombination from './DiceCombination.js';
import StateMachine from '../utils/StateMachine.js';
import EventBus from '../utils/EventBus.js';
import { WebRTCTransport } from '../../transport/WebRTC.js';
import { RemotePlayer } from './RemotePlayer.js';

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
    this.eventBus = EventBus.getInstance();
    this.host = false;
    this.singlePlayer = true;
    this.remotePlayer = null;

    this.onWorldReady = this.startGame.bind(this);
    this.world.events.on('ready', this.onWorldReady);

    this.onPlay1 = this.play1.bind(this);
    this.eventBus.on('play1', this.onPlay1);

    this.onPlay2 = this.play2.bind(this);
    this.eventBus.on('play2', this.onPlay2);

    this.onAction = this.nextAction.bind(this);
    this.eventBus.on('controllPanel.action', this.onAction);

    this.onSelectDice = this.selectDice.bind(this);
    this.userPointerHelper.events.on('click', this.onSelectDice);

    this.p1RoundsWon = 0;
    this.p2RoundsWon = 0;
    this.rounds = 3;

    this.setStateMachine();

    this.debug = Debug.getInstance();
    if (this.debug.active) {
      this.debugFolder = this.debug.ui.addFolder('Game Controller');
      this.debugFolder.add(this, 'play1');
      this.debugFolder.add(this, 'createTest');
      this.debugFolder.add(this, 'removePlayerDices');
    }
  }

  setStateMachine() {
    this.states = {
      Preparation: 'Preparation',
      Player1ToRoll: 'Player1ToRoll',
      Player2ToRoll: 'Player2ToRoll',
      Player1Rolling: 'Player1Rolling',
      Player2Rolling: 'Player2Rolling',
      Player1Selecting: 'Player1Selecting',
      Player2Selecting: 'Player2Selecting',
      Player1Rerolling: 'Player1Rerolling',
      Player2Rerolling: 'Player2Rerolling',
      EndOfRound: 'EndOfRound',
      EndOfGame: 'EndOfGame',
    };

    this.triggers = {
      PlayerRolled: 'PlayerRolled',
      PlayerDicesLanded: 'PlayerDiceLanded',
      PlayerSelected: 'PlayerSelected',
      PlayerSkippedReroll: 'PlayerSkippedReroll',
      RoundEnded: 'RoundEnded',
      RoundStarted: 'RoundStarted',
      GameEnded: 'GameEnded',
    };

    this.stateMachine = new StateMachine({
      initialState: this.states.Preparation,
      states: {
        [this.states.Preparation]: {
          on: {
            [this.triggers.RoundStarted]: {
              target: this.states.Player1ToRoll,
            },
          },
        },
        [this.states.Player1ToRoll]: {
          on: {
            [this.triggers.PlayerRolled]: {
              target: this.states.Player1Rolling,
            },
          },
          onEntry: async () => {
            this.removePlayerDices();
            this.p1Turn = true;
            this.eventBus.emit(
              'controllPanel.updateContent',
              'Player 1 turn',
              this.singlePlayer || this.host ? 'Roll' : undefined,
            );
            if (!this.singlePlayer && !this.host) {
              await this.remotePlayer.getSync();
              this.stateMachine.trigger(this.triggers.PlayerRolled);
              this.remotePlayer.sendSync();
            }
          },
        },
        [this.states.Player1Rolling]: {
          on: {
            [this.triggers.PlayerDicesLanded]: {
              target: this.states.Player2ToRoll,
            },
          },
          onEntry: async () => {
            this.eventBus.emit(
              'controllPanel.updateContent',
              'Player 1 rolling...',
            );
            if (this.singlePlayer) {
              await this.rollPlayerDices();
            } else if (this.host) {
              this.remotePlayer.sendSync();
              await this.remotePlayer.getSync();
              const rollParameters = this.generateRollParameters(5);
              this.remotePlayer.sendRollParameters(rollParameters);
              this.rollDicesWithParameters(rollParameters);
              await wait(this.rollingDelay);
              const rolledDicesParameters = this.getRolledDicesParameters();
              this.remotePlayer.sendRolledDicesParameters(
                rolledDicesParameters,
              );
              this.setPlayerDices();
              this.removeRollingDices();
            } else {
              const rollParameters =
                await this.remotePlayer.getRollParameters();
              this.rollDicesWithParameters(rollParameters);

              const rolledDicesParameters =
                await this.remotePlayer.getRolledDicesParameters();
              this.adjustRolledDices(rolledDicesParameters);
              this.setPlayerDices();
              this.removeRollingDices();
            }
            this.stateMachine.trigger(this.triggers.PlayerDicesLanded);
          },
        },
        [this.states.Player2ToRoll]: {
          on: {
            [this.triggers.PlayerRolled]: {
              target: this.states.Player2Rolling,
            },
          },
          onEntry: async () => {
            this.p1Turn = false;
            this.eventBus.emit(
              'controllPanel.updateContent',
              'Player 2 turn',
              this.singlePlayer || !this.host ? 'Roll' : undefined,
            );
            if (!this.singlePlayer && this.host) {
              await this.remotePlayer.getSync();
              this.stateMachine.trigger(this.triggers.PlayerRolled);
              this.remotePlayer.sendSync();
            }
          },
        },
        [this.states.Player2Rolling]: {
          on: {
            [this.triggers.PlayerDicesLanded]: {
              target: this.states.Player1Selecting,
            },
          },
          onEntry: async () => {
            this.eventBus.emit(
              'controllPanel.updateContent',
              'Player 2 rolling...',
            );
            if (this.singlePlayer) {
              await this.rollPlayerDices();
            } else if (!this.host) {
              this.remotePlayer.sendSync();
              await this.remotePlayer.getSync();
              const rollParameters = this.generateRollParameters(5);
              this.remotePlayer.sendRollParameters(rollParameters);
              this.rollDicesWithParameters(rollParameters);
              await wait(this.rollingDelay);
              const rolledDicesParameters = this.getRolledDicesParameters();
              this.remotePlayer.sendRolledDicesParameters(
                rolledDicesParameters,
              );
              this.setPlayerDices();
              this.removeRollingDices();
            } else {
              const rollParameters =
                await this.remotePlayer.getRollParameters();
              this.rollDicesWithParameters(rollParameters);

              const rolledDicesParameters =
                await this.remotePlayer.getRolledDicesParameters();
              this.adjustRolledDices(rolledDicesParameters);
              this.setPlayerDices();
              this.removeRollingDices();
            }
            this.stateMachine.trigger(this.triggers.PlayerDicesLanded);
          },
        },
        [this.states.Player1Selecting]: {
          on: {
            [this.triggers.PlayerSelected]: {
              target: this.states.Player1Rerolling,
            },
            [this.triggers.PlayerSkippedReroll]: {
              target: this.states.Player2Selecting,
            },
          },
          onEntry: async () => {
            this.p1Turn = true;
            this.eventBus.emit(
              'controllPanel.updateContent',
              'Player 1 selecting dices to reroll...',
              this.singlePlayer || this.host ? 'Reroll selected' : undefined,
            );
            if (!this.singlePlayer && !this.host) {
              await this.remotePlayer.getSync();
              this.stateMachine.trigger(this.triggers.PlayerSelected);
              this.remotePlayer.sendSync();
            }
          },
        },
        [this.states.Player1Rerolling]: {
          on: {
            [this.triggers.PlayerDicesLanded]: {
              target: this.states.Player2Selecting,
            },
          },
          onEntry: async () => {
            this.eventBus.emit(
              'controllPanel.updateContent',
              'Player 1 rerolling...',
            );
            if (this.singlePlayer) {
              await this.rollSelectedDices();
            } else if (this.host) {
              this.remotePlayer.sendSync();
              await this.remotePlayer.getSync();

              const playerDices = this.p1Turn ? this.p1Dices : this.p2Dices;
              const order = Array.from(this.selectedDices.values()).map(
                (selectedDice) => playerDices.indexOf(selectedDice),
              );
              this.remotePlayer.sendRerollOrder(order);

              await this.remotePlayer.getSync();
              this.removeSelected();
              const rollParameters = this.generateRollParameters(order.length);
              this.remotePlayer.sendRollParameters(rollParameters);
              this.rollDicesWithParameters(rollParameters);

              await wait(this.rollingDelay);
              const rolledDicesParameters = this.getRolledDicesParameters();
              this.remotePlayer.sendRolledDicesParameters(
                rolledDicesParameters,
              );
              this.setPlayerDices(order);
              this.removeRollingDices();
            } else {
              const order = await this.remotePlayer.getRerollOrder();
              if (order.length === 0) {
                this.stateMachine.trigger(this.triggers.PlayerDicesLanded);
                return;
              }
              this.remotePlayer.sendSync();
              const rollParameters =
                await this.remotePlayer.getRollParameters();
              const playerDices = this.p1Turn ? this.p1Dices : this.p2Dices;
              order.forEach((position) => {
                this.selectedDices.add(playerDices[position]);
              });
              this.removeSelected();
              this.rollDicesWithParameters(rollParameters);

              const rolledDicesParameters =
                await this.remotePlayer.getRolledDicesParameters();
              this.adjustRolledDices(rolledDicesParameters);
              this.setPlayerDices(order);
              this.removeRollingDices();
            }
            this.stateMachine.trigger(this.triggers.PlayerDicesLanded);
          },
        },
        [this.states.Player2Selecting]: {
          on: {
            [this.triggers.PlayerSelected]: {
              target: this.states.Player2Rerolling,
            },
            [this.triggers.PlayerSkippedReroll]: {
              target: this.states.EndOfRound,
            },
          },
          onEntry: async () => {
            this.p1Turn = false;
            this.eventBus.emit(
              'controllPanel.updateContent',
              'Player 2 selecting dices to reroll...',
              this.singlePlayer || !this.host ? 'Reroll selected' : undefined,
            );
            if (!this.singlePlayer && this.host) {
              await this.remotePlayer.getSync();
              this.stateMachine.trigger(this.triggers.PlayerSelected);
              this.remotePlayer.sendSync();
            }
          },
        },
        [this.states.Player2Rerolling]: {
          on: {
            [this.triggers.PlayerDicesLanded]: {
              target: this.states.EndOfRound,
            },
          },
          onEntry: async () => {
            this.eventBus.emit(
              'controllPanel.updateContent',
              'Player 2 rerolling...',
            );
            if (this.singlePlayer) {
              await this.rollSelectedDices();
            } else if (!this.host) {
              this.remotePlayer.sendSync();
              await this.remotePlayer.getSync();

              const playerDices = this.p1Turn ? this.p1Dices : this.p2Dices;
              const order = Array.from(this.selectedDices.values()).map(
                (selectedDice) => playerDices.indexOf(selectedDice),
              );
              this.remotePlayer.sendRerollOrder(order);

              await this.remotePlayer.getSync();
              this.removeSelected();
              const rollParameters = this.generateRollParameters(order.length);
              this.remotePlayer.sendRollParameters(rollParameters);
              this.rollDicesWithParameters(rollParameters);

              await wait(this.rollingDelay);
              const rolledDicesParameters = this.getRolledDicesParameters();
              this.remotePlayer.sendRolledDicesParameters(
                rolledDicesParameters,
              );
              this.setPlayerDices(order);
              this.removeRollingDices();
            } else {
              const order = await this.remotePlayer.getRerollOrder();
              if (order.length === 0) {
                this.stateMachine.trigger(this.triggers.PlayerDicesLanded);
                return;
              }
              this.remotePlayer.sendSync();
              const rollParameters =
                await this.remotePlayer.getRollParameters();
              const playerDices = this.p1Turn ? this.p1Dices : this.p2Dices;
              order.forEach((position) => {
                this.selectedDices.add(playerDices[position]);
              });
              this.removeSelected();
              this.rollDicesWithParameters(rollParameters);

              const rolledDicesParameters =
                await this.remotePlayer.getRolledDicesParameters();
              this.adjustRolledDices(rolledDicesParameters);
              this.setPlayerDices(order);
              this.removeRollingDices();
            }
            this.stateMachine.trigger(this.triggers.PlayerDicesLanded);
          },
        },
        [this.states.EndOfRound]: {
          on: {
            [this.triggers.GameEnded]: { target: this.states.EndOfGame },
            [this.triggers.RoundStarted]: { target: this.states.Player1ToRoll },
          },
          onEntry: () => {
            this.endRound();
          },
        },
        [this.states.EndOfGame]: {
          on: {
            [this.triggers.RoundStarted]: { target: this.states.Player1ToRoll },
          },
          onExit: () => {
            this.removePlayerDices();
            this.p1RoundsWon = 0;
            this.p2RoundsWon = 0;
            this.eventBus.emit('controllPanel.resetRounds');
          },
        },
      },
    });
  }

  startGame() {
    this.eventBus.emit('openMainMenu');
  }

  async play1() {
    this.eventBus.emit('closeMainMenu');
    this.eventBus.emit('controllPanel.show');
    this.stateMachine.trigger(this.triggers.RoundStarted);
  }

  async play2() {
    this.eventBus.emit('closeMainMenu');
    this.eventBus.emit('webRTCSetup.show');
    this.eventBus.on('webRTCSetup.host.start', this.onHostStart.bind(this));
    this.eventBus.on(
      'webRTCSetup.join.offerSet',
      this.onJoinOfferSet.bind(this),
    );
  }

  async onHostStart() {
    const webRTCTransport = new WebRTCTransport();
    webRTCTransport.events.on('offer', (offer) => {
      this.eventBus.emit('webRTCSetup.host.offerCreated', offer);
    });
    this.eventBus.on('webRTCSetup.host.answerSet', async (answer) => {
      await webRTCTransport.setAnswer(answer);
    });
    webRTCTransport.events.on('dataChannel.open', () => {
      this.eventBus.emit('webRTCSetup.hide');
      this.eventBus.emit('controllPanel.show');
      this.host = true;
      this.singlePlayer = false;
      this.remotePlayer = new RemotePlayer(webRTCTransport);
      this.stateMachine.trigger(this.triggers.RoundStarted);
    });

    await webRTCTransport.createOffer();
  }

  async onJoinOfferSet(offer) {
    const webRTCTransport = new WebRTCTransport();
    await webRTCTransport.createAnswer(offer);
    webRTCTransport.events.on('answer', (answer) => {
      this.eventBus.emit('webRTCSetup.join.answerCreated', answer);
    });
    webRTCTransport.events.on('dataChannel.open', () => {
      this.eventBus.emit('webRTCSetup.hide');
      this.eventBus.emit('controllPanel.show');
      this.singlePlayer = false;
      this.remotePlayer = new RemotePlayer(webRTCTransport);
      this.stateMachine.trigger(this.triggers.RoundStarted);
    });
  }

  async nextAction() {
    const currentState = this.stateMachine.state;
    switch (currentState) {
      case this.states.Player1ToRoll:
      case this.states.Player2ToRoll:
        this.stateMachine.trigger(this.triggers.PlayerRolled);
        break;
      case this.states.Player1Selecting:
      case this.states.Player2Selecting:
        if (this.selectedDices.size === 0) {
          this.remotePlayer.sendSync();
          await this.remotePlayer.getSync();
          this.remotePlayer.sendRerollOrder([]);
          this.stateMachine.trigger(this.triggers.PlayerSkippedReroll);
        } else {
          this.stateMachine.trigger(this.triggers.PlayerSelected);
        }
        break;
      case this.states.EndOfRound:
        this.stateMachine.trigger(this.triggers.RoundStarted);
        break;
      case this.states.EndOfGame:
        this.stateMachine.trigger(this.triggers.RoundStarted);
        break;
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
      const dice = this.world.createDice();

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

  generateRollParameters(amount) {
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

    const parameters = [];

    for (let i = 0; i < amount; i++) {
      const position = {
        x: startingPositions[i][0] + positionDeviation,
        y: startingPositions[i][1] + positionDeviation,
        z: startingPositions[i][2] + positionDeviation,
      };

      const rotation = {
        x: Math.random() * 2 * Math.PI,
        y: Math.random() * 2 * Math.PI,
        z: Math.random() * 2 * Math.PI,
      };

      parameters.push({
        position,
        rotation,
      });
    }

    return {
      diceParameters: parameters,
      forceParameters: {
        x: forceX,
        y: forceY,
        z: forceZ,
        point: forcePointCoord,
      },
    };
  }

  rollDicesWithParameters(rollParameters) {
    const { diceParameters, forceParameters } = rollParameters;

    for (let i = 0; i < diceParameters.length; i++) {
      const dice = this.world.createDice();

      const { position, rotation } = diceParameters[i];
      dice.object.position.set(position.x, position.y, position.z);
      dice.object.rotation.set(rotation.x, rotation.y, rotation.z);
      dice.body.position.copy(dice.object.position);
      dice.body.quaternion.copy(dice.object.quaternion);

      dice.body.applyForce(
        new CANNON.Vec3(
          forceParameters.x,
          forceParameters.y,
          forceParameters.z,
        ),
        new CANNON.Vec3(
          forceParameters.point,
          forceParameters.point,
          forceParameters.point,
        ),
      );

      this.rollingDices.push(dice);
    }
  }

  getRolledDicesParameters() {
    const rolledDicesParameters = this.rollingDices.map((dice) => ({
      position: {
        x: dice.object.position.x,
        y: dice.object.position.y,
        z: dice.object.position.z,
      },
      rotation: {
        x: dice.object.rotation.x,
        y: dice.object.rotation.y,
        z: dice.object.rotation.z,
      },
    }));
    return rolledDicesParameters;
  }

  adjustRolledDices(rolledDicesParameters) {
    this.rollingDices.forEach((dice, i) => {
      const face = dice.getTopFace();
      const dummyDice = this.world.createDice(false, false);
      const rotation = rolledDicesParameters[i].rotation;
      dummyDice.object.rotation.set(rotation.x, rotation.y, rotation.z);
      const actualFace = dummyDice.getTopFace();
      if (face !== actualFace) {
        dice.object.rotation.set(rotation.x, rotation.y, rotation.z);
      }
    });
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
    const currentState = this.stateMachine.state;
    if (
      currentState !== this.states.Player1Selecting &&
      currentState !== this.states.Player2Selecting
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

  endRound() {
    const p1Faces = this.p1Dices.map((dice) => dice.getTopFace());
    const p2Faces = this.p2Dices.map((dice) => dice.getTopFace());
    const p1Combination = new DiceCombination(p1Faces);
    const p2Combination = new DiceCombination(p2Faces);
    const result = DiceCombination.compareCombinations(
      p1Combination,
      p2Combination,
    );
    if (result === 1 || result === 0) {
      this.p1RoundsWon++;
    }
    if (result === -1 || result === 0) {
      this.p2RoundsWon++;
    }

    this.eventBus.emit(
      'controllPanel.updateRounds',
      this.p1RoundsWon,
      this.p2RoundsWon,
    );

    const isGameEnded = this.isGameEnded();
    if (isGameEnded) {
      const resultText =
        this.p1RoundsWon > this.p2RoundsWon ? 'Player 1 won!' : 'Player 2 won!';
      this.eventBus.emit(
        'controllPanel.updateContent',
        resultText,
        'Play again',
      );
      this.stateMachine.trigger(this.triggers.GameEnded);
      return;
    }

    const resultText =
      result === 1
        ? 'Player 1 won the round'
        : result === -1
          ? 'Player 2 won the round'
          : 'Draw';
    this.eventBus.emit('controllPanel.updateContent', resultText, 'Next round');
  }

  isGameEnded() {
    const maxWins = Math.ceil(this.rounds / 2);
    return this.p1RoundsWon === maxWins || this.p2RoundsWon === maxWins;
  }
}
