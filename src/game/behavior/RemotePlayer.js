import { Player } from './Player';
import { PlayerConnector } from './PlayerConnector';

export class RemotePlayer extends Player {
  constructor(world, dicePositions, userPointerHelper, playerConnector) {
    super(world, dicePositions, userPointerHelper);
    this.playerConnector = playerConnector;
  }

  async rollDices() {
    const rollParameters = await this.generateRollParameters();
    this.rollDicesWithParameters(rollParameters);

    const rolledDicesParameters = await this.getRolledDicesParameters();
    this.adjustRolledDices(rolledDicesParameters);

    this.setDices();
    this.removeRollingDices();
  }

  async rerollSelectedDices() {
    const order = await this.getSelectedDicesOrder();
    order.forEach((index) => {
      this.world.removeDice(this.dices[index]);
      this.dices[index] = null;
    });
    const rollParameters = await this.generateRollParameters(order.length);

    this.rollDicesWithParameters(rollParameters);
    const rolledDicesParameters = await this.getRolledDicesParameters();
    this.adjustRolledDices(rolledDicesParameters);

    this.setDices(order);
    this.removeRollingDices();
  }

  generateRollParameters(_amount) {
    return this.playerConnector.getRollParameters();
  }

  getRolledDicesParameters() {
    return this.playerConnector.getRolledDicesParameters();
  }

  getSelectedDicesOrder() {
    return this.playerConnector.getRerollOrder();
  }

  adjustRolledDices(rolledDicesParameters) {
    this.rollingDices.forEach((dice, i) => {
      const face = dice.getTopFace();
      const dummyDice = this.world.createDice(false, false);
      const rotation = rolledDicesParameters[i].rotation;
      dummyDice.setRotation(rotation.x, rotation.y, rotation.z);
      const actualFace = dummyDice.getTopFace();
      if (face !== actualFace) {
        dice.setRotation(rotation.x, rotation.y, rotation.z);
      }
      this.world.removeDice(dummyDice);
    });
  }

  listenSelectDice() {}
  removeListenSelectDice() {}
}
