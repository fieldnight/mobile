const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { createDevApiProxy } = require('./scripts/devApiProxy.cjs');

const config = getDefaultConfig(__dirname);

// 앱 번들과 무관한 대용량 폴더(에뮬레이터 이미지, 네이티브 빌드 산출물)는 감시하지 않습니다.
// 감시 대상이 수 GB가 되면 Windows에서 "Failed to start watch mode" 타임아웃이 납니다.
const escape = (dir) => path.resolve(__dirname, dir).replace(/[/\\]/g, '[/\\\\]').replace(/\./g, '\\.');
const ignoredDirs = ['tmp', 'android', 'ios', 'telemetry-web'].map(
  (dir) => new RegExp(`^${escape(dir)}([/\\\\].*)?$`),
);
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  ...ignoredDirs,
  /.*\.(apk|aab|zip)$/,
];

const finalConfig = withNativeWind(config, { input: './global.css' });
const enhanceMiddleware = finalConfig.server.enhanceMiddleware;
finalConfig.server.enhanceMiddleware = (middleware, server) => createDevApiProxy(
  enhanceMiddleware ? enhanceMiddleware(middleware, server) : middleware,
);

module.exports = finalConfig;
