import Promise from 'bluebird';

// documentation can be thought of as (possibly dynamic) text attached to an arbitrary target
class Documentation {
  constructor (source, target = null) {
    // `.source` should be either a string or a function that returns a string (or a function that returns a promise for a string)
    this.source = source;
    // internally, the `.target` will only ever be an interface instance
    // externally, the `.target` could be used to attach the documentation to whatever really (it's just metadata after all)
    this.target = target;
  }
  // given some template locals, comes back with a promise for a string, as defined by the documentation's `.source`
  compile (locals = this.target || {}) {
    return Promise.try(() => {
      if (typeof this.source !== 'function') return this.source;
      return Function.prototype.call.call(this.source, locals);
    });
  }
}

export default Documentation;
