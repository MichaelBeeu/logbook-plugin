import { EditorView } from "@codemirror/view";
import LogbookPluginInterface from "main";
import { Editor, EditorChange, MarkdownView} from "obsidian";
import { getWorkflowStatus, proceedWorkflow } from "tasks/task";

export function toggleClock(
    plugin: LogbookPluginInterface
) {
    return function (editor: Editor, view: MarkdownView) {
        // @ts-expect-error, not typed
        const editorView = view.editor.cm as EditorView;
        const { state: { doc } } = editorView;

        const selections = editor.listSelections();
        let changes: EditorChange[] = [];

        for (const selection of selections) {
            const selectionFrom = Math.min(selection.anchor.line + 1, selection.head.line + 1);
            const selectionTo = Math.max(selection.anchor.line + 1, selection.head.line + 1);

            for (let n = selectionFrom; n <= selectionTo; ++n) {
                const line = doc.line(n);
                const { text } = line;

                if (line.from === line.to || text.trim().length === 0) {
                    continue;
                }

                // Get the current workflow status of the line.
                const status = getWorkflowStatus(text, line.from);

                if (status) {
                    // Compute the next state.
                    const nextState = proceedWorkflow(status.currentState);
                    // When adding a state to an existing line we must ensure there is a space added
                    // between the state name and the existing text.
                    const stateSuffix = (!!status.currentState) ? '' : ' ';

                    // Change the current task state.
                    changes.push({
                        from: editor.offsetToPos(status.currentStateRange?.from
                                ?? status.listRange?.to
                                ?? line.from),
                        to: editor.offsetToPos(status.currentStateRange?.to
                                ?? status.listRange?.to
                                ?? line.from),
                        text: (nextState?.name ?? '???') + stateSuffix,
                    });
                }
            }
        }


        if (changes.length > 0) {
            // Send transactions to editor.
            editor.transaction({ changes });
        }
    };
};

export function closeAllOpenClocks(
    plugin: LogbookPluginInterface
) {
    return function (editor: Editor, view: MarkdownView) {
        plugin.closeAllLogbookFiles();
    };
};