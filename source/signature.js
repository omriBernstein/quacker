import assert from 'assert';
import Promise from 'bluebird';

import Call from './call';
import {completeAll} from './utils';

class Signature {
  constructor (title, target = null) {
    this.title = title;
    this.target = target;
    this.outputsPromise = false;
    this.throws = false;
  }
  boundTo (contextInterface) {
    this.contextInterface = contextInterface;
    return this;
  }
  given (...inputInterfaces) {
    this.inputInterfaces = inputInterfaces;
    return this;
  }
  return (outputInterface) {
    this.outputInterface = outputInterface;
    this.throws = false;
    return this;
  }
  throw (outputInterface) {
    this.outputInterface = outputInterface;
    this.throws = true;
    return this;
  }
  get eventually () {
    this.outputsPromise = true;
    return this;
  }
  get immediately () {
    this.outputsPromise = false;
    return this;
  }
  verifyContext (candidate) {
    if (!this.contextInterface) return Promise.resolve();
    return this.contextInterface.verify(candidate);
  }
  verifyInputs (...candidates) { // TODO: consider "rest" argument signatures
    if (!this.inputInterfaces) return Promise.resolve();
    return Promise.try(() => {
      assert(this.inputInterfaces.length === candidates.length);
      function verifyOne (verifiable, idx) {
        return verifiable.verify(candidate[index]);
      }
      return completeAll(this.inputInterfaces.map(verifyOne));
    });
  }
  verifyOutput (candidate) {
    if (!this.outputInterface) return Promise.resolve();
    return this.outputInterface.verify(candidate);
  } 
  verifyExecutionResult (candidateFn, ...candidateInputs) {
    return new Call(candidateFn, candidateInputs)
    .verifyOutputStyle(this.outputsPromise, this.throws)
    .then(call => this.verifyOutput(call.ultimateOutput));
  }
  verify (candidateFn, ...candidateInputs) {
    return completeAll([
      this.verifyInputs(candidateInputs),
      this.verifyContext(candidateFn.boundContext),
      this.verifyExecutionResult(candidateFn, ...candidateInputs)
    ]);
  }
}

export default Signature;
