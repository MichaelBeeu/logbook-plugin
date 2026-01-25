import { foldedRanges, syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { LogbookPluginInterface } from "main";
import { TextParseAdapter } from "./parse_adapter";
import LogbookParser from "./logbook_parser";
import { moment } from "obsidian";

export function logbookViewPlugin(
    plugin: LogbookPluginInterface
) {
    function logbooks(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();

        const { state } = view;
        const { doc } = state;

        const parseAdapter = new TextParseAdapter(doc);
        const parser = new LogbookParser(moment);

        // Get all the workflows in the document.
        const tasks = plugin.taskParser.getAllWorkflowStatuses(doc.toString());
        const folds = foldedRanges(state);

        for (const task of tasks) {
            // Get the line the task is on.
            const taskLine = doc.lineAt(task.from);
            // Parse the logbook following.
            const book = parser.parse(parseAdapter, taskLine.number + 1);

            // If this is a valid logbook, then add widgets/styles.
            if (book) {
                // If logbooks should be hidden, then hide this one.
                let hide = false;

                folds.between(
                    book.from,
                    book.to,
                    () => {
                        hide = true;
                    }
                );

                if (hide) {
                    builder.add(
                        book.from - 1,
                        book.to + 1,
                        Decoration.mark({
                        })
                    );
                }
            }
        }

        return builder.finish();
    }

    class LogbookViewPlugin {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = logbooks(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged ||
                syntaxTree(update.startState) != syntaxTree(update.state)) {
                this.decorations = logbooks(update.view);
            }
        }
    }

    return ViewPlugin.fromClass(
        LogbookViewPlugin,
        {
            provide: (field: ViewPlugin<LogbookViewPlugin>) => {
                return EditorView.atomicRanges.of(
                    v => v.plugin(field)?.decorations ?? Decoration.none
                )
            }
        }
    );
}