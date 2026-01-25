import { foldable, foldEffect, unfoldEffect } from "@codemirror/language";
import { Extension, StateEffect } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import LogbookPluginInterface from "main";
import { createLogbook } from "./transactions";

export function logbookViewUpdateListener(
    plugin: LogbookPluginInterface,
): Extension {
    return EditorView.updateListener.of(
        (view: ViewUpdate) => {
            const { view: editorView, state, transactions } = view;
            const { doc } = state;
            if (view.docChanged && plugin.settings.collapseLogbooks) {
                for (const transaction of transactions) {
                    for (const effect of transaction.effects) {
                        if (effect.is(createLogbook)) {
                            const line = doc.line(effect.value.number);

                            const fold = foldable(state, line.from, line.to);
                            if (fold) {
                                editorView.dispatch({
                                    effects: foldEffect.of(fold),
                                    selection: state.selection,
                                });
                            }
                        }
                    }
                }
            }

            if (view.viewportChanged) {

                // Ignore this update if any effect is an unfold effect.
                for (const transaction of transactions) {
                    for (const effect of transaction.effects) {
                        if (effect.is(unfoldEffect)) {
                            return;
                        }
                    }
                }

                const { from, to } = editorView.viewport;
                const fromLine = doc.lineAt(from);
                const toLine = doc.lineAt(to);
                const effects: StateEffect<{from: number, to: number}>[] = [];

                for (let n = fromLine.number; n <= toLine.number; ++n) {
                    const line = doc.line(n);
                    const { text } = line;

                    if (text.match(/^\s*:LOGBOOK:$/) === null) {
                        continue;
                    }
                }

                if (effects.length > 0) {
                    editorView.dispatch({ effects });
                }
            }
        }
    );
};