module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // 'react-native-reanimated/plugin' must be listed LAST. Forgetting this makes
    // animations silently do nothing instead of erroring.
    plugins: ['react-native-reanimated/plugin'],
  };
};
