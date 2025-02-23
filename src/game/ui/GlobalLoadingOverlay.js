import EventBus from '../utils/EventBus';

class GlobalLoadingOverlay extends HTMLElement {
  constructor() {
    super();
    this.eventBus = EventBus.getInstance();
    this.listeners = [];
    this.currentBarProgress = 0;
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 1);
          opacity: 1;
          z-index: 10;
          transition: opacity 0.5s ease, display 0.5s ease allow-discrete;
        }

        :host(.hidden) {
          opacity: 0;
          display: none;
        }

        .loading-overlay-bar-outer {
          position: absolute;
          top: 50%;
          width: calc(100% - 100px);
          margin: 0 50px;
          height: 5px;
          background-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-50%);
        }
          
        .loading-overlay-bar-inner {
          width: 100%;
          height: 5px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s;
          background-color: rgba(255, 255, 255, 1);
        }
      </style>

      <div class="loading-overlay-bar-outer">
        <div class="loading-overlay-bar-inner"></div>
      </div>
    `;
  }

  connectedCallback() {
    const onAssetLoadingProgress = this.onAssetLoadingProgress.bind(this);
    this.listeners.push(() => {
      this.eventBus.removeListener(
        'assetLoadingProgress',
        onAssetLoadingProgress,
      );
    });
    this.eventBus.on('assetLoadingProgress', onAssetLoadingProgress);

    const onAssetLoadingComplete = this.onAssetLoadingComplete.bind(this);
    this.eventBus.on('assetLoadingComplete', onAssetLoadingComplete);
    this.listeners.push(() => {
      this.eventBus.removeListener(
        'assetLoadingComplete',
        onAssetLoadingComplete,
      );
    });
  }

  disconnectedCallback() {
    this.listeners.forEach((removeListener) => removeListener());
  }

  onAssetLoadingProgress(progress) {
    if (progress > this.currentBarProgress) {
      this.currentBarProgress = progress;
      this.shadowRoot.querySelector(
        '.loading-overlay-bar-inner',
      ).style.transform = `scaleX(${this.currentBarProgress})`;
    }
  }

  onAssetLoadingComplete() {
    this.shadowRoot.host.classList.add('hidden');
  }
}

export default () =>
  customElements.define(
    'dicegame-global-loading-overlay',
    GlobalLoadingOverlay,
  );
