import EventBus from '../../utils/EventBus';
import styles from './controllPanel.css?inline';

class ControllPanel extends HTMLElement {
  constructor() {
    super();
    this.eventBus = EventBus.getInstance();
    this.listeners = [];
    this.currentBarProgress = 0;
    this.active = false;
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
        <style>${styles}</style>

        <div class="controll-panel">
            <div class="controll-panel__action-desciption"></div>
            <button class="controll-panel__action-button"></button>
        </div>
    `;

    this._button = this.shadowRoot.querySelector(
      '.controll-panel__action-button',
    );
    this._description = this.shadowRoot.querySelector(
      '.controll-panel__action-desciption',
    );
  }

  connectedCallback() {
    const onShow = this.show.bind(this);
    this.eventBus.on('controllPanel.show', onShow);
    this.listeners.push(() => {
      this.eventBus.removeListener('controllPanel.show', onShow);
    });

    const onHide = this.hide.bind(this);
    this.eventBus.on('controllPanel.hide', onHide);
    this.listeners.push(() => {
      this.eventBus.removeListener('controllPanel.hide', onHide);
    });

    const onContentChange = this.contentChange.bind(this);
    this.eventBus.on('controllPanel.updateContent', onContentChange);
    this.listeners.push(() => {
      this.eventBus.removeListener(
        'controllPanel.updateContent',
        onContentChange,
      );
    });

    const onButtonClick = this.onButtonClick.bind(this);
    this._button.addEventListener('click', onButtonClick);
    this.listeners.push(() => {
      this._button.removeEventListener('click', onButtonClick);
    });
  }

  disconnectedCallback() {
    this.listeners.forEach((removeListener) => removeListener());
  }

  onButtonClick() {
    this.eventBus.emit('controllPanel.action');
  }

  show() {
    this.active = true;
    this.shadowRoot.host.classList.add('active');
  }

  hide() {
    this.active = false;
    this.shadowRoot.host.classList.remove('active');
  }

  contentChange(description, buttonText) {
    if (buttonText) {
      this._button.style.visibility = 'visible';
      this._button.textContent = buttonText;
    } else {
      this._button.style.visibility = 'hidden';
    }

    if (description) {
      this._description.style.visibility = 'visible';
      this._description.textContent = description;
    } else {
      this._description.style.visibility = 'hidden';
    }
  }
}

export default () =>
  customElements.define('dicegame-controll-panel', ControllPanel);
