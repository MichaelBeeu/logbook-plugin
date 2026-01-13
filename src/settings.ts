import {App, PluginSettingTab, Setting, SettingGroup, ValueComponent} from "obsidian";
import LogbookPlugin from "./main";

export type TimeWidgetPosition = "inline"|"right";

export interface LogbookIconSetting {
	paused: string;
	open: string;
	done: string;
};

export interface LogbookPluginSettings {
	// Should we attempt to close all opened logbooks in this session on exit?
	closeOpenLogbooksOnExit: boolean;
	
	// "Icons" to show in task time widget.
	icons: LogbookIconSetting;
	
	// Should logbooks match the preceding line's indentation?
	matchIdentation: boolean;
	
	// Should logbooks appear collapsed?
	collapseLogbooks: boolean;
	
	// What position should the task time widget be placed?
	timeWidgetPosition: TimeWidgetPosition;

	// Should the task time widget start an interval to update the timer when active?
	timeWidgetInterval: boolean;
};

export const DEFAULT_SETTINGS: LogbookPluginSettings = {
	closeOpenLogbooksOnExit: false,
	
	icons: {
		paused: "⏸",
		open: "▶",
		done: "✔️"
	},
	
	matchIdentation: true,
	
	collapseLogbooks: true,
	
	timeWidgetPosition: "right",

	timeWidgetInterval: true,
};

export class LogbookSettingTab extends PluginSettingTab {
	plugin: LogbookPlugin;

	constructor(app: App, plugin: LogbookPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	#saveBasicSetting<
		T extends object,
		K extends keyof T,
	>(target: T, key: K): (value: T[K]) => Promise<void> {
		return async (value: T[K]): Promise<void> => {
			target[key] = value;
			return this.plugin.saveSettings();
		}
	}

	#configureBasicSetting<
		C extends ValueComponent<any>,
		T extends object,
		K extends keyof T,
	>(component: C, target: T, key: K): C {
		if ('onChange' in component) {
			// TODO: Maybe add a check for each Component type?
			// Unfortunately the existing components do not implement a common interface that
			// provides the onChange method. So each type would probably need to be checked
			// individually.

			// @ts-expect-error
			component.onChange(this.#saveBasicSetting(target, key))
		}

		return component
			.setValue(target[key]);
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new SettingGroup(containerEl)
			.setHeading('Logbook')
			.addSetting(
				setting => setting
					.setName('Match Indentation')
					.setDesc(`Match indentation of the preceding task element when writing a logbook.
						Enable to make nesting of lists look more natural.`)
					.addToggle(value => this.#configureBasicSetting(value, this.plugin.settings, 'matchIdentation'))
			)
			.addSetting(
				setting => setting
					.setName('Collapse Logbooks')
					.setDesc(`Collapse all logbooks in the editor.`)
					.addToggle(value => this.#configureBasicSetting(value, this.plugin.settings, 'collapseLogbooks'))
			);

		new SettingGroup(containerEl)
			.setHeading('Task Timer')
			.addSetting(
				setting => setting
					.setName("Task Time Position")
					.setDesc("Position of total time spent on a task.")
					.addDropdown(value => {
							value.addOptions({
								"inline": "Inline",
								"right": "Right"
							});
							this.#configureBasicSetting(value, this.plugin.settings, 'timeWidgetPosition');
						}
					)
			)
			.addSetting(
				setting => setting
					.setName("Enable Task Time Interval")
					.setDesc(`Should the task time be updated automatically every second when the logbook is open?
						The time will still update each time the widget is re-rendered.
						When enabled it will update each second.`)
					.addToggle(value => {
						this.#configureBasicSetting(value, this.plugin.settings, 'timeWidgetInterval');
					})
			);

		new SettingGroup(containerEl)
			.setHeading('Icons')
			.addSetting(
				setting => setting
					.setName('Paused')
					.addText(text => this.#configureBasicSetting(text, this.plugin.settings.icons, 'paused'))
			)
			.addSetting(
				setting => setting
					.setName('Open')
					.addText(text => this.#configureBasicSetting(text, this.plugin.settings.icons, 'open'))
			)
			.addSetting(
				setting => setting
					.setName('Done')
					.addText(text => this.#configureBasicSetting(text, this.plugin.settings.icons, 'done'))
			);

		new SettingGroup(containerEl)
			.setHeading('Experimental')
			.addSetting(
				setting => setting
					.setName('Close Open Logbook on Exit')
					.setDesc(`Attempt to close all open logbooks when Obsidian exits.
						This is a best-effort approach due to limitations in Obsidian's on-exit handler.
						Enabling this may cause data-loss with no undo-history if the exit handler parses documents incorrectly.
						This may also interfere with other plugins' exit handlers. Enable at your own risk.`)
					.addToggle(cb => this.#configureBasicSetting(cb, this.plugin.settings, 'closeOpenLogbooksOnExit'))
			);
	}
}
