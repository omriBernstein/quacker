import assert from 'assert';
import Promise from 'bluebird';

import SetupTeardown from './setup-teardown';
import Call from './call';
import Stub from './stub';
import {completeAll, deepEqual, VerifierFailure, InterfaceConsistencyFailure, ImproperAntiExample} from './utils';

// an ioexample represents an example invocation
// unlike an `Example`, it is specifically geared to describe the inputs and output of a hypothetical function
// an ioexample can be used to verify a pure function's behavior, e.g. in a unit test
// it can also be used in "auto stubbing" to generate a fake
// that fake function (stub), if it receives the ioexample's inputs will simply output the ioexample's output
class IOExample extends SetupTeardown {
  constructor (title, isAntiExample = false, target = null) {
    this.title = title;
    this.isAntiExample = isAntiExample;
    // internally, the `.target` will only ever be an interface instance
    // externally, the `.target` could be used to attach the example to whatever really (it's just metadata after all)
    this.target = target;
    this.outputsPromise = false;
    this.returns = undefined;
    this.setups = [];
    this.teardowns = [];
  }
  // `.boundTo` sets an ioexample's context, i.e. its hypothetical `this`
  boundTo (context) {
    this.context = context;
    return this;
  }
  // `.given` set an ioexample's inputs
  given (...inputs) {
    this.inputs = inputs;
    return this;
  }
  // `.return` sets an ioexample's *successful* output
  return (output) {
    this.returns = output;
    delete this.throws;
    return this;
  }
  // `.throw` sets an ioexample's *failing* output
  throw (output) {
    this.throws = output;
    delete this.returns;
    return this;
  }
  // `.eventually` sets an ioexample to represent an asynchronous (promise) result
  get eventually () {
    this.outputsPromise = true;
    return this;
  }
  // `.immediately` sets an ioexample to represent a synchronous result (which is the default)
  get immediately () {
    this.outputsPromise = false;
    return this;
  }
  // `.not` sets the ioexample to be an anti-example
  // an anti-example provides an example of what should *not* be
  get not () {
    this.isAntiExample = !this.isAntiExample;
    return this;
  }
  // `.does` actually does nothing, it's simply around for the sake of chaining with more-natural-language
  // e.g. `new IOExample('addition').given(2,2).does.not.return(5);`
  get does () {
    return this;
  }
  get succeeds () {
    return this.hasOwnProperty('returns');
  }
  get fails () {
    return this.hasOwnProperty('throws');
  }
  get output () {
    if (this.hasOwnProperty('returns')) return this.returns;
    if (this.hasOwnProperty('throws')) return this.throws;
    throw new Error('This ioexample has neither an expected return value nor an expected thrown error.');
  }
  // `.verifyWithoutSetupOrTeardown` does the work of verifying a candidate function against this ioexample
  verifyWithoutSetupOrTeardown (candidateFn) {
    if (typeof candidateFn !== 'function') return Promise.reject(new Error('Should have been a function'));
    const expected = this.output;
    const isAntiExample = this.isAntiExample;
    return new Call(candidateFn, this.context, this.inputs)
    .verifyOutputStyle(this.outputsPromise, this.throws)
    .then(function (call) {
      assert.deepEqual(call.ultimateOutput, expected); // TODO: format error
      return call.ultimateOutput;
    })
    .then(
      function (value) {
        if (isAntiExample) throw ImproperAntiExample(this, candidateFn);
        return value;
      },
      function (err) {
        if (isAntiExample) return;
        throw err;
      }
    )
    .catch(err => {
      throw VerifierFailure(this, candidateFn, err);
    });
  }
  // `.verify` confirms whether a candidate function fits this ioexample
  // verification passes if the candidate, invoked with the ioexample's inputs, outputs something deeply equal to the ioexample's output
  verify (candidateFn) {
    return Promise.bind(this)
    .then(this.runSetups)
    .then(() => this.verifyWithoutSetupOrTeardown(candidateFn))
    .then(this.runTeardowns);
  }
  consistentWith (interf, breadcrumbs = [interf.name]) {
    const signatures = values(interf.signatures);
    const candidateFn = this.fake();
    if (signatures.length === 0) return Promise.resolve(candidateFn);
    const isAntiExample = this.isAntiExample;
    return Promise.any(signatures, signature => signature.verify(candidateFn, ...this.inputs))
    .then(value => {
      if (isAntiExample) throw ImproperAntiExample(this, candidateFn);
      return value;
    }, err => {
      if (isAntiExample) return;
      throw err;
    })
    .catch(err => {
      throw InterfaceConsistencyFailure(this, breadcrumbs, err);
    });
  }
  fake () {
    return new Stub([this]);
  }
}

export default IOExample;
