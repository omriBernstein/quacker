import assert from 'assert';
import Promise from 'bluebird';

import {nanoTime, nanoDiff, stacktrace} from './utils';

class PromiseInfo {
  get settled () {
    return this.hasOwnProperty('resolved') || this.hasOwnProperty('rejected');
  }
}

// attempt to `.then` on some synchronous result and send info about the resulting promise
function _handlePossiblePromise (syncResult) {
  let info;
  try {
    // note: this info object potentially mutates in the future
    info = new PromiseInfo();
    syncResult.then(
      asyncResult => {
        // note: this end time is likely not ultra-accurate
        info.endTime = nanoTime();
        info.resolved = asynceResult;
      },
      asyncErr => {
        // note: this end time is likely not ultra-accurate
        info.endTime = nanoTime();
        info.rejected = asyncErr;
      }
    );
  } catch (err) {
    // this catch should only ever fire if the synchronous result is not a promise
    info = false;
  }
  return info;
}

// a call represents a single execution of a function with context and arguments
// it contains information about the execution
class Call {
  // invoke a function and record a number of details about its execution
  constructor (fn, context, inputs) {
    // `.boundContext` is not ordinary, see ./utils about this dark magic
    context = fn.hasOwnProperty('boundContext') ? fn.boundContext : context;
    this.fn = fn;
    this.context = context;
    this.inputs = inputs;
    this.stacktrace = stacktrace();
    let syncResult;
    this.startTime = nanoTime();
    try {
      syncResult = Function.prototype.apply.call(this.fn, context, inputs);
    } catch (syncErr) {
      this.endTime = nanoTime();
      this.thrown = syncErr;
      return this;
    }
    this.endTime = nanoTime();
    this.returned = syncResult;
    this.promise = _handlePossiblePromise(syncResult);
    return this;
  }
  // the (synchronous) duration (in nanotime) of the call's execution
  get duration () {
    return nanoDiff(this.endTime, this.startTime);
  }
  // the duration (in nanotime) between the call's execution and the completion of its resulting promise
  // if the call did not result in a promise, or the promise has not yet settled, comes back `undefined`
  get promiseDuration () {
    if (!this.promise || !this.promise.settled) return undefined;
    return nanoDiff(this.promise.endTime, this.startTime);
  }
  // returns (never throws) the (synchronous) output, which itself may be a thrown error or a returned value
  get output () {
    return this.hasOwnProperty('thrown') ? this.thrown : this.returned;
  }
  // returns the result of this call's resulting promise, which itself may be a rejected reason or a resolved value
  // alternatively, throws if there was no resulting promise, or there was but it has not settled
  get promiseOutput () {
    if (!this.promise) throw new Error('Cannot retrieve a promise output for this call because it did not result in a promise'); // TODO: format error
    if (!this.promise.settled) throw new Error('Cannot retrieve a promise output for this call because the resulting promise has not yet settled. Consider using `call.complete().then(call => {/* do something with call.promiseOutput */})` to access this call\'s promise output'); // TODO: format error
    return this.promise.hasOwnProperty('rejected') ? this.promise.rejected : this.promise.resolved;
  }
  get ultimateOutput () {
    if (this.promise) return this.promiseOutput;
    return this.output;
  }
  // determines whether there was a synchronous throw or an asynchronous (promise) rejection
  // note: will come back with `undefined` if the result was a promise and it has not yet settled
  get failed () {
    if (this.hasOwnProperty('thrown')) return true;
    if (!this.promise) return false;
    if (!this.promise.settled) return undefined;
    return this.promise.hasOwnProperty('rejected');
  }
  // determines whether there was a non-asynchronous result or an asynchronous (promise) resolution
  // note: will come back with `undefined` if the result was a promise and it has not yet settled
  get succeeded () {
    if (!this.promise) return this.hasOwnProperty('returned');
    if (!this.promise.settled) return undefined;
    return this.promise.hasOwnProperty('resolved');
  }
  // reproduces the ultimate result of the call, throwing or returning as the case may be
  // this result is, `.discharge`ing does not cause the call to "re-execute"
  discharge () {
    if (this.hasOwnProperty('thrown')) throw this.thrown;
    else return this.returned
  }
  // returns a new call with the same invocation details (thus "re-executing" the call)
  redo () {
    return new Call(this.fn, this.context, this.inputs);
  }
  // returns a promise for the call that only resolves once any potential resulting promise has settled
  // that means the resolved value for this promise contains "complete" info about the call
  completed () {
    return Promise.resolve(this.returned)
    .then(() => this);
  }
  // confirms whether or not the output was a promise, and whether or not it "failed"
  verifyOutputStyle (shouldHaveBeenPromise, shouldHaveFailed) {
    shouldHaveBeenPromise = Boolean(shouldHaveBeenPromise);
    shouldHaveFailed = Boolean(shouldHaveFailed);
    return this.completed()
    .then(call => {
      assert(shouldHaveBeenPromise === Boolean(call.promise)); // TODO: format error
      assert(shouldHaveFailed === call.failed); // TODO: format error
      return call;
    });
  }
}

export default Call;
