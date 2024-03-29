import Selector from './selector';
export function createSelector <T = any, P = string>(
    state?: Slc.StateLike<T,P> | T[],
    config: Slc.Settings = {}) : Slc.Selector<T,P> {
    return new Selector<T,P>(state, config);
}

export default { createSelector };
