([
    './flatten.spec.ts',

    './behaviours/constructing.spec.ts',
    './behaviours/setting-and-getting-state.spec.ts',
    './behaviours/adding-and-removing-items.spec.ts',
    './behaviours/selecting-and-deselecting-items.spec.ts',
    './behaviours/patching-state.spec.ts',
    './behaviours/subscribing-to-changes.spec.ts',
    './behaviours/serializing-state.spec.ts',
    './behaviours/validating-state.spec.ts'
]).forEach(require);