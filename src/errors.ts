export default {
    NO_ITEM: context => `${context} --> item does not exist.`,
    ALREADY_EXIST: context => `${context} --> item already exist.`,
    ALREADY_SELECTED: context => `${context} --> item is already selected.`,
    ALREADY_DESELECTED: context => `${context} --> item is already deselected.`,
    INVALID_TYPE: context => `${context} --> item must be of same type.`,
    INVALID_OBSERVER: () => `subscribe --> observer is not a function.`,
    INVALID_STATE: context => `${context} --> provided state is not valid. 
                    Make sure to provide valid 'items' and 'selections' arrays.`,

}