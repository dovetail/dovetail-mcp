/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require("@yarnpkg/types");
const { existsSync } = require("fs");
const path = require("path");
const fs = require("fs");
const ts = require("typescript");

let singleSentryVersion = null;
let singleFakerVersion = null;
let singleWebpackVersion = null;
let singleEmotionStyledVersion = null;
let singleRemotionVersion = null;
let singleStorybookVersion = null;

const isSorted = (arr) => arr.every((v, i, a) => !i || a[i - 1] <= v);

module.exports = defineConfig({
  async constraints({ Yarn }) {
    for (const workspace of Yarn.workspaces()) {
      if (!workspace.manifest.scripts) {
        workspace.error(`The workspace ${workspace.ident} is missing "scripts" in package.json.`);
        continue;
      }

      if (!isSorted(Object.keys(workspace.manifest.scripts))) {
        workspace.error(`The workspace ${workspace.ident} package.json "scripts" are not sorted.`);
      }

      // NOTE: A few of the following rules have hard-coded values, this is
      // convenient because it allows you to run `yarn constraints --fix`.

      if (workspace.ident != "@dvtl/root") {
        workspace.unset('scripts.["test"]');
        workspace.unset('scripts.["lint"]');
        // Ensure every workspace (except the root, because the root does
        // recursive checks and is very slow) has doctor.
        workspace.set('scripts.["test.yarn"]', "doctor");
        workspace.set("devDependencies.@yarnpkg/doctor", "^4.0.2");
        if (workspace.ident.startsWith("@dvtl/") && !["@dvtl/nx", "@dvtl/zapier"].includes(workspace.ident)) {
          workspace.set("devDependencies.@dvtl/nx", "workspace:*");
        }
      } else {
        if (!isSorted(Object.keys(workspace.manifest.resolutions))) {
          workspace.error(`The workspace ${workspace.ident} package.json "resolutions" are not sorted.`);
        }
      }

      // Ensure every workspace has prettier
      //
      // For the root workspace we don't want prettier to try and check all the
      // nested workspaces (because it would be slow), so we do a special case
      // there and ignore those paths.
      workspace.set(
        'scripts.["test.prettier"]',
        workspace.ident === "@dvtl/root"
          ? "prettier --cache --cache-location=.cache/.prettier-cache --list-different '!workspaces/**/*' '!infra/**/*' '**/*'"
          : "prettier --cache --cache-location=.cache/.prettier-cache --list-different --ignore-path $(yarn workspace @dvtl/root rootPwd)/.prettierignore '**/*'",
      );
      workspace.set(
        'scripts.["fix.prettier"]',
        workspace.ident === "@dvtl/root"
          ? "prettier --cache --cache-location=.cache/.prettier-cache --list-different '!workspaces/**/*' '!infra/**/*' '**/*' -w"
          : "prettier --cache --cache-location=.cache/.prettier-cache --list-different --ignore-path $(yarn workspace @dvtl/root rootPwd)/.prettierignore '**/*' -w",
      );
      workspace.set("devDependencies.prettier", "^3.3.3");
      workspace.set("devDependencies.prettier-plugin-organize-imports", "^4.0.0");

      if ("test.eslint" in workspace.manifest.scripts) {
        const isEslintViaJestRunner = workspace.manifest.scripts["test.eslint"].includes("jest ");
        if ("test.jest" in workspace.manifest.scripts && !isEslintViaJestRunner) {
          workspace.set("scripts.['test.eslint']", "jest --selectProjects=eslint --maxWorkers=1");
        }
        if (isEslintViaJestRunner) {
          workspace.set("devDependencies.jest-runner-eslint", "^2.1.2");
          workspace.set("jest-runner-eslint.cliOptions.reportUnusedDisableDirectives", "error");
        }
      }

      if ("test.jest" in workspace.manifest.scripts) {
        if (!workspace.manifest.scripts["test.jest"].includes("--selectProjects")) {
          workspace.set("scripts.['test.jest']", `${workspace.manifest.scripts["test.jest"]} --selectProjects=test`);
        }
      }

      if ("pulumi" in workspace.manifest.scripts) {
        // This is an infra workspace
        if (!workspace.manifest.scripts.pulumi.includes("PULUMI_NODEJS_TRANSPILE_ONLY=true")) {
          workspace.set("scripts.pulumi", `PULUMI_NODEJS_TRANSPILE_ONLY=true ${workspace.manifest.scripts.pulumi}`);
        }
      }

      let tsConfig;
      {
        const tsConfigJsonPath = path.join(workspace.cwd, "tsconfig.json");
        if (existsSync(tsConfigJsonPath)) {
          const { config, error } = ts.readConfigFile(tsConfigJsonPath, (path) => fs.readFileSync(path, { encoding: "utf8" }));
          if (config == null || error != null) {
            workspace.error("Failed to read tsconfig.json file: " + error);
          } else {
            tsConfig = config;
          }
        }
      }

      // "Build-less" workspaces are those with a `main` field referring to a
      // `.ts` file, which only works if you're running everything with a "just
      // in time" transpiler like esbuild/swc/ts-node etc.
      //
      // In this case there's no need to _also_ have a build script that just
      // runs `tsc`, and there's actually a penalty to doing so because it adds
      // to the number of dependency tasks Nx needs to do (since most tasks
      // depend on `^build`).
      if ((workspace.manifest.main ?? "").endsWith(".ts")) {
        if (!workspace.manifest.scripts["test.tsc"]) {
          workspace.set("scripts.['test.tsc']", "tsc --noEmit");
        }
        if (tsConfig?.compilerOptions?.noEmit !== true) {
          workspace.error(`The workspace ${workspace.ident} does not have a tsconfig.json file with "noEmit": true.`);
        }
      }

      if ("test.eslint" in workspace.manifest.scripts) {
        if (workspace.ident !== "@dvtl/zapier") {
          workspace.set("devDependencies.@dvtl/eslint-plugin-dvtl", "workspace:*");
        }
        if (!("fix.eslint" in workspace.manifest.scripts)) {
          workspace.set("scripts.['fix.eslint']", "eslint --fix .");
        }
      }

      for (const [name, value] of Object.entries(workspace.manifest.scripts)) {
        const bannedChars = /:|-/g;
        if (bannedChars.test(name)) {
          workspace.error(
            `The script "${name}" contains banned characters (: or -). They must be camel case and not contain colons which make the script global.`,
          );
        }

        if (value.startsWith("sh ")) {
          // Don't explicitly call sh, just run the script and rely on the
          // shebang line.
          workspace.set(`scripts.["${name}"]`, value.replace(/^sh /, ""));
        }
      }

      // There's no need to have a 'version' field if it's a private package and
      // the version is `0.0.0`. Previously we thought it was necessary, so we
      // used `0.0.0`.
      if (workspace.manifest.version === "0.0.0" && workspace.manifest.private) {
        workspace.unset("version");
      }
    }

    for (const dep of Yarn.dependencies({ workspace: Yarn.workspace({ ident: "@dvtl/zapier" }) })) {
      if (dep.range.startsWith("workspace:")) {
        dep.error(`${dep.ident}@${dep.range} is not supported by Zapier due to its build scripts.`);
      }
    }

    for (const dep of Yarn.dependencies()) {
      // @sentry/cli doesn't use the same version as the rest of the sentry packages
      if (dep.ident.startsWith("@sentry/") && dep.ident !== "@sentry/cli") {
        singleSentryVersion ??= dep.range;
        dep.update(singleSentryVersion);
      } else if (dep.ident.startsWith("@faker-js/")) {
        singleFakerVersion ??= dep.range;
        dep.update(singleFakerVersion);
      } else if (dep.ident === "webpack") {
        singleWebpackVersion ??= dep.range;
        dep.update(singleWebpackVersion);
      } else if (dep.ident === "@emotion/styled") {
        singleEmotionStyledVersion ??= dep.range;
        dep.update(singleEmotionStyledVersion);
      } else if (dep.ident === "remotion" || dep.ident.startsWith("@remotion")) {
        singleRemotionVersion ??= dep.range;
        dep.update(singleRemotionVersion);
      } else if (
        (dep.ident === "storybook" || dep.ident.startsWith("@storybook")) &&
        dep.ident !== "@storybook/addon-webpack5-compiler-swc"
      ) {
        singleStorybookVersion ??= dep.range;
        dep.update(singleStorybookVersion);
      }
    }
  },
});
