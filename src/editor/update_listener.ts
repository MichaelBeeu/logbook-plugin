import { foldable, foldEffect } from "@codemirror/language";
import { Extension } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import LogbookPluginInterface from "main";
import { createLogbook } from "./transactions";

/*
 * Look for new logbooks, and close them if configured to.
 * 
 * @param plugin Reference to the plugin instance.
 * @returns 
 */
export function logbookFoldListener(
    plugin: LogbookPluginInterface,
): Extension {
    return EditorView.updateListener.of(
        (view: ViewUpdate) => {
            if (view.docChanged && plugin.settings.collapseLogbooks) {
                const { view: editorView, state, transactions } = view;
                const { doc } = state;

                for (const transaction of transactions) {
                    for (const effect of transaction.effects) {
                        if (effect.is(createLogbook)) {
                            const line = doc.line(effect.value.number);

                            const fold = foldable(state, line.from, line.to);
                            if (fold) {
                                editorView.dispatch({
                                    effects: foldEffect.of(fold),
                                });
                            }
                        }
                    }
                }
            }
        }
    );
};
