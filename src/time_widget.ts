import { EditorView, WidgetType } from "@codemirror/view";
import { Logbook, LogbookLine } from "logbook";
import { moment } from "obsidian";
import { formatLogbookDuration } from "utils";

export default class TimeWidget extends WidgetType
{
    #logbook: Logbook;
    #interval: number|undefined = undefined;

    constructor(logbook: Logbook) {
        super();

        this.#logbook = logbook;
    }

    eq(widget: TimeWidget): boolean {
        return widget.#logbook.eq(this.#logbook);
    }

    toDOM(view: EditorView): HTMLElement {
        const openClock = this.#logbook.getOpenClock();

        const el = document.createElement('pre');
        el.classList.add('logbook-time');
        el.textContent = this.#getTotalDuration();

        this.#clearInterval();

        if (openClock !== undefined) {
            this.#interval = window.setInterval(
                () => this.tick(el),
                1000
            );
        }

        return el;
    }

    tick(element: HTMLElement) {
        element.textContent = this.#getTotalDuration();
    }

    #getTotalDuration() {
        let duration = this.#logbook.getTotalDuration();
        const openClock = this.#logbook.getOpenClock();
        let icon = "⏱️";

        if (openClock !== undefined) {
            const now = moment();
            const diff = now.diff(openClock.startTime);
            duration.add(diff);

            icon = "⌛";
        }

        return formatLogbookDuration(duration) + ` ${icon}`;
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