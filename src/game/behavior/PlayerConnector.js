import { PlayerActions } from './enums';

export class PlayerConnector {
  constructor(transport) {
    this.transport = transport;
    this.onStateChange = null;

    // todo manage listener
    this.transport.events.on('dataChannel.message', (message) => {
      if (message.action === PlayerActions.SYNC_STATE) {
        this.onStateChange(message.data);
      }
    });
  }

  async sendRollParameters(rollParameters) {
    await this.transport.send({
      action: PlayerActions.ROLL_DICES,
      data: rollParameters,
    });
  }

  async sendRolledDicesParameters(rolledDicesParameters) {
    await this.transport.send({
      action: PlayerActions.ROLLED_DICES,
      data: rolledDicesParameters,
    });
  }

  async sendRerollOrder(order) {
    await this.transport.send({
      action: PlayerActions.REROLL_ORDER,
      data: order,
    });
  }

  getRollParameters() {
    return new Promise((resolve) => {
      const cb = (message) => {
        if (message.action === PlayerActions.ROLL_DICES) {
          this.transport.events.removeListener('dataChannel.message', cb);
          resolve(message.data);
        }
      };
      this.transport.events.on('dataChannel.message', cb);
    });
  }

  getRolledDicesParameters() {
    return new Promise((resolve) => {
      const cb = (message) => {
        if (message.action === PlayerActions.ROLLED_DICES) {
          this.transport.events.removeListener('dataChannel.message', cb);
          resolve(message.data);
        }
      };
      this.transport.events.on('dataChannel.message', cb);
    });
  }

  getRerollOrder() {
    return new Promise((resolve) => {
      const cb = (message) => {
        if (message.action === PlayerActions.REROLL_ORDER) {
          this.transport.events.removeListener('dataChannel.message', cb);
          resolve(message.data);
        }
      };
      this.transport.events.on('dataChannel.message', cb);
    });
  }

  async syncState(trigger) {
    await this.transport.send({
      action: PlayerActions.SYNC_STATE,
      data: trigger,
    });
  }

  setOnStateChange(onStateChange) {
    this.onStateChange = onStateChange;
  }

  async sendSync() {
    await this.transport.send({
      action: PlayerActions.SYNC,
    });
  }

  getSync() {
    return new Promise((resolve) => {
      const cb = (message) => {
        if (message.action === PlayerActions.SYNC) {
          this.transport.events.removeListener('dataChannel.message', cb);
          resolve();
        }
      };
      this.transport.events.on('dataChannel.message', cb);
    });
  }
}
