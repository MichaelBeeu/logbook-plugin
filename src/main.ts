import { Plugin, TFile, Tasks, moment } from 'obsidian';
import { DEFAULT_SETTINGS, LogbookPluginSettings, LogbookSettingTab } from "./settings";
import { logbookField } from 'editor/logbook_field';
import { closeAllOpenClocks, toggleClock } from 'commands';
import { logbookTransactionFilter } from 'editor/transactions';
import { logbookFoldService } from 'editor/fold';
import { logbookViewUpdateListener } from 'editor/updateListener';
import { StringParseAdapter } from 'logbook/parse_adapter';
import LogbookParser from 'logbook/logbook_parser';
import { getWorkflowStatus } from 'tasks/task';


export interface LogbookPluginInterface {
	addLogbookFile(file: TFile): void;
	closeAllLogbookFiles(): Promise<void>;
};

export default class LogbookPlugin extends Plugin implements LogbookPluginInterface {
	settings: LogbookPluginSettings;

	logbookFiles: Set<TFile> = new Set();

	async onload() {
		await this.loadSettings();

		this.registerEditorExtension([
			logbookFoldService(this),
			logbookViewUpdateListener(this),
			logbookField(this),
			logbookTransactionFilter(this),
		]);

		this.addCommand({
			id: 'toggle-clock',
			name: 'Toggle clock',
			editorCallback: toggleClock(this),
			hotkeys: [
				{
					modifiers: ['Ctrl', 'Shift'],
					key: 'Enter',
				}
			]
		});

		this.addCommand({
			id: 'close-clocks',
			name: 'Close all open clocks',
			editorCallback: closeAllOpenClocks(this),
		});

		this.app.workspace.on('quit', (tasks: Tasks) => {
			if (this.settings.closeOpenLogbooksOnExit) {
				console.warn("Attempting to close open logbooks!");

				tasks.add(
					async (): Promise<any> => {
						return this.closeAllLogbookFiles();
					}
				);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LogbookSettingTab(this.app, this));
	}

	addLogbookFile(file: TFile): void {
		this.logbookFiles.add(file);
	}

	async closeAllLogbookFiles(): Promise<void> {
		const {
			app: {
				vault
			}
		} = this;

		const promises: Promise<any>[] = [];

		for (const file of this.logbookFiles) {
			console.log('Cleanup file.', file);

			const promise = vault.read(file)
				.then((content: string) => {
					const newContent = this.closeLogbooksInFile(content);

					vault.modify(file, newContent);
				});
			
			promises.push(promise);
		}

		this.logbookFiles.clear();

		await Promise.all(promises);
	}

	closeLogbooksInFile(content: string): string {
		const pa = new StringParseAdapter(content);
		const lp = new LogbookParser(moment);

		for (let n = pa.lines; n >= 1; --n) {
			const line = pa.line(n);
			const { text } = line;

			const workflowStatus = getWorkflowStatus(text, line.from);

			if (workflowStatus) {
				console.log('get line', n+1);
				const book = lp.parse(pa, n + 1);

				if (book) {
					console.log('got book');
					const openClock = book.getOpenClock();
					if (openClock) {
						console.log('closing open clock');
						openClock.endTime = moment();

						const block = book.toString();
						const from = book.from;
						const to = book.to;

						const start = content.substring(0, from);
						const end = content.substring(to);

						console.log('replacing', from, to, start, end);

						content = start + block + end;
					} else {
						console.log('no open clock');
					}
				}

				if (workflowStatus.currentState && workflowStatus.currentStateRange) {
					const start = content.substring(0, workflowStatus.currentStateRange.from);
					const end = content.substring(workflowStatus.currentStateRange.to);

					content = start + 'TODO' + end;
				}
			}
		}

		return content;
	}

	onunload() {
		this.logbookFiles.clear();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<LogbookPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}