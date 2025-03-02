export default class StateMachine {
  constructor(configuration) {
    this.states = configuration.states;
    this.state = configuration.initialState;
    this.states[this.state].onEntry?.();
  }

  trigger(event) {
    const transition = this.states[this.state].on[event];
    if (transition?.target) {
      this.states[this.state].onExit?.();
      this.state = transition.target;
      this.states[this.state].onEntry?.();
    }
  }
}
