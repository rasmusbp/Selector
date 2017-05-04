export default {
    NOT_EXIST: context => `${context} --> item does not exist.`,
    ALREADY_EXIST: context => `${context} --> item already exist.`,
    READ_ONLY: context => `${context} --> ${context} is a read only property`,
    ALREADY_SELECTED: context => `${context} --> item is already selected.`,
    NOT_SELECTED: context => `${context} --> item is not selected.`,
    INVALID_TYPE: context => `${context} --> item must be of same type.`,
    INVALID_STATE: context => `${context} --> provided state is not valid. 
                    Make sure to provide valid 'items' and 'selections' arrays.`,

}