import {InterfaceConsistencyFailure, ImproperAntiExample} from './utils';

// denote a literal, static example
// useful for documentation and/or generating fake data
class Example {
  constructor (title, value, isAntiExample = false, target = null) {
    this.title = title;
    this.value = value;
    this.isAntiExample = isAntiExample;
    // internally, the `.target` will only ever be an interface instance
    // externally, the `.target` could be used to attach the example to whatever really (it's just metadata after all)
    this.target = target;
  }
  // `.consistentWith` confirms whether or not this example is `.verify`ed by the given interface
  consistentWith (interf, breadcrumbs = [interf.name]) {
    const candidate = this.value;
    // the following line prevents anti-example failures when the interface has no verifiers
    if (interf.verifierCount === 0) return Promise.resolve(candidate);
    // capture whether or not the example is an anti-example, mainly so that the end result is consistent with the starting state of the example
    const isAntiExample = this.isAntiExample;
    // verify and invert the result for anti-examples
    return interf.verify(candidate)
    .then(value => {
      if (isAntiExample) throw ImproperAntiExample(this, candidate);
      return value;
    }, err => {
      if (isAntiExample) return;
      throw err;
    })
    .catch(err => {
      throw InterfaceConsistencyFailure(this, breadcrumbs, err);
    });
  }
}

export default Example;
