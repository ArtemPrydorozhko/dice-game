import EventBus from '../../utils/EventBus';
import styles from './globalLoadingOverlay.css?inline';

class GlobalLoadingOverlay extends HTMLElement {
  constructor() {
    super();
    this.eventBus = EventBus.getInstance();
    this.listeners = [];
    this.currentBarProgress = 0;
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

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
