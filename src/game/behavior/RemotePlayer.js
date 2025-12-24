import { EventEmitter } from '../utils/EventEmitter';

export class RemotePlayer {
  constructor(transport) {
    this.transport = transport;
    this.transport.events.on(
      'dataChannel.message',
      this.processMessage.bind(this),
    );
    this.events = new EventEmitter();
  }

  processMessage(message) {
    if (message.action === 'rollDices') {
      message.data.diceParameters;
      message.data.forceParameters;
    }
  }

  sendRollParameters(rollParameters) {
    this.transport.send({
      action: 'rollDices',
      data: rollParameters,
    });
  }

  sendRolledDicesParameters(rolledDicesParameters) {
    this.transport.send({
      action: 'rolledDices',
      data: rolledDicesParameters,
    });
  }

  sendRerollOrder(order) {
    this.transport.send({
      action: 'rerollOrder',
      data: order,
    });
  }

  getRollParameters() {
    return new Promise((resolve) => {
      const cb = (message) => {
        if (message.action === 'rollDices') {
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
        if (message.action === 'rolledDices') {
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
        if (message.action === 'rerollOrder') {
          this.transport.events.removeListener('dataChannel.message', cb);
          resolve(message.data);
        }
      };
      this.transport.events.on('dataChannel.message', cb);
    });
  }

  sendSync() {
    this.transport.send({
      action: 'sync',
    });
  }

  getSync() {
    return new Promise((resolve) => {
      const cb = (message) => {
        if (message.action === 'sync') {
          this.transport.events.removeListener('dataChannel.message', cb);
          resolve();
        }
      };
      this.transport.events.on('dataChannel.message', cb);
    });
  }
}
