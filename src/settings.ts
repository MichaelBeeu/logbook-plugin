import {App, PluginSettingTab, Setting, ValueComponent} from "obsidian";
import LogbookPlugin from "./main";

export interface LogbookPluginSettings {
	mySetting: string;

	closeOpenLogbooksOnExit: boolean;
}

export const DEFAULT_SETTINGS: LogbookPluginSettings = {
	mySetting: 'default',

	closeOpenLogbooksOnExit: false,
}

export class LogbookSettingTab extends PluginSettingTab {
	plugin: LogbookPlugin;

	constructor(app: App, plugin: LogbookPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	#saveBasicSetting<K extends keyof LogbookPluginSettings>(key: K): (value: LogbookPluginSettings[K]) => Promise<void> {
		return async (value: LogbookPluginSettings[K]): Promise<void> => {
			this.plugin.settings[key] = value;
			return this.plugin.saveSettings();
		}
	}

	#configureBasicSetting<K extends keyof LogbookPluginSettings, C extends ValueComponent<any>>(component: C, key: K): C {
		if ('onChange' in component) {
			// TODO: Maybe add a check for each Component type?
			// Unfortunately the existing components do not implement a common interface that
			// provides the onChange method. So each type would probably need to be checked
			// individually.

			// @ts-expect-error
			component.onChange(this.#saveBasicSetting(key))
		}

		return component
			.setValue(this.plugin.settings[key]);
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => this.#configureBasicSetting(text, 'mySetting')
				.setPlaceholder('Enter your secret')
			);
				// .onChange(async (value) => {
				// 	this.plugin.settings.mySetting = value;
				// 	await this.plugin.saveSettings();
				// }));

		new Setting(containerEl).setName('Experimental').setHeading();
		
		new Setting(containerEl)
			.setName('Close Open Logbook on Exit')
			.setDesc(`Attempt to close all open logbooks when Obsidian exits.
				This is a best-effort approach due to limitations in Obsidian's on-exit handler.
				Enabling this may cause data-loss with no undo-history if the exit handler parses documents incorrectly.
				This may also interfere with other plugins' exit handlers. Enable at your own risk.`)
			.addToggle(cb => this.#configureBasicSetting(cb, 'closeOpenLogbooksOnExit'))
		;
	}
}
