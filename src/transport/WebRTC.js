import { EventEmitter } from '../game/utils/EventEmitter';

const servers = {
  iceServers: [{ urls: 'stun:stun1.l.google.com:19302' }],
};

export class WebRTCTransport {
  constructor() {
    this.peerConnection = null;
    this.dataChannel = null;
    this.events = new EventEmitter();
    this.messageId = 0;
  }

  onMessage(event) {
    const data = JSON.parse(event.data);
    console.log('Received message from peer:', data);

    if (data.ack) {
      return;
    }
    const { message, id } = data;
    this.sendAck(id);

    this.events.emit(`dataChannel.message`, message);
  }

  async createOffer() {
    this.peerConnection = new RTCPeerConnection(servers);
    this.dataChannel = this.peerConnection.createDataChannel('dataChannel');
    this.dataChannel.addEventListener('open', () => {
      console.log('Data channel is open');
      this.events.emit('dataChannel.open');
    });
    this.dataChannel.addEventListener('message', this.onMessage.bind(this));
    this.peerConnection.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        console.log('New ICE candidate: ', event.candidate);
        this.events.emit(
          'offer',
          JSON.stringify(this.peerConnection.localDescription),
        );
      } else {
        console.log('ICE gathering complete');
      }
    });

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.peerConnection.addEventListener('connectionstatechange', () => {
      console.log(
        'Connection state changed: ',
        this.peerConnection.connectionState,
      );
    });
  }

  async createAnswer(remoteOffer) {
    this.peerConnection = new RTCPeerConnection(servers);

    this.peerConnection.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        console.log('New ICE candidate: ', event.candidate);
        this.events.emit(
          'answer',
          JSON.stringify(this.peerConnection.localDescription),
        );
      } else {
        console.log('ICE gathering complete');
      }
    });

    const offer = JSON.parse(remoteOffer);
    await this.peerConnection.setRemoteDescription(offer);

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.peerConnection.addEventListener('datachannel', (event) => {
      this.dataChannel = event.channel;
      this.dataChannel.addEventListener('open', () => {
        console.log('Data channel is open');
        this.events.emit('dataChannel.open');
      });
      this.dataChannel.addEventListener('message', this.onMessage.bind(this));
    });

    this.peerConnection.addEventListener('connectionstatechange', () => {
      console.log(
        'Connection state changed: ',
        this.peerConnection.connectionState,
      );
    });
  }

  async setAnswer(remoteAnswer) {
    const answer = JSON.parse(remoteAnswer);
    if (this.peerConnection.currentRemoteDescription) return;
    await this.peerConnection.setRemoteDescription(answer);
  }

  async send(message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const id = this.messageId++;
      console.log('Sending message to peer:', message, id);
      this.dataChannel.send(JSON.stringify({ message, id }));
      await new Promise((resolve) => {
        const cb = (rawData) => {
          const data = JSON.parse(rawData.data);
          if (data.ack && data.id === id) {
            this.dataChannel.removeEventListener('message', cb);
            resolve();
          }
        };
        this.dataChannel.addEventListener('message', cb);
      });
    }
  }

  sendAck(id) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ ack: true, id }));
    }
  }
}
