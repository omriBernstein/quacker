import quacker from './source';

const lodashInterface = quacker('_');

lodashInterface.document('Lodash is beautiful library');
// lodashInterface.document(function () {
//   return this.ioexamples.reduce(...);
// });

lodashInterface.documentation.compile()
.then(function (docs) {
  console.log('docs', docs);
});

const flattenx = lodashInterface.property('flatten');
// implement lodash, it would need .hasOwnProperty('flatten')

flattenx // => autoMocking
.ioexample('simple')
  .given([1,[2,3]])
  .return([1,2,3]);

flattenx.ioexample('simple').inputs[0];

// flattenx
// .constraint('name')
//   .verifiesThat(function (flatten) {
//     flatten(...);
//     expect(...);
//   })

flattenx
.signature('standard')
  .given(Array)
  .return(Array);

flattenx
  .signature()
  .given(Array.instance, Boolean.instance)
  .return(Number.instance);


const maxIterationsInterface = lodashInterface.property('maxIterations');

maxIterationsInterface.example({usually: 500, sometimes: 300})

// CommentInterface.example({
//   body: 'foobar',
//   title: 'nope'
// })

// arrayx.example('short and flat', [1,2,3])

const _ = {
  flatten: function (arr) {
    // const flat = [];
    // arr.forEach(function addIn (elem) {
    //   if (Array.isArray(elem)) elem.forEach(addIn);
    //   else flat.push(elem);
    // });
    // return flat;
  }
};

lodashInterface.verify(_)
.then(
  function () {
    console.log('yay');
  },
  function (err) {
    console.log('nay');
    console.error(err);
  }
);
