export class UIManager {
  static getInstance() {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }

  constructor() {
    this.appElement = document.querySelector('dicegame-app');
  }

  showMainMenu() {
    this.appElement.dispatchEvent(
      new CustomEvent('show-dialog', { detail: { name: 'main-menu' } }),
    );
  }

  hideMainMenu() {
    this.appElement.dispatchEvent(
      new CustomEvent('hide-dialog', { detail: { name: 'main-menu' } }),
    );
  }

  showHUD() {
    this.appElement.dispatchEvent(
      new CustomEvent('show-panel', { detail: { name: 'controll-panel' } }),
    );
  }

  hideHUD() {
    this.appElement.dispatchEvent(
      new CustomEvent('hide-panel', { detail: { name: 'controll-panel' } }),
    );
  }
}
