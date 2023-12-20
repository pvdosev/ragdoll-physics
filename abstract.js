export class MessageBus {
  constructor () {
    this.types = {};
  }

  register(type, func) {
    if (this.types[type] === undefined) {this.types[type] = [];}
    const index = this.types[type].push(func);
    // (index - 1) because the push method returns the length of the array
    return () => {delete this.types[type][index-1]};
  }

  send(type, data) {
    if(type in this.types) {
      for (const func of this.types[type]) {
        func(data);
      }
    }
  }
}
