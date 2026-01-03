import { foldEffect } from "@codemirror/language";
import { EditorView, WidgetType } from "@codemirror/view";

export default class LogbookWidget extends WidgetType
{
    #logbook: string;
    #from: number;
    #to: number;
    #open: boolean;
    #invalidated: boolean = false;
    #abortController: AbortController;

    constructor(logbook: string, from: number, to: number) {
        super();

        this.#logbook = logbook;
        this.#from = from;
        this.#to = to;

        this.#open = false;
        this.#invalidated = false;

        this.#abortController = new AbortController();
    }

    eq(widget: LogbookWidget): boolean {
        return this.#logbook === widget.#logbook;
    }

    updateDOM(dom: HTMLElement, view: EditorView): boolean {
        const result = this.#invalidated;
        this.#invalidated = false;
        return result;
    }

    toDOM(view: EditorView): HTMLElement {
        const el = document.createElement('div');

        el.textContent = 'code';

        const code = el.appendChild(document.createElement('code'));
        // code.style.display = this.#open ? 'block': 'none';

        view.dispatch(
            {
                effects: [
                    foldEffect.of({
                        from: this.#from,
                        to: this.#to
                    })
                ]
            }
        );

        code.textContent = this.#logbook;

        el.addEventListener(
            'click',
            () => {
                this.toggleOpen(code);
            },
            {
                signal: this.#abortController.signal,
            }
        );

        return el;
    }

    toggleOpen(element: HTMLElement) {
        this.#open = !this.#open;
        this.#invalidated = true;

        element.style.display = this.#open ? 'block': 'none';
    }

    destroy(dom: HTMLElement): void {
        this.#abortController.abort();
    }
}