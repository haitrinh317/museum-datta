export default function browserFetch(...args) {
  return globalThis.fetch(...args);
}
