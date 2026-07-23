const path = require("path");

// Gradle's Expo export worker does not consistently inherit this environment
// variable on Windows. Set it here so Expo Router can resolve require.context
// for both development and release bundles.
process.env.EXPO_ROUTER_APP_ROOT ??= path.join(__dirname, "app");

function inlineExpoRouterAppRoot({ types: t }) {
  return {
    name: "webee-inline-expo-router-app-root",
    visitor: {
      MemberExpression(memberPath, state) {
        const node = memberPath.node;
        if (
          !t.isMemberExpression(node.object) ||
          !t.isIdentifier(node.object.object, { name: "process" }) ||
          !t.isIdentifier(node.object.property, { name: "env" }) ||
          !t.isIdentifier(node.property)
        ) {
          return;
        }

        if (node.property.name === "EXPO_ROUTER_IMPORT_MODE") {
          memberPath.replaceWith(t.stringLiteral("sync"));
          return;
        }
        if (node.property.name !== "EXPO_ROUTER_APP_ROOT") return;

        const filename = state.filename ?? state.file.opts.filename;
        if (!filename) return;
        const relativeAppRoot = path
          .relative(path.dirname(filename), path.join(__dirname, "app"))
          .replace(/\\/g, "/");
        memberPath.replaceWith(
          t.stringLiteral(
            relativeAppRoot.startsWith(".")
              ? relativeAppRoot
              : `./${relativeAppRoot}`,
          ),
        );
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
          },
        },
      ],
      inlineExpoRouterAppRoot,
      "react-native-reanimated/plugin",
    ],
  };
};
