import Debug from '../utils/Debug.js';
import DiceCombination from './DiceCombination.js';
import StateMachine from '../utils/StateMachine.js';
import EventBus from '../utils/EventBus.js';
import { WebRTCTransport } from '../../transport/WebRTC.js';
import { Player } from './Player.js';
import { LocalPlayer } from './LocalPlayer.js';
import { RemotePlayer } from './RemotePlayer.js';
import { PlayerConnector } from './PlayerConnector.js';

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
    this.joiner = false;
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

    this.p1RoundsWon = 0;
    this.p2RoundsWon = 0;
    this.rounds = 3;

    this.setStateMachine();

    this.playerConnector = null;
    this.player1 = new Player(
      this.world,
      p1DicePositions,
      this.userPointerHelper,
    );
    this.player2 = new Player(
      this.world,
      p2DicePositions,
      this.userPointerHelper,
    );

    this.debug = Debug.getInstance();
    if (this.debug.active) {
      this.debugFolder = this.debug.ui.addFolder('Game Controller');
      this.debugFolder.add(this, 'play1');
      this.debugFolder.add(this, 'createTest');
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
            this.p1Turn = true;
            this.eventBus.emit(
              'controllPanel.updateContent',
              'Player 1 turn',
              this.singlePlayer || this.host ? 'Roll' : undefined,
            );
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

            this.player1.removeDices();
            await this.player1.rollDices(5);

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

            this.player2.removeDices();
            await this.player2.rollDices(5);

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

            this.player1.listenSelectDice((selectedDices) => {
              this.renderer.setSelecteObjects(
                selectedDices.map((dice) => dice.object),
              );
            });
          },
          onExit: () => {
            this.player1.removeListenSelectDice();
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

            this.renderer.setSelecteObjects([]);
            await this.player1.rerollSelectedDices();

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

            this.player2.listenSelectDice((selectedDices) => {
              this.renderer.setSelecteObjects(
                selectedDices.map((dice) => dice.object),
              );
            });
          },
          onExit: () => {
            this.player2.removeListenSelectDice();
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

            this.renderer.setSelecteObjects([]);
            await this.player2.rerollSelectedDices();

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
      this.playerConnector = new PlayerConnector(webRTCTransport);
      this.player1 = new LocalPlayer(
        this.world,
        p1DicePositions,
        this.userPointerHelper,
        this.playerConnector,
      );
      this.player2 = new RemotePlayer(
        this.world,
        p2DicePositions,
        this.userPointerHelper,
        this.playerConnector,
      );
      this.playerConnector.setOnStateChange((state) => {
        this.stateMachine.trigger(state);
      });
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
      this.joiner = true;
      this.playerConnector = new PlayerConnector(webRTCTransport);
      this.player1 = new RemotePlayer(
        this.world,
        p1DicePositions,
        this.userPointerHelper,
        this.playerConnector,
      );
      this.player2 = new LocalPlayer(
        this.world,
        p2DicePositions,
        this.userPointerHelper,
        this.playerConnector,
      );
      this.playerConnector.setOnStateChange((state) => {
        this.stateMachine.trigger(state);
      });
      this.stateMachine.trigger(this.triggers.RoundStarted);
    });
  }

  async nextAction() {
    const currentState = this.stateMachine.state;
    let trigger;
    switch (currentState) {
      case this.states.Player1ToRoll:
      case this.states.Player2ToRoll:
        trigger = this.triggers.PlayerRolled;
        break;
      case this.states.Player1Selecting:
        // todo update this
        if (this.singlePlayer || this.host) {
          if (this.player1.selectedDices.size === 0) {
            trigger = this.triggers.PlayerSkippedReroll;
          } else {
            trigger = this.triggers.PlayerSelected;
          }
        }
        break;
      case this.states.Player2Selecting:
        if (this.singlePlayer || this.joiner) {
          if (this.player2.selectedDices.size === 0) {
            trigger = this.triggers.PlayerSkippedReroll;
          } else {
            trigger = this.triggers.PlayerSelected;
          }
        }
        break;
      case this.states.EndOfRound:
        trigger = this.triggers.RoundStarted;
        break;
      case this.states.EndOfGame:
        trigger = this.triggers.RoundStarted;
        break;
    }
    if (!this.singlePlayer) {
      await this.playerConnector.syncState(trigger);
    }
    this.stateMachine.trigger(trigger);
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

  endRound() {
    const p1Faces = this.player1.dices.map((dice) => dice.getTopFace());
    const p2Faces = this.player2.dices.map((dice) => dice.getTopFace());
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
