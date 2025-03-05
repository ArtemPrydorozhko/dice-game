import EventBus from '../../utils/EventBus';
import urlBuilder from '../../utils/urlBuilder';
import styles from './mainMenu.css?inline';

class MainMenu extends HTMLElement {
  constructor() {
    super();
    this.eventBus = EventBus.getInstance();
    this.opened = false;
    this.listeners = [];
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        <div class="main-menu">
            <div class="main-menu__title">Dice Game</div>
            <div class="main-menu__buttons">
                <button class="main-menu__button main-menu__play-1">Play 1</button>
                <button class="main-menu__button main-menu__play-2">Placeholder button</button>
                <button class="main-menu__button main-menu__play-3">Placeholder button long</button>
                <button class="main-menu__button main-menu__play-3">Placeholder</button>
            </div>
        </div>
    `;

    this.hoverSound = new Audio(urlBuilder.buildUrl('/sounds/menu-hover.mp3'));
    this.clickSound = new Audio(urlBuilder.buildUrl('/sounds/menu-click.mp3'));
  }

  connectedCallback() {
    const onPlay1ButtonClick = this.onPlay1ButtonClick.bind(this);
    const play1Button = this.shadowRoot.querySelector('.main-menu__play-1');
    play1Button.addEventListener('click', onPlay1ButtonClick);
    this.listeners.push(() => {
      play1Button.removeEventListener('click', onPlay1ButtonClick);
    });

    const onOpenMainMenu = this.open.bind(this);
    this.eventBus.on('openMainMenu', onOpenMainMenu);
    this.listeners.push(() => {
      this.eventBus.removeListener('openMainMenu', onOpenMainMenu);
    });

    const onCloseMainMenu = this.close.bind(this);
    this.eventBus.on('closeMainMenu', onCloseMainMenu);
    this.listeners.push(() => {
      this.eventBus.removeListener('closeMainMenu', onCloseMainMenu);
    });

    this.shadowRoot.querySelectorAll('.main-menu__button').forEach((button) => {
      const onHover = () => {
        this.hoverSound.play();
      };
      button.addEventListener('mouseenter', onHover);
      this.listeners.push(() => {
        button.removeEventListener('mouseenter', onHover);
      });

      const onClick = () => {
        this.clickSound.play();
      };
      button.addEventListener('click', onClick);
      this.listeners.push(() => {
        button.removeEventListener('click', onClick);
      });
    });
  }

  disconnectedCallback() {
    this.listeners.forEach((removeListener) => removeListener());
  }

  open() {
    this.opened = true;
    this.shadowRoot.host.classList.add('opened');
  }

  close() {
    this.opened = false;
    this.shadowRoot.host.classList.remove('opened');
  }

  onPlay1ButtonClick() {
    this.eventBus.emit('play1');
  }
}

export default () => customElements.define('dicegame-main-menu', MainMenu);
