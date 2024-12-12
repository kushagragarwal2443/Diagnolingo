module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: './secrets/.env',
        safe: false,  // If you want to enforce loading all variables
        allowlist: null, // You can limit which variables to load if needed
        blacklist: null,
        verbose: true,
      },
    ],
  ],
};