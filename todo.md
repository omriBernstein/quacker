## Comment source code

### done
+ call.js
+ constraint.js
+ documentation.js
+ example.js
+ index.js
+ interface.js
+ quacker.js

### remaining
+ ioexample.js
+ setup-teardown.js
+ signature.js
+ spy.js
+ stub.js
+ utils.js

---

## Determine whether signatures and ioexamples can/should be merged into one thing

There's some definite overlap here, but it's probably best to keep them separate.

### pros
+ ...

### cons
+ ...

---

## Consider option to deep freeze something after verification

### pros
+ it can be cached and the truth of its implementation status wouldn't have to be checked again

### cons
+ ...

---

## Consider using a (universal) library for `assert`

This is as opposed to built-in node_module, and don't forget the need for something like `assert.deepEqual`.

### pros
+ makes it possible to use this library in the browser

### cons
+ deepens this library's footprint

### alternatives
+ maybe there's already some way to package node's assert module for browser usage
+ maybe just write your own thing and put it in utils

---

## Get setup with compiling

Including (probably) transpiling (babel), minification (uglify), and some build tool (webpack?).

---

## Make other libs to go with quacker

Really quacker is pretty open-ended. Could maybe be used for:

+ **unit testing**: If so, there'd need to be some kind of test runner and/or an assertion library.
+ **runtime validation (e.g. database schemas)**: Might work out-of-the-box for this in general, but it could be worth adapting it to a particular db, like mongo. Separately, probably worth it to have defined validations be universally (isomorphically) accessible, and I doubt whether *that* would work out-of-the-box. Possible synergy with `isopod`.
+ **autodocumentation**: There's already some bare bones stuff for documentation, but this would maybe involve some heavier-duty templating. Possibly even integrating with one or more templating engines, like jade or handlebars.

---

## Consider generative examples

That way instead of just static examples, one could provide something that would itself return an example. One use case is for producing any number of fakes. Ideally these fakes would be determinstic, even if random.

---

## Consider function and sets as valid interfaces

This is twofold.

1) The interface constructor should accept a set or a function. A set is simple, that would just be an enumeration of ALL possible values. A function would be assumed to be a constructor so its entire verification would boil down to `instanceof`. For example, `Interface(Array)` would produce an interface that would only verify candidates that are an `instanceof Array`. In both cases, the resulting interface should perhaps *not* be as extensible. Set-derived interfaces should probably not be able to have examples, constraints, ioexamples, or signatures. Constructor-function-derived interfaces should probably not be able to have constraints, ioexamples, or signatures.

2) Signature inputs and outputs should simlarly be able to accept a set or function.

---

## Unite `.verify` for an IOExample and for a Constraint?

They have quite literally identical logic.


---

## Different equality levels for IOExamples

Right now, ioexamples verify a candidate function through a deep equality check on the output. Maybe there should be a way to toggle different kinds of equality checks, both looser and stricter. Perhaps this should also be toggleable when creating an auto-stub on one/many ioexample/s.

---

## Consider versioning

Versioning per interface and/or subinterface. Possibly automated, but probably not.
