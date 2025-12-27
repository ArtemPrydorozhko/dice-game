import { wait } from '../utils/time';

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

export class Player {
  constructor(world, dicePositions, userPointerHelper) {
    this.world = world;
    this.dicePositions = dicePositions;
    this.userPointerHelper = userPointerHelper;
    this.dices = [];
    this.rollingDices = [];
    this.rollingDelay = 5000;
    this.selectedDices = new Set();
  }

  async rollDices(amount) {
    const rollParameters = this.generateRollParameters(amount);
    this.rollDicesWithParameters(rollParameters);
    await wait(this.rollingDelay);
    this.setDices();
    this.removeRollingDices();
  }

  generateRollParameters(amount) {
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
      dice.setPosition(position.x, position.y, position.z);
      dice.setRotation(rotation.x, rotation.y, rotation.z);
      dice.applyForce(
        forceParameters.x,
        forceParameters.y,
        forceParameters.z,
        forceParameters.point,
        forceParameters.point,
        forceParameters.point,
      );

      this.rollingDices.push(dice);
    }
  }

  getRolledDicesParameters() {
    const rolledDicesParameters = this.rollingDices.map((dice) => ({
      position: dice.getPosition(),
      rotation: dice.getRotation(),
    }));
    return rolledDicesParameters;
  }

  removeRollingDices() {
    this.rollingDices.forEach((dice) => {
      this.world.removeDice(dice);
    });
    this.rollingDices = [];
  }

  setDices(order) {
    const defaultOrder = [0, 1, 2, 3, 4];
    order = order || defaultOrder;

    this.rollingDices.forEach((dice, i) => {
      const playerDice = this.world.createDice(false);
      const position = order[i];
      playerDice.setPosition(
        this.dicePositions[position].x,
        this.dicePositions[position].y,
        this.dicePositions[position].z,
      );

      const diceTopFace = dice.getTopFace();
      playerDice.rotateDiceFromFace(diceTopFace);
      this.dices[position] = playerDice;
    });
  }

  removeDices() {
    this.dices.forEach((dice) => {
      this.world.removeDice(dice);
    });
    this.dices = [];
  }

  getSelectedDicesOrder() {
    return Array.from(this.selectedDices.values()).map((selectedDice) =>
      this.dices.indexOf(selectedDice),
    );
  }

  async rerollSelectedDices() {
    const order = this.getSelectedDicesOrder();
    this.selectedDices.forEach((dice) => {
      this.dices[this.dices.findIndex((d) => d === dice)] = null;
      this.world.removeDice(dice);
    });
    this.selectedDices.clear();

    const rollParameters = this.generateRollParameters(order.length);
    this.rollDicesWithParameters(rollParameters);
    await wait(this.rollingDelay);
    this.setDices(order);
    this.removeRollingDices();
  }

  listenSelectDice(onSelect) {
    this.onSelectDice = () => {
      const intersection = this.userPointerHelper.getIntersectedObject(
        this.dices.map((dice) => dice.object),
      );
      if (!intersection) {
        return;
      }
      const selectedDice = this.dices.find(
        (dice) => dice.object === intersection.object.parent,
      );

      if (this.selectedDices.has(selectedDice)) {
        this.selectedDices.delete(selectedDice);
      } else {
        this.selectedDices.add(selectedDice);
      }
      onSelect(Array.from(this.selectedDices));
    };
    this.userPointerHelper.events.on('click', this.onSelectDice);
  }

  removeListenSelectDice() {
    this.userPointerHelper.events.removeListener('click', this.onSelectDice);
  }
}
