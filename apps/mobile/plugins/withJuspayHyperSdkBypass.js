const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

function patchHyperSdkGradle(contents) {
  let next = contents;

  next = next.replace(/^import in\.juspay\.payments\.core\.ClientConfig\s*\r?\n/m, "");
  next = next.replace(/^\s*classpath 'in\.juspay:hypersdk\.plugin:[^']+'\s*\r?\n/m, "");
  next = next.replace(/^apply plugin: 'hypersdk\.plugin'\s*\r?\n/m, "");

  next = next.replace(
    /static def getExcludedMicroSdks\(rootProject\) \{[\s\S]*?^\}\r?\n\r?\n/m,
    ""
  );
  next = next.replace(
    /static def getClientId\(rootProject\) \{[\s\S]*?^\}\r?\n\r?\n/m,
    ""
  );
  next = next.replace(
    /static def getClientConfigs\(rootProject, Project project\) \{[\s\S]*?^\}\r?\n\r?\n/m,
    ""
  );

  next = next.replace(
    /hyperSdkPlugin \{[\s\S]*?^\}\r?\nif \(rootProject\.hasProperty\("clientId"\)\) \{[\s\S]*?^\}\r?\nif \(!rootProject\.hasProperty\("clientId"\) && rootProject\.hasProperty\("clientConfigs"\)\) \{[\s\S]*?^\}\r?\n\r?\nif\(rootProject\.hasProperty\('hyperAssetVersion'\)\) \{[\s\S]*?^\}\r?\n\r?\nif\(rootProject\.hasProperty\('microSDKs'\)\) \{[\s\S]*?^\}\r?\n?/m,
    ""
  );

  next = next.replace(
    /compileOnly "in\.juspay:hypercheckoutlite:\$\{getHyperSDKVersion\(rootProject\)\}"/g,
    'implementation "in.juspay:hypercheckoutlite:${getHyperSDKVersion(rootProject)}"'
  );

  return next;
}

module.exports = function withJuspayHyperSdkBypass(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const packageJsonPath = require.resolve("hyper-sdk-react/package.json", {
        paths: [modConfig.modRequest.projectRoot],
      });
      const packageRoot = path.dirname(packageJsonPath);
      const gradlePath = path.join(packageRoot, "android", "build.gradle");
      const original = fs.readFileSync(gradlePath, "utf8");
      const patched = patchHyperSdkGradle(original);

      if (patched !== original) {
        fs.writeFileSync(gradlePath, patched);
      }

      return modConfig;
    },
  ]);
};
