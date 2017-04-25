import Call from './call';

const knocklist = new WeakMap();

class Spy extends Function {
  constructor (original = function () {}) {
    super(); // TODO: why is this needed?
    function spy (...inputs) {
      const call = new Call(original, this, inputs);
      spy.calls.push(call);
      return call.discharge();
    }
    Object.defineProperty(spy, 'length', original.length);
    Object.defineProperty(spy, 'name', original.name);
    spy.original = original;
    spy.calls = [];
    return spy;
  }
  static on (object, key, spy = new Spy(object[key])) {
    const original = object[key];
    const cache = knocklist.get(object) || new Map();
    knocklist.set(object, cache);
    cache.set(key, {original, spy});
    return spy;
  }
  static restore (object, key) {
    const cache = knocklist.get(object);
    if (!cache || !cache.has(key)) return false;
    const {original, spy} = cache.get(key);
    cache.delete(key);
    if (!cache.size) knocklist.delete(object);
    object[key] = original;
    return spy;
  }
}

export default Spy;
