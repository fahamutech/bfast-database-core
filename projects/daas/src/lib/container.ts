export class Container {
  private static readonly services = {};

  constructor() {
  //  this.services = {};
  }

  static service(name: string, cb: (container: Container) => any): Container {
    Object.defineProperty(this, name, {
      get: () => {
        if (!Container.services.hasOwnProperty(name)) {
          Container.services[name] = cb(this);
        }
        return Container.services[name];
      },
      configurable: true,
      enumerable: true
    });
    return this;
  }
}
