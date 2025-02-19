import GUI from 'lil-gui';

class Debug {
  instance = null;
  constructor() {
    this.active = window.location.hash === '#debug';
    this.ui = this.active ? new GUI() : null;
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new Debug();
    }
    return this.instance;
  }
}

export default Debug;
