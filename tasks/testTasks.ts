import gulp from 'gulp';
import path from 'path';
import { rootPath, testAssetsPath, defaultOutputPath } from './projectPaths';
import { runTests } from 'vscode-test';
import simpleGit from 'simple-git';

// eslint-disable-next-line node/no-missing-require
require('./benchmarkTestTask');

gulp.task('test:e2e', async () => {
    const extensionDevelopmentPath = rootPath;
    const extensionTestsPath = path.resolve(rootPath, './out/test/e2eTests/index');
    const testRepoPath = path.join(testAssetsPath, "vscode-docs-build-e2e-test");

    // Initialize Submodule
    const git = simpleGit(rootPath);
    await git.submoduleUpdate(['--init']);

    const githubToken = process.env.VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN;
    if (!githubToken) {
        throw new Error('Cannot get "VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN" from environment variable');
    }

    const extensionTestsEnv = {
        'VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN': githubToken,
        'VSCODE_DOCS_BUILD_EXTENSION_OUTPUT_FOLDER': defaultOutputPath
    };

    // Download VS Code, unzip it and run the integration test
    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        extensionTestsEnv,
        launchArgs: [testRepoPath, '--disable-extensions']
    });
});

gulp.task('test:unit', async () => {
    const extensionDevelopmentPath = rootPath;
    const extensionTestsPath = path.resolve(rootPath, './out/test/unitTests/index');

    const extensionTestsEnv = {
        'VSCODE_DOCS_BUILD_EXTENSION_OUTPUT_FOLDER': defaultOutputPath
    };

    // Download VS Code, unzip it and run the integration test
    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        extensionTestsEnv,
        launchArgs: ['--disable-extensions']
    });
});

gulp.task('test', gulp.series(
    'test:e2e',
    'test:unit'
));