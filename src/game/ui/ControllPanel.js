import { EventEmitter } from '../utils/EventEmitter';

export class ControllPanel {
  constructor() {
    this.wrapper = document.querySelector('.controll-panel-wrapper');
    this.listeners = [];
    this.events = new EventEmitter();
    this.opened = false;
    this.actionsDescriptionText = '';
    this.actionsButtonText = '';
  }

  open() {
    this.opened = true;
    this.render();
  }

  close() {
    this.opened = false;
    this.render();
  }

  update(actionsDescriptionText, actionsButtonText) {
    this.actionsDescriptionText = actionsDescriptionText;
    this.actionsButtonText = actionsButtonText;
    this.render();
  }

  onActionButtonClick() {
    this.events.emit('action');
  }

  clearListeners() {
    this.listeners.forEach(({ element, listener, type }) => {
      element.removeEventListener(type, listener);
    });
    this.listeners = [];
  }

  render() {
    this.clearListeners();

    const template = `
      <div class="controll-panel controll-panel--${
        this.opened ? 'opened' : 'closed'
      }">
        <div class="controll-panel__actions">
          <div class="controll-panel__actions-desciption">${
            this.actionsDescriptionText
          }</div>
          ${
            this.actionsButtonText
              ? `<button class="controll-panel__actions-button">${this.actionsButtonText}</button>`
              : ''
          }
        </div>
      </div>
    `;

    this.wrapper.innerHTML = template;

    {
      const button = this.wrapper.querySelector(
        '.controll-panel__actions-button',
      );
      if (button) {
        const listener = this.onActionButtonClick.bind(this);
        button.addEventListener('click', listener);
        this.listeners.push({ element: button, listener, type: 'click' });
      }
    }
  }
}
