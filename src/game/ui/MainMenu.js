import { EventEmitter } from '../utils/EventEmitter';

export class MainMenu {
  constructor() {
    this.wrapper = document.querySelector('.main-menu-wrapper');
    this.listeners = [];
    this.events = new EventEmitter();
    this.opened = false;
  }

  open() {
    this.opened = true;
    this.render();
  }

  close() {
    this.opened = false;
    this.render();
  }

  onPlay1ButtonClick() {
    this.events.emit('play1');
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
            <div class="main-menu main-menu--${
              this.opened ? 'opened' : 'closed'
            }">
                <button class="main-menu__button main-menu__play-1">Play 1</button>
            </div>
            <div class="main-menu-backdrop"></div>
        `;
    this.wrapper.innerHTML = template;

    {
      const button = this.wrapper.querySelector('.main-menu__play-1');
      const listener = this.onPlay1ButtonClick.bind(this);
      button.addEventListener('click', listener);
      this.listeners.push({ element: button, listener, type: 'click' });
    }
  }

  destroy() {
    this.clearListeners();
  }
}
