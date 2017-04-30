export default function flatten(arr) : any[] {
  return !Array.isArray(arr) ? [arr] : arr.reduce((acc, item) => [
    ...acc,
    ...flatten(item)
  ], []);
}