import EventBus from '../../utils/EventBus';
import styles from './webRTCSetup.css?inline';

class WebRTCSetup extends HTMLElement {
  constructor() {
    super();
    this.eventBus = EventBus.getInstance();
    this.opened = false;
    this.listeners = [];
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        <div class="webrtc-setup dialog">
            <div class="webrtc-setup__options">
                <button class="webrtc-setup__option webrtc-setup__option--host">Host game</button>
                <button class="webrtc-setup__option webrtc-setup__option--join">Join game</button>
            </div>
            <div class="webrtc-setup__create-offer hidden">
                <div class="webrtc-setup__create-offer-loading hidden">Loading...</div>
                <div>Offer</div>
                <textarea class="webrtc-setup__create-offer-textarea" readonly></textarea>
            </div>
            <div class="webrtc-setup__set-answer hidden">
                <div>Answer</div>
                <textarea class="webrtc-setup__set-answer-textarea"></textarea>
            </div>
            <div class="webrtc-setup__set-offer hidden">
                <div>Offer</div>
                <textarea class="webrtc-setup__set-offer-textarea"></textarea>
            </div>
            <div class="webrtc-setup__answer hidden">
                <div>Answer</div>
                <textarea class="webrtc-setup__answer-textarea" readonly></textarea>
            </div>
        </div>
    `;
  }

  connectedCallback() {
    const onHostButtonClick = this.onHostButtonClick.bind(this);
    const hostButton = this.shadowRoot.querySelector(
      '.webrtc-setup__option--host',
    );
    hostButton.addEventListener('click', onHostButtonClick);
    this.listeners.push(() => {
      hostButton.removeEventListener('click', onHostButtonClick);
    });

    const onJoinButtonClick = this.onJoinButtonClick.bind(this);
    const joinButton = this.shadowRoot.querySelector(
      '.webrtc-setup__option--join',
    );
    joinButton.addEventListener('click', onJoinButtonClick);
    this.listeners.push(() => {
      joinButton.removeEventListener('click', onJoinButtonClick);
    });

    const onOfferCreated = this.onOfferCreated.bind(this);
    this.eventBus.on('webRTCSetup.host.offerCreated', onOfferCreated);
    this.listeners.push(() => {
      this.eventBus.removeListener(
        'webRTCSetup.host.offerCreated',
        onOfferCreated,
      );
    });

    const onSetAnswer = this.onSetAnswer.bind(this);
    const setAnswerField = this.shadowRoot.querySelector(
      '.webrtc-setup__set-answer-textarea',
    );
    setAnswerField.addEventListener('input', onSetAnswer);
    this.listeners.push(() => {
      setAnswerField.removeEventListener('input', onSetAnswer);
    });

    const onSetOffer = this.onSetOffer.bind(this);
    const setOfferField = this.shadowRoot.querySelector(
      '.webrtc-setup__set-offer-textarea',
    );
    setOfferField.addEventListener('input', onSetOffer);
    this.listeners.push(() => {
      setOfferField.removeEventListener('input', onSetOffer);
    });

    const onJoinAnswerCreated = this.onAnswerCreated.bind(this);
    this.eventBus.on('webRTCSetup.join.answerCreated', onJoinAnswerCreated);
    this.listeners.push(() => {
      this.eventBus.removeListener(
        'webRTCSetup.join.answerCreated',
        onJoinAnswerCreated,
      );
    });
  }

  disconnectedCallback() {
    this.listeners.forEach((removeListener) => removeListener());
  }

  onHostButtonClick() {
    this.eventBus.emit('webRTCSetup.host.start');
    this.shadowRoot
      .querySelector('.webrtc-setup__create-offer')
      .classList.remove('hidden');
    this.shadowRoot
      .querySelector('.webrtc-setup__set-answer')
      .classList.remove('hidden');
    this.shadowRoot
      .querySelector('.webrtc-setup__options')
      .classList.add('hidden');
  }

  onOfferCreated(offer) {
    const offerTextarea = this.shadowRoot.querySelector(
      '.webrtc-setup__create-offer-textarea',
    );
    const offerLoading = this.shadowRoot.querySelector(
      '.webrtc-setup__create-offer-loading',
    );
    offerLoading.classList.add('hidden');
    offerTextarea.value = offer;

    this.shadowRoot
      .querySelector('.webrtc-setup__set-answer')
      .classList.remove('hidden');
  }

  onSetAnswer() {
    const setAnswerTextarea = this.shadowRoot.querySelector(
      '.webrtc-setup__set-answer-textarea',
    );
    const answer = setAnswerTextarea.value;
    if (answer) {
      this.eventBus.emit('webRTCSetup.host.answerSet', answer);
    }
  }

  onJoinButtonClick() {
    this.eventBus.emit('webRTCSetup.join.start');
    this.shadowRoot
      .querySelector('.webrtc-setup__options')
      .classList.add('hidden');
    this.shadowRoot
      .querySelector('.webrtc-setup__set-offer')
      .classList.remove('hidden');
  }

  onSetOffer() {
    const setOfferTextarea = this.shadowRoot.querySelector(
      '.webrtc-setup__set-offer-textarea',
    );
    const offer = setOfferTextarea.value;
    if (offer) {
      this.eventBus.emit('webRTCSetup.join.offerSet', offer);
    }
  }

  onAnswerCreated(answer) {
    this.shadowRoot
      .querySelector('.webrtc-setup__answer')
      .classList.remove('hidden');

    this.shadowRoot.querySelector('.webrtc-setup__answer-textarea').value =
      answer;
  }
}

export default () =>
  customElements.define('dicegame-webrtc-setup', WebRTCSetup);
