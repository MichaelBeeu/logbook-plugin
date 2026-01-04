import { foldable, foldEffect, unfoldEffect } from "@codemirror/language";
import { Extension, StateEffect } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import LogbookPluginInterface from "main";
import { isRangeOverlap } from "utils";

export function logbookViewUpdateListener(
    plugin: LogbookPluginInterface,
): Extension {
    return EditorView.updateListener.of(
        (view: ViewUpdate) => {
            if (view.viewportChanged) {
                const { view: editorView, state, transactions } = view;

                // Ignore this update if any effect is an unfold effect.
                for (const transaction of transactions) {
                    for (const effect of transaction.effects) {
                        if (effect.is(unfoldEffect)) {
                            return;
                        }
                    }
                }

                const { selection } = state;
                const { doc } = state;
                const { from, to } = editorView.viewport;
                const fromLine = doc.lineAt(from);
                const toLine = doc.lineAt(to);
                const effects: StateEffect<any>[] = [];

                for (let n = fromLine.number; n <= toLine.number; ++n) {
                    const line = doc.line(n);
                    const { text } = line;

                    if (text.match(/^\s*:LOGBOOK:$/) === null) {
                        continue;
                    }

                    // Is this line foldable?
                    const fold = foldable(state, line.from, line.to);


                    if (fold !== null) {
                        let shouldFold = true;
                        for (const range of selection.ranges) {
                            if (isRangeOverlap(fold.from, fold.to, range.from, range.to)) {
                                shouldFold = false;
                                break;
                            }
                        }
                        
                        if (shouldFold) {
                            effects.push(foldEffect.of(fold));
                        }
                    }
                }

                if (effects.length > 0) {
                    editorView.dispatch({ effects });
                }
            }
        }
    );
};