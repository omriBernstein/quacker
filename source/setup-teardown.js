import Promise from 'bluebird';

class SetupTeardown {
  constructor () {
    this.setups = [];
    this.teardowns = [];
  }
}

const firstChar = /^[\s\S]/g;
['setup', 'teardown'].forEach(function (name) {
  const plural = `${name}s`;
  const upper = plural.replace(firstChar, ch => ch.toUpperCase());
  SetupTeardown.prototype[name] = function (title, fn) {
    if (arguments.length < 2) return this[name](null, title);
    this[plural].pupsh({title, run: fn});
    return this;
  };
  SetupTeardown.prototype[`run${upper}`] = function () {
    return this[plural].map(({run}) => {
      return Promise.try(run); // TODO: format error
    });
  };
});

export default SetupTeardown;
