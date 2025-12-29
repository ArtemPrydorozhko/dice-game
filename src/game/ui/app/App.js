import EventBus from '../../utils/EventBus';
import styles from './app.css?inline';

class App extends HTMLElement {
  constructor() {
    super();
    this.eventBus = EventBus.getInstance();
    this.history = [];
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
        <style>${styles}</style>
    `;

    this.showDialog('global-loading-overlay');
  }

  connectedCallback() {
    this.addEventListener('show-dialog', this);
    this.addEventListener('hide-dialog', this);
    this.addEventListener('show-panel', this);
    this.addEventListener('hide-panel', this);

    this.eventBus.on('play.online', () => {
      this.showDialog('webrtc-setup');
    });
    this.eventBus.on('loadingOverlay.play', () => {
      this.hideDialog('global-loading-overlay');
      this.showDialog('main-menu');
    });
  }

  disconnectedCallback() {
    this.removeEventListener('show-dialog', this);
    this.removeEventListener('hide-dialog', this);
    this.removeEventListener('show-panel', this);
    this.removeEventListener('hide-panel', this);
  }

  handleEvent(event) {
    if (event.type === 'show-dialog') {
      this.showDialog(event.detail.name);
    } else if (event.type === 'hide-dialog') {
      this.hideDialog(event.detail.name);
    } else if (event.type === 'show-panel') {
      this.showPanel(event.detail.name);
    } else if (event.type === 'hide-panel') {
      this.hidePanel(event.detail.name);
    }
  }

  showDialog(name) {
    this.removeActiveDialog();

    const dialog = document.createElement(`dicegame-${name}`);
    this.shadowRoot.appendChild(dialog);
    this.history.push(name);
  }

  hideDialog(name) {
    this.removeActiveDialog();

    const dialogIndex = this.history.findIndex((item) => item === name);
    if (dialogIndex === -1) {
      return;
    }
    this.history = this.history.slice(0, dialogIndex);
    const previousDialog = this.history.at(-1);

    if (previousDialog) {
      this.showDialog(previousDialog);
    }
  }

  removeActiveDialog() {
    const activeDialog = this.history.at(-1);
    const dialog = this.shadowRoot.querySelector(`dicegame-${activeDialog}`);
    if (dialog) {
      this.shadowRoot.removeChild(dialog);
    }
  }

  showPanel(name) {
    const dialog = document.createElement(`dicegame-${name}`);
    this.shadowRoot.appendChild(dialog);
  }

  hidePanel(name) {
    const dialog = this.shadowRoot.querySelector(`dicegame-${name}`);
    if (dialog) {
      this.shadowRoot.removeChild(dialog);
    }
  }
}

export default () => customElements.define('dicegame-app', App);
