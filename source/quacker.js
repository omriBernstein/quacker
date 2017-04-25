import Interface from './interface';

const quacker = (name) => new Interface(name);

quacker.implements = (candidate, interf) => interf.verify(candidate);

export default quacker;
