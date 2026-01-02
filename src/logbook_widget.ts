import { EditorView, WidgetType } from "@codemirror/view";

export default class LogbookWidget extends WidgetType
{
    #logbook: string;

    constructor(logbook: string) {
        super();

        this.#logbook = logbook;
    }

    eq(widget: LogbookWidget): boolean {
        return this.#logbook === widget.#logbook;
    }

    toDOM(view: EditorView): HTMLElement {
        const el = document.createElement('div');

        const code = el.appendChild(document.createElement('code'));

        // code.textContent = this.#logbook;

        return el;
    }
}