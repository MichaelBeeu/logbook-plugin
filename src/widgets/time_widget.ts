import { EditorView, WidgetType } from "@codemirror/view";
import { Logbook } from "logbook/logbook";
import { LogbookPluginInterface } from "main";
import { Plugin } from "obsidian";
import { WorkflowStatus } from "tasks/task";
import { formatLogbookDuration } from "utils";

export default class TimeWidget extends WidgetType
{
    #logbook: Logbook;
    #interval: number|undefined = undefined;
    #workflowState: WorkflowStatus|null;
    #plugin: LogbookPluginInterface&Plugin;

    constructor(logbook: Logbook, plugin: LogbookPluginInterface&Plugin, workflowState: WorkflowStatus|null = null) {
        super();

        this.#logbook = logbook;
        this.#plugin = plugin;
        this.#workflowState = workflowState;
    }

    eq(widget: TimeWidget): boolean {
        return widget.#logbook.eq(this.#logbook);
    }

    toDOM(view: EditorView): HTMLElement {
        const openClock = this.#logbook.getOpenClock();

        const el = document.createElement('pre');
        el.classList.add('logbook-time');
        
        if (this.#plugin.settings.timeWidgetPosition === 'right') {
            el.classList.add('logbook-time-right');
        }

        el.textContent = this.#getTotalDuration();

        this.#clearInterval();

        if (openClock !== undefined && this.#plugin.settings.timeWidgetInterval) {
            this.#interval = window.setInterval(
                () => this.tick(el),
                1000
            );
            
            this.#plugin.registerInterval(this.#interval);
        }

        return el;
    }

    tick(element: HTMLElement) {
        element.textContent = this.#getTotalDuration();
    }

    #getTotalDuration() {
        let duration = this.#logbook.getTotalDuration(true);
        const openClock = this.#logbook.getOpenClock();
        let icon = this.#plugin.settings.icons.paused;

        if (openClock !== undefined) {
            icon = this.#plugin.settings.icons.open;
        } else if (this.#workflowState?.currentWorkflowState?.checkbox !== ' ') {
            icon = this.#plugin.settings.icons.done;
        }

        return formatLogbookDuration(duration) + ' ' + icon;
    }

    #clearInterval() {
        if (this.#interval) {
            window.clearInterval(this.#interval);
            this.#interval = undefined;
        }
    }

    destroy(dom: HTMLElement): void {
        this.#clearInterval();
    }
}