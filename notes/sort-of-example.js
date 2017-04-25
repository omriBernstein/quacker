const t = quacker.types
const _x = quacker(_);

const flattenx = _x.method('flatten');

flattenx
.example('trivial')
  .given([1,[2,3]])
  .returns([1,2,3])
.example('complex')
  .given([[7,[true],Array.prototype],[[['x']],[]],[{},function () {}]])
  .returns([7,true,Array.prototype,'x',{},function () {}]);

flattenx
.validation('is recursive', function (flatten) {
  flatten([1,2,3]);
  expect(flatten).to.have.been.called()
});

quacker.implements(_.flatten, flattenx);

flattenx
.signature('simple')
.given([t.Anything])
.returns([t.not.Array]);

flattenx
.signature()
.given(function (input) {
  expect(input).to.be.an('array');
})
.returns(function (output) {
  expect(output).to.be.an('array');
  expect(output).to.not.contain
})

questions
- runtime validation?
- ahead-of-time validation?
- context (i.e. `this`)?

quacker
- method
  - documentation
  - example
    - name
    - positive or negative
    - input
    - return output, thrown output
    - setup
    - teardown
  - validation
    - name
    - body
    - setup
    - teardown
  - signature
    - name
    - in
    - out
  - meta
- property
  - documentation
  - example
    - name
    - positive or negative
    - value
  - validation
    - name
    - body
  - signature
    - name
    - type
  - meta


goals
- documentation
  - purpose
  - example
  - coverage reporting
- validation
  - ahead-of-time, i.e. automated testing (involves setup/teardown)
  - run-time, i.e. schemas (no setup/teardown)