import { wait } from '../utils/time';
import { Player } from './Player';

export class LocalPlayer extends Player {
  constructor(world, dicePositions, userPointerHelper, playerConnector) {
    super(world, dicePositions, userPointerHelper);
    this.playerConnector = playerConnector;
  }

  async rollDices(amount) {
    const rollParameters = this.generateRollParameters(amount);
    await this.playerConnector.sendRollParameters(rollParameters);

    this.rollDicesWithParameters(rollParameters);
    await wait(this.rollingDelay);

    const rolledDicesParameters = this.getRolledDicesParameters();
    await this.playerConnector.sendRolledDicesParameters(rolledDicesParameters);

    this.setDices();
    this.removeRollingDices();
  }

  async rerollSelectedDices() {
    const order = this.getSelectedDicesOrder();
    await this.playerConnector.sendRerollOrder(order);

    this.selectedDices.forEach((dice) => {
      this.dices[this.dices.findIndex((d) => d === dice)] = null;
      this.world.removeDice(dice);
    });
    this.selectedDices.clear();

    const rollParameters = this.generateRollParameters(order.length);
    await this.playerConnector.sendRollParameters(rollParameters);

    this.rollDicesWithParameters(rollParameters);
    await wait(this.rollingDelay);

    const rolledDicesParameters = this.getRolledDicesParameters();
    await this.playerConnector.sendRolledDicesParameters(rolledDicesParameters);

    this.setDices(order);
    this.removeRollingDices();
  }
}
