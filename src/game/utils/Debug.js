import GUI from 'lil-gui';

class Debug {
  constructor() {
    this.active = window.location.hash === '#debug';
    this.ui = this.active ? new GUI() : null;
  }

  static getInstance() {
    if (!Debug.instance) {
      Debug.instance = new Debug();
    }
    return Debug.instance;
  }
}

export default Debug;
