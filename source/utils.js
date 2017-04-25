import assert from 'assert';
import Promise from 'bluebird';

const originalBind = Function.prototype.bind;
Object.defineProperty(Function.prototype, 'bind', {
  value: function (boundContext) {
    const boundFunction = originalBind.call(this, ...arguments);
    boundFunction.boundContext = boundContext;
    return boundFunction;
  }
});

export function completeAll (iter) {
  const successes = [];
  const failures = [];
  return Promise.all([...iter].map(function (elem, idx) {
    return elem.then(
      v => successes[idx] = v,
      e => failures[idx] = e
    );
  }))
  .then(function () {
    if (failures.length === 0) return successes;
    const aggErr = new Promise.AggregateError();
    failures.forEach(function addErr (err) {
      if (err instanceof Promise.AggregateError) err.forEach(addErr);
      else aggErr.push(err);
    });
    throw aggErr.length === 1 ? aggErr[0] : aggErr;
  });
}

export function values (obj) {
  return Object.keys(obj).map(k => obj[k]);
}

export function hasProperty (thing, propertyName) {
  if (thing === null || thing === undefined) return false;
  try {
    return propertyName in thing;
  } catch (e) {
    return propertyName in Object.getPrototypeOf(thing);
  }
}

export function deepEqual (actual, expected) {
  try {
    assert.deepEqual(actual, expected);
    return true;
  } catch (err) {
    return false;
  }
}

export function nanoDiff (timeA, timeB) {
  return (timeA[0]*1e9 + timeA[1]) - (timeB[0]*1e9 + timeB[1]);
}

const firstLine = /^[\s\S]*?\n/g;
export function stacktrace () {
  return new Error().stack.replace(firstLine, 'Stacktrace only (no error):\n')
}

const _cyclingIdxs = new WeakMap();
export function cycle (arr) {
  if (!_cyclingIdxs.has(arr)) _cyclingIdxs.set(arr, 0);
  const idx = _cyclingIdxs.get(arr);
  const elem = arr[idx];
  _cyclingIdxs.set(arr, (idx + 1) % arr.length);
  return elem;
}
export function peek (arr) {
  if (!_cyclingIdxs.has(arr)) return arr[0];
  return arr[_cyclingIdxs.get(arr)];
}

export function VerifierFailure (verifier, candidate, err) {
  err.message += `\n* ${verifier.constructor.name} '${verifier.title || verifier.name}' failed. For failing candidate, see \`.candidate\` property of this error.`;
  err.candidate = candidate;
  return err;
}

function nanoFromMilli (milli) {
  return [parseInt(1e-3 * milli), parseInt(1e6 * (milli % 1))];
}

// TODO: experiment, determine how much adding one more thing (or in the case of performance.now and Date.now a couple more things) to the callstack affects the timing precision
export function nanoTime () {
  if (typeof process !== 'undefined' && typeof process.hrtime === 'function') {
    return process.hrtime();
  }
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return nanoFromMilli(performance.now());
  }
  return nanoFromMilli(Date.now());
}

export function transformError (baseErr, transformer) {
  if (baseErr instanceof Promise.AggregateError) baseErr.forEach(transformer);
  else transformer(baseErr);
  return baseErr;
}

// formats interface consistency errors
export function InterfaceConsistencyFailure (ioexOrEx, breadcrumbs, baseErr) {
  return transformError(baseErr, function (err) {
    err.message += `\n* ${ioexOrEx.constructor.name} '${ioexOrEx.title}' is inconsistent with interface '${breadcrumbs.join('.')}'.`;
  });
}

export function ImproperAntiExample (ioexOrEx, candidate) {
  const err = new Error(`Verification for anti-example '${ioexOrEx.title}' failed. The candidate caused no verification errors which is a problem because this example is an anti-example. For falsely-passing candidate, see \`.candidate\` property of this error.`);
  err.candidate = candidate;
  return err;
}

// export function deepEqual (thingA, thingB) {
//   if (Object.is(thingA, thingB)) return true;
//   const baseTypeA = Object.prototype.toString.call(thingA).slice(8,-1);
//   const baseTypeB = Object.prototype.toString.call(thingA).slice(8,-1);
//   if (baseTypeA !== baseTypeB) return false;
//   if (typeof thingA === 'function') return thingA === thingB;
//   if (baseTypeA === 'Set') {
//     if (thingA.size !== thingB.size) return false;
//     const thingBCopy = new Array(thingB.values());
//     for (let elemA of thingA) {
//       const matchIndex = thingBCopy.findIndex(function (elemB) {
//         return deepEqual(elemA, elemB);
//       });
//       if (matchIndex === -1) return false;
//       else thingBCopy.splice(matchIndex, 1);
//     }
//   } else if (baseTypeA === 'Map') {
//     if (thingA.size !== thingB.size) return false;
//     const thingBKeys = [], thingBVals = [];
//     for (let [keyB, valB] of thingB) {
//       thingBKeys.push(keyB);
//       thingBVals.push(valB);
//     }
//     for (let [keyA, valA] of thingA) {
//       const matchIndex = thingBKeys.findIndex(function (keyB, idx) {
//         const valB = thingBVals[idx];
//         return deepEqual(keyA, keyB) && deepEqual(valA, valB);
//       });
//       if (matchIndex === -1) return false;
//       else {
//         thingBKeys.splice(matchIndex, -1)
//         thingBVals.splice(matchIndex, -1)
//       }
//     }
//   }
//   const aKeys = Object.keys(thingA);
//   const bKeys = Object.keys(thingB);
//   if (aKeys.length !== bKeys.length) return false;
//   return aKeys.every(function (key) {
//     return deepEqual(aKeys[key], bKeys[key]);
//   });
// }
