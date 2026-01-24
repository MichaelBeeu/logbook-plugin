import { ChangeSpec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import LogbookPluginInterface from "main";
import { Editor, MarkdownView} from "obsidian";

export function toggleClock(
    plugin: LogbookPluginInterface
) {
    return function (editor: Editor, view: MarkdownView) {
        // @ts-expect-error, not typed
        const editorView = view.editor.cm as EditorView;
        const selections = editor.listSelections();
        let changes: ChangeSpec[] = [];

        for (const selection of selections) {
            const selectionFrom = Math.min(selection.anchor.line + 1, selection.head.line + 1);
            const selectionTo = Math.max(selection.anchor.line + 1, selection.head.line + 1);

            changes = [
                ...changes,
                ...plugin.cycleTasks(editorView, selectionFrom, selectionTo)
            ];
        }

        if (changes.length > 0) {
            // Send transactions to editor.
            editorView.dispatch({
                changes
            });
        }
    };
};

export function closeAllOpenClocks(
    plugin: LogbookPluginInterface
) {
    return async function (editor: Editor, view: MarkdownView) {
        await plugin.closeAllLogbookFiles();
    };
};

export function toggleHideLogbooks(
    plugin: LogbookPluginInterface
) {
    return async function (editor: Editor, view: MarkdownView) {
        plugin.settings.hideLogbooks = !plugin.settings.hideLogbooks;
        
        await plugin.saveSettings();
    }
}
