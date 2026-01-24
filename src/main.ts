import { Plugin, TFile, Tasks, moment } from 'obsidian';
import { ChangeSpec } from '@codemirror/state';
import { DEFAULT_SETTINGS, LogbookPluginSettings, LogbookSettingTab } from "./settings";
import { logbookField } from 'editor/logbook_field';
import { closeAllOpenClocks, toggleClock, toggleHideLogbooks } from 'commands';
import { logbookTransactionFilter } from 'editor/transactions';
import { logbookFoldService } from 'editor/fold';
import { logbookViewUpdateListener } from 'editor/updateListener';
import { StringParseAdapter } from 'logbook/parse_adapter';
import LogbookParser from 'logbook/logbook_parser';
import { TaskParser } from 'tasks/task';
import { markdownPostProcessor } from 'view/markdown_post_processor';
import { taskViewPlugin } from 'tasks/task_view_plugin';
import { EditorView } from '@codemirror/view';


export interface LogbookPluginInterface {
	settings: LogbookPluginSettings;

	taskParser: TaskParser;

	addLogbookFile(file: TFile): void;
	closeAllLogbookFiles(): Promise<void>;
	cycleTasks(editor: EditorView, start: number, end: number): ChangeSpec[];
	loadSettings(): Promise<void>;
	saveSettings(): Promise<void>;
};

export default class LogbookPlugin extends Plugin implements LogbookPluginInterface {
	settings: LogbookPluginSettings;

	taskParser: TaskParser = new TaskParser();

	logbookFiles: Set<TFile> = new Set();

	async onload() {
		await this.loadSettings();

		this.registerEditorExtension([
			taskViewPlugin(this),
			logbookFoldService(this),
			logbookViewUpdateListener(this),
			logbookField(this),
			logbookTransactionFilter(this),
		]);

		this.addCommand({
			id: 'cycle-task',
			name: 'Cycle task state',
			editorCallback: toggleClock(this),
		});

		this.addCommand({
			id: 'close-clocks',
			name: 'Close all open clocks',
			editorCallback: closeAllOpenClocks(this),
		});
		
		this.addCommand({
			id: 'toggle-hide-logbooks',
			name: 'Toggle showing logbooks',
			editorCallback: toggleHideLogbooks(this),
		});

		this.app.workspace.on('quit', (tasks: Tasks) => {
			if (this.settings.closeOpenLogbooksOnExit) {
				console.warn("Attempting to close open logbooks!");

				tasks.add(
					async (): Promise<void> => {
						return this.closeAllLogbookFiles();
					}
				);
			}
		});

		this.registerMarkdownPostProcessor(markdownPostProcessor(this));

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

		const promises: Promise<void>[] = [];

		for (const file of this.logbookFiles) {
			const promise = vault.read(file)
				.then((content: string) => {
					const newContent = this.closeLogbooksInFile(content);

					return vault.modify(file, newContent);
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

			const workflowStatus = this.taskParser.getWorkflowStatus(text, line.from);

			if (workflowStatus) {
				const book = lp.parse(pa, n + 1);

				if (book) {
					const openClock = book.getOpenClock();
					if (openClock) {
						openClock.endTime = moment();

						const block = book.toString();
						const from = book.from;
						const to = book.to;

						const start = content.substring(0, from);
						const end = content.substring(to);

						content = start + block + end;
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

	cycleTasks(editor: EditorView, start: number, end: number): ChangeSpec[] {
		let changes: ChangeSpec[] = [];

		const { state: { doc } } = editor;

		for (let n = start; n <= end; ++n) {
			const line = doc.line(n);
			const { text } = line;

			if (line.from === line.to || text.trim().length === 0) {
				continue;
			}

			// Get the current workflow status of the line.
			const status = this.taskParser.getWorkflowStatus(text, line.from);

			if (status) {
				// Compute the next state.
				const nextState = this.taskParser.proceedWorkflow(status.currentState);
				// When adding a state to an existing line we must ensure there is a space added
				// between the state name and the existing text.
				const stateSuffix = (status.currentState) ? '' : ' ';

				// Change the current task state.
				changes.push({
					from: status.currentStateRange?.from
							?? status.listRange?.to
							?? line.from,
					to: status.currentStateRange?.to
							?? status.listRange?.to
							?? line.from,
					insert: (nextState?.name ?? '???') + stateSuffix,
				});
			}
		}

		return changes;
	}
}