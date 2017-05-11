export default {
    NOT_EXIST: context => `${context} --> item does not exist.`,
    ALREADY_EXIST: context => `${context} --> item already exist.`,
    READ_ONLY: context => `${context} --> ${context} is a read only property`,
    ALREADY_SELECTED: context => `${context} --> item is already selected.`,
    NOT_SELECTED: context => `${context} --> item is not selected.`,
    NO_TRACKBY: context => `${context} --> action only works in track-by mode.`,
    INVALID_TRACKBY_ITEM: context => `${context} --> item(s) must be objects in track-by mode.`,
    CHANGE: context => `${context} --> a change to current state has occured.`
}