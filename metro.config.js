const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
const virtualStoreRoot = path.resolve(
  fs.realpathSync(path.join(__dirname, 'node_modules', 'expo')),
  '../../..',
);

config.watchFolders = [...new Set([...(config.watchFolders ?? []), virtualStoreRoot])];
config.resolver.nodeModulesPaths = [
  path.join(__dirname, 'node_modules'),
  ...(config.resolver.nodeModulesPaths ?? []),
];

module.exports = withNativeWind(config, { input: './global.css' });

