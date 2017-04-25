import assert from 'assert';
import Promise from 'bluebird';

import Documentation from './documentation';
import Constraint from './constraint';
import Example from './example';
import IOExample from './ioexample';
import Signature from './signature';
import {completeAll, values, hasProperty, transformError} from './utils';

// formats interface verification errors
function InterfaceVerifyFailure (breadcrumbs, baseErr) {
  return transformError(baseErr, function (err) {
    err.message += `\n* Failed to verify interface '${breadcrumbs.join('.')}'.`;
  });
}

// calls `.verify` on anything with such a method and formats the error (if there is one)
// note: this should only be called when doing a "leaf verification",
// any verification that will not lead to additional (recursive) verification
function verifyLeaf (verifier, candidate, breadcrumbs) {
  return verifier.verify(candidate)
  .catch(err => {
    throw InterfaceVerifyFailure(breadcrumbs, err);
  });
}

// calls `verifyLeaf` on an array of things with a `.verify` method
function verifyLeaves (verifiers, candidate, breadcrumbs) {
  return completeAll(verifiers.map(verifier => verifyLeaf(verifier, candidate, breadcrumbs)));
}

// meat & potatoes of quacker
// an interface boils down to a set of verifications
// a candidate (any object or value) "implements" an interface if it passes all such verifications
class Interface {
  constructor (name, parent = null) { // TODO: schemas, i.e. `quacker('Promise', {prototype: {then: ...}})`
    this.name = name;
    // only interfaces defined "inline" (nested inside a `.property` declaration of another interface) should have a `.parent` property
    // the `.parent` property is (for now) not used internally
    // externally, it denotes whether the given interface is stand-alone, and if not what interface it sits within
    this.parent = parent;
    this.examples = {}; // TODO: consider using arrays to avoid possible weirdness with titles not matching property names, and also to maintain definition order (if so, how to deal with looking something up by title?)
    this.constraints = {}; // TODO: consider using arrays to avoid possible weirdness with titles not matching property names, and also to maintain definition order (if so, how to deal with looking something up by title?)
    this.ioexamples = {}; // TODO: consider using arrays to avoid possible weirdness with titles not matching property names, and also to maintain definition order (if so, how to deal with looking something up by title?)
    this.signatures = {}; // TODO: consider using arrays to avoid possible weirdness with titles not matching property names, and also to maintain definition order (if so, how to deal with looking something up by title?)
    this.properties = {};
  }
  // get or set documentation
  document (source) {
    this.documentation = new Documentation(source, this);
    return this;
  }
  // get or add an example
  example (title, value, isAntiExample = false) {
    this.examples[title] = new Example(title, value, isAntiExample, this);
    return this;
  }
  antiExample (title, value) {
    return this.example(title, value, true);
  }
  // get or add a constraint
  constraint (cnsrtOrTitle, validator) {
    const constraints = this.constraints;
    if (arguments.length > 1) {
      constraints[cnsrtOrTitle] = new Constraint(cnsrtOrTitle, validator, this);
      // an interface constraint immediately defined with a validator will simply return the interface
      // otherwise (note below) it will return the constraint instance
      return this;
    }
    // if given a title for an existing constraint, returns it
    if (constraints.hasOwnProperty(cnsrtOrTitle)) return constraints[cnsrtOrTitle];
    // constructs a new constraint or uses an existing one (if an existing one was passed in)
    const constraint = (cnsrtOrTitle instanceof Constraint ? cnsrtOrTitle : new Constraint(cnsrtOrTitle, undefined, this));
    return constraints[constraint.title] = constraint;
  }
  // get or add an ioexample
  ioexample (ioexOrTitle) {
    const ioexamples = this.ioexamples;
    // if given a title for an existing ioexample, returns it
    if (ioexamples.hasOwnProperty(ioexOrTitle)) return ioexamples[ioexOrTitle];
    // constructs a new ioexample or uses an existing one (if an existing one was passed in)
    const ioexample = (ioexOrTitle instanceof IOExample ? ioexOrTitle : new IOExample(ioexOrTitle, false, this));
    return ioexamples[ioexample.title] = ioexample;
  }
  // get or add a signature
  signature (sigOrTitle) {
    const signatures = this.signatures;
    // if given a title for an existing signature, returns it
    if (signatures.hasOwnProperty(sigOrTitle)) return signatures[sigOrTitle];
    // constructs a new signature or uses an existing one (if an existing one was passed in)
    const signature = (sigOrTitle instanceof Signature ? sigOrTitle : new Signature(sigOrTitle, this));
    return signatures[signature.title] = signature;
  }
  // get or add a child interface
  property (interOrName) {
    const properties = this.properties;
    // if given a name for an existing child interface, returns it
    if (properties.hasOwnProperty(interOrName)) return properties[interOrName];
    // constructs a new interface or uses an existing one (if an existing one was passed in)
    const child = (interOrName instanceof Interface ? interOrName : new Interface(interOrName, this)); // TODO: nested names, so the `.then` interface for `Promise` would have name `Promise.then` instead of just `then`
    return properties[child.name] = child;
  }
  // get a constraint to verity that a property exists
  propertyConstraint (propertyName) { // TODO: consider generating this ahead-of-time when defining a property instead of as-needed
    return new Constraint(`has property '${propertyName}'`, function () {
      assert(hasProperty(this, propertyName));
    });
  }
  // confirm whether or not a candidate is a valid implementation of this interface
  verify (candidate, breadcrumbs = [this.name]) {
    // breadcrumbs are used to keep track of the path taken through properties during the course of a verification
    // these breadcrumbs only really play a role in the error formatting
    return completeAll([
      this.verifyConstraints(candidate, breadcrumbs),
      this.verifyIOExamples(candidate, breadcrumbs),
      this.verifyProperties(candidate, breadcrumbs)
    ]);
  }
  // confirm whether or not a candidate passes all explicit constraints
  verifyConstraints (candidate, breadcrumbs = [this.name]) {
    return verifyLeaves(values(this.constraints), candidate, breadcrumbs);
  }
  // confirm whether or not a candidate passes all ioexamples
  verifyIOExamples (candidate, breadcrumbs = [this.name]) {
    return verifyLeaves(values(this.ioexamples), candidate, breadcrumbs);
  }
  // confirm whether or not a candidate passes all property requirements
  verifyProperties (candidate, breadcrumbs = [this.name]) {
    const children = this.properties;
    return completeAll(Object.keys(children).map(propertyName => {
      // for each child interface, verify that the property exists on the candidate AND that the nested candidate value passed the nested interface requirements
      return verifyLeaf(this.propertyConstraint(propertyName), candidate, breadcrumbs)
      // the following `.then` ensures that a child interface is only checked after establishing that the property exists in the first place
      .then(function () {
        return children[propertyName].verify(candidate[propertyName], [...breadcrumbs, propertyName])
      });
    }));
  }
  // confirms whether or not
  // 1) every example is `.verify`ed by this interface
  // 2) every ioexample is `.verify`ed by at least one signature on this interface
  // 3) every child interface is itself self consistent
  consistentWithSelf (breadcrumbs = [this.name]) {
    return completeAll([
      ...values(this.examples).map(example => example.consistentWith(this, breadcrumbs)),
      ...values(this.ioexamples).map(ioexample => ioexample.consistentWith(this, breadcrumbs)),
      ...values(this.properties).map(child => child.consistenWithSelf([...breadcrumbs, child.name]))
    ])
    .catch(err => {
      throw InterfaceConsistencyFailure(err, breadcrumbs);
    });
  }
  // counts the number of verifiers on this interface
  // this is also the maximum number of times an inner `.verify` might be called during this interface's own `.verify`
  get verifierCount () {
    return ['constraints', 'ioexamples', 'properties']
    .reduce((fullsum, key) => {
      const base = fullsum + Object.keys(this[key]).length;
      if (key !== 'properties') return base;
      return values(this.properties)
      .reduce((sum, child) => sum + child.verifierCount, base);
    }, 0);
  }
  // using provided examples and ioexamples, generate a fake for the interface
  fake () {
    // TODO: incorporate examples somehow...hmmm...not sure what to do
    // TODO: incorporate children somehow
    return new Stub(values(this.ioexamples));
  }
  // TODO: `.and(<Interface>)` as well as `.or(<Interface>)` for composing interfaces
  // TODO: `.not()` method for returning new inverse? if so what would its name be?
  // TODO: `.explain()` or something like it? to be able to inspect a verification-to-be
}

export default Interface;
