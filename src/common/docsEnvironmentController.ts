import vscode from 'vscode';
import { EnvironmentChanged, UserTypeChange } from './loggingEvents';
import { Environment, DocsRepoType, EXTENSION_NAME, ENVIRONMENT_CONFIG_NAME, DEBUG_MODE_CONFIG_NAME, USER_TYPE, UserType, ENABLE_AUTOMATIC_REAL_TIME_VALIDATION } from '../shared';
import { EventStream } from './eventStream';
import { EnvironmentController } from './environmentController';
import { getRepositoryInfoFromLocalFolder } from '../utils/utils';

export class DocsEnvironmentController implements EnvironmentController, vscode.Disposable {
    private _environment: Environment;
    private _debugMode: boolean;
    private _docsRepoType: DocsRepoType;
    private _configurationChangeListener: vscode.Disposable;
    private _userType: UserType;
    private _enableAutomaticRealTimeValidation: boolean;

    constructor(private _eventStream: EventStream) {
    }

    public async initialize(): Promise<void> {
        this._environment = this.getEnv();
        this._debugMode = this.getDebugMode();
        this._docsRepoType = await this.getDocsRepoType();
        this._userType = this.getUserType();
        this._enableAutomaticRealTimeValidation = this.getEnableAutomaticRealTimeValidation();

        this._configurationChangeListener = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            if (event.affectsConfiguration(`${EXTENSION_NAME}.${ENVIRONMENT_CONFIG_NAME}`)) {
                this.refreshEnv();
            } else if (event.affectsConfiguration(`${EXTENSION_NAME}.${DEBUG_MODE_CONFIG_NAME}`)) {
                this._debugMode = this.getDebugMode();
                this.reloadWindow();
            } else if (event.affectsConfiguration(`${EXTENSION_NAME}.${USER_TYPE}`)) {
                this._userType = this.getUserType();
                this._eventStream.post(new UserTypeChange(this._userType));
            } else if (event.affectsConfiguration(`${EXTENSION_NAME}.${ENABLE_AUTOMATIC_REAL_TIME_VALIDATION}`)) {
                this._enableAutomaticRealTimeValidation = this.getEnableAutomaticRealTimeValidation();
            }
        });
    }

    public static async CreateAsync(eventStream: EventStream): Promise<DocsEnvironmentController> {
        const docsEnvironmentController = new DocsEnvironmentController(eventStream);
        await docsEnvironmentController.initialize();

        return docsEnvironmentController;
    }

    public dispose(): void {
        this._configurationChangeListener.dispose();
    }

    public get env(): Environment {
        return this._environment;
    }

    public get docsRepoType(): DocsRepoType {
        return this._docsRepoType;
    }

    public get debugMode(): boolean {
        return this._debugMode;
    }

    public get userType(): UserType {
        return this._userType;
    }

    public get enableAutomaticRealTimeValidation(): boolean {
        return this._enableAutomaticRealTimeValidation;
    }

    private getEnv(): Environment {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
        return extensionConfig.get<Environment>(ENVIRONMENT_CONFIG_NAME, 'PROD');
    }

    private getDebugMode(): boolean {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
        return extensionConfig.get<boolean>(DEBUG_MODE_CONFIG_NAME, false);
    }

    private getUserType(): UserType {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
        return extensionConfig.get<UserType>(USER_TYPE, UserType.Unknown);
    }

    private getEnableAutomaticRealTimeValidation(): boolean {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
        return extensionConfig.get<boolean>(ENABLE_AUTOMATIC_REAL_TIME_VALIDATION, false);
    }

    private async getDocsRepoType(): Promise<DocsRepoType> {
        const activeWorkSpaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
        if (activeWorkSpaceFolder) {
            try {
                const [docsRepoType] = await getRepositoryInfoFromLocalFolder(activeWorkSpaceFolder.uri.fsPath);
                return docsRepoType;
            } catch {
                return 'GitHub';
            }
        }
        return 'GitHub';
    }

    private refreshEnv() {
        const newEnv = this.getEnv();

        if (this._environment && this._environment !== newEnv) {
            this._eventStream.post(new EnvironmentChanged(newEnv));
        }
        this._environment = newEnv;
    }

    private async reloadWindow() {
        const selected = await vscode.window.showInformationMessage("This configuration change requires reloading your current window!", "Reload");
        if (selected) {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }
}