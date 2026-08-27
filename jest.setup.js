// react-native-mmkv is a native Nitro module; it cannot run under plain Jest.
// Back it with an in-memory Map so store/outbox tests can exercise real read/write paths.
jest.mock('react-native-mmkv', () => {
  function createMMKV() {
    const map = new Map();
    return {
      set: (key, value) => map.set(key, value),
      getString: (key) => (map.has(key) ? map.get(key) : undefined),
      remove: (key) => map.delete(key),
    };
  }
  return { createMMKV };
});
