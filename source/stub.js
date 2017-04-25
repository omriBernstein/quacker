import Promise from 'bluebird';

import Spy from './spy';
import {cycle, peek} from './utils';

const $done = Symbol('done');
class IOExamplesLookup {
  constructor (ioexamples) {
    this.ioexamples = ioexamples;
    this.inputPathMap = new Map();
    for (let ioexample of ioexamples) {
      if (ioexample.isAntiExample) continue;
      let ref = inputPathMap;
      for (let input of [ioexample.context, ...ioexample.inputs, $done]) {
        if (input === $done && !ref.has(input)) ref.set(input, []);
        else if (!ref.has(input)) ref.set(input, new Map());
        ref = ref.get(input);
      }
      ref.push(ioexample);
    }
  }
  possibleOutputs (prospectiveContext, prospectiveInputs) {
    let ref = this.inputPathMap.get(prospectiveContext);
    for (let input of prospectiveInputs) {
      if (!ref || !ref.get) return [];
      ref = ref.get(input);
    }
    if (!ref.has($done)) return [];
    return ref.get($done);
  }
  find (prospectiveContext, prospectiveInputs) {
    return cycle(this.possibleOutputs(prospectiveContext, prospectiveInputs));
  }
  peek (prospectiveContext, prospectiveInputs) {
    return peek(this.possibleOutputs(prospectiveContext, prospectiveInputs));
  }
}

class Stub extends Spy {
  constructor (ioexamples) {
    const lookup = stub.ioexamplesLookup = new IOExamplesLookup(ioexamples);
    const stub = super(function (...inputs) {
      const ioexample = lookup.find(this, inputs);
      const output = ioexample.output;
      if (!ioexample) return;
      if (!ioexample.outputsPromise) {
        if (ioexample.fails) throw output;
        return output;
      } else {
        if (ioexample.fails) return Promise.reject(output);
        return Promise.resolve(output);
      }
    });
    Object.setPrototypeOf(stub, Stub.prototoype);
    return stub;
  }
  peekAtOutputOf (context, ...inputs) {
    return this.ioexamplesLookup.peek(context, ...inputs);
  }
}

export default Stub;
