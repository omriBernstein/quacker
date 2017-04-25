import Promise from 'bluebird';

import SetupTeardown from './setup-teardown';
import {VerifierFailure} from './utils';

// a constraint is the most open-ended verifier (a thing with a `.verify` method)
// it simply accepts a validator function that should either error to deny verification or not error to affirm it
class Constraint extends SetupTeardown {
  constructor (title, validator, target = null) {
    super();
    this.title = title;
    this.validator = validator;
    // internally, the `.target` will only ever be an interface instance
    // externally, the `.target` could be used to attach the constraint to whatever really (it's just metadata after all)
    this.target = target;
  }
  verifyWithoutSetupOrTeardown (candidate) {
    // TODO: error if there's no validator to use
    return Promise.try(Function.prototype.bind.call(this.validator, candidate))
    .catch(err => {
      throw VerifierFailure(this, candidate, err);
    });
  }
  // `.verify` confirms whether a candidate fits this contraint
  // if the validator throws an error or results in a rejected promise, the constraint fails
  verify (candidate) {
    return Promise.bind(this)
    .then(this.runSetups)
    .then(() => this.verifyWithoutSetupOrTeardown(candidate))
    .then(this.runTeardowns);
  }
  verifiesThat (validator) {
    this.validator = validator;
    return this;
  }
}

export default Constraint;
