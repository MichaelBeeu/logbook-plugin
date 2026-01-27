import {App, PluginSettingTab, SettingGroup, ValueComponent} from "obsidian";
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
	
	// Should logbooks be hidden?
	hideLogbooksInReadMode: boolean;
	
	// What position should the task time widget be placed?
	timeWidgetPosition: TimeWidgetPosition;

	// Should the task time widget start an interval to update the timer when active?
	timeWidgetInterval: boolean;

	// Minimum threshold for a log line to be recorded.
	minLogLineThreshold: number;
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
	
	hideLogbooksInReadMode: true,
	
	timeWidgetPosition: "right",

	timeWidgetInterval: true,

	minLogLineThreshold: 1,
};

class NumberComponent extends ValueComponent<number> {
	inputEl: HTMLInputElement;
	callback: (value: number) => unknown;
	abortController: AbortController;

	constructor(containerEl: HTMLElement) {
		super();
		
		this.abortController = new AbortController();

		this.inputEl = containerEl.createEl('input', {
			type: 'number',
		});

		this.inputEl.addEventListener('change', () => { this.onChanged(); });
	}

	setDisabled(disabled: boolean): this {
		this.inputEl.disabled = disabled;
		return this;
	}

	getValue(): number {
		return parseInt(this.inputEl.value);
	}

	setValue(value: number): this {
		this.inputEl.value = value.toString();
		return this;
	}

	setPlaceholder(placeholder: string): this {
		this.inputEl.placeholder = placeholder;
		return this;
	}

	onChanged(): void {
		this.callback(this.getValue());
	}

	onChange(callback: (value: number) => unknown): this {
		this.callback = callback;
		return this;
	}
}

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
		C extends ValueComponent<unknown>,
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
				setting => { setting
						.setName('Match indentation')
						.setDesc(`Match indentation of the preceding task element when writing a logbook.
							Enable to make nesting of lists look more natural.`)
						.addToggle(value => this.#configureBasicSetting(value, this.plugin.settings, 'matchIdentation')) }
			)
			.addSetting(
				setting => { setting
					.setName('Collapse logbooks')
					.setDesc(`Collapse all logbooks in the editor.`)
					.addToggle(value => this.#configureBasicSetting(value, this.plugin.settings, 'collapseLogbooks')) }
			)
			.addSetting(
				setting => { setting
					.setName('Hide logbooks in reading mode')
					.setDesc(`Hide logbooks in reading mode. This will also affect page previews.`)
					.addToggle(value => this.#configureBasicSetting(value, this.plugin.settings, 'hideLogbooksInReadMode')) }
			)
			.addSetting(
				setting => { setting
					.setName('Minimum logline threshold')
					.setDesc(`The minimum length of time, in seconds, necessary for a log line to be recorded.
						Use '0' to record all lines. Lines with a duration less than this will be discarded when
						changing task state.`)
					.addComponent<NumberComponent>(
						el => {
							const value = new NumberComponent(el);
							return this.#configureBasicSetting(value, this.plugin.settings, 'minLogLineThreshold');
						}
					) }
			);

		new SettingGroup(containerEl)
			.setHeading('Task Timer')
			.addSetting(
				setting => { setting
					.setName("Task time position")
					.setDesc("Position of total time spent on a task.")
					.addDropdown(value => {
							value.addOptions({
								"inline": "Inline",
								"right": "Right"
							});
							this.#configureBasicSetting(value, this.plugin.settings, 'timeWidgetPosition');
						}
					) }
			)
			.addSetting(
				setting => { setting
					.setName("Enable task time interval")
					.setDesc(`Should the task time be updated automatically every second when the logbook is open?
						The time will still update each time the widget is re-rendered.
						When enabled it will update each second.`)
					.addToggle(value => {
						this.#configureBasicSetting(value, this.plugin.settings, 'timeWidgetInterval');
					}) }
			);

		new SettingGroup(containerEl)
			.setHeading('Icons')
			.addSetting(
				setting => { setting
					.setName('Paused')
					.addText(text => this.#configureBasicSetting(text, this.plugin.settings.icons, 'paused')) }
			)
			.addSetting(
				setting => { setting
					.setName('Open')
					.addText(text => this.#configureBasicSetting(text, this.plugin.settings.icons, 'open')) }
			)
			.addSetting(
				setting => { setting
					.setName('Done')
					.addText(text => this.#configureBasicSetting(text, this.plugin.settings.icons, 'done')) }
			);

		new SettingGroup(containerEl)
			.setHeading('Experimental')
			.addSetting(
				setting => { setting
					.setName('Close open logbook on exit')
					.setDesc(`Attempt to close all open logbooks when Obsidian exits.
						This is a best-effort approach due to limitations in Obsidian's on-exit handler.
						Enabling this may cause data-loss with no undo-history if the exit handler parses documents incorrectly.
						This may also interfere with other plugins' exit handlers. Enable at your own risk.`)
					.addToggle(cb => this.#configureBasicSetting(cb, this.plugin.settings, 'closeOpenLogbooksOnExit')) }
			);
	}
}
