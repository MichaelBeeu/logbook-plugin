import { foldedRanges, syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { LogbookPluginInterface } from "main";
import { TextParseAdapter } from "./parse_adapter";
import LogbookParser from "./logbook_parser";
import { moment, Plugin } from "obsidian";
import TimeWidget from "widgets/time_widget";

interface LogbookViewState {
    logbooks: DecorationSet,
    times: DecorationSet,
};

export function logbookViewPlugin(
    plugin: LogbookPluginInterface&Plugin
) {
    function logbooks(view: EditorView): LogbookViewState {
        const logbooksBuilder = new RangeSetBuilder<Decoration>();
        const timeBuilder = new RangeSetBuilder<Decoration>();

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
                const from = book.from - 1;

                // Add the time widget.
                timeBuilder.add(
                    from,
                    from,
                    Decoration.widget({
                        widget: new TimeWidget(book, plugin, task),
                    })
                );

                // If logbooks should be hidden, then hide this one.
                let hide = false;

                // Look for a fold where this logbook is. If there is none found
                // then assume the logbook is unfolded.
                folds.between(
                    book.from,
                    book.to,
                    () => {
                        hide = true;
                    }
                );

                // If the section should be hidden, then add a decoration to
                // the set.
                if (hide) {
                    // TODO using a decoration here seems excessive.
                    // There must be a better datatype to use.
                    logbooksBuilder.add(
                        book.from - 1,
                        book.to + 1,
                        Decoration.mark({})
                    );
                }
            }
        }

        return {
            logbooks: logbooksBuilder.finish(),
            times: timeBuilder.finish(),
        };
    }

    class LogbookViewPlugin {
        state: LogbookViewState;

        constructor(view: EditorView) {
            this.state = logbooks(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged ||
                syntaxTree(update.startState) != syntaxTree(update.state)) {
                this.state = logbooks(update.view);
            }
        }
    }

    return ViewPlugin.fromClass(
        LogbookViewPlugin,
        {
            provide: (view: ViewPlugin<LogbookViewPlugin>) => {
                return [
                    EditorView.decorations.of(
                        v => v.plugin(view)?.state?.times ?? Decoration.none
                    ),
                    EditorView.atomicRanges.of(
                        v => v.plugin(view)?.state?.logbooks ?? Decoration.none
                    )
                ];
            }
        }
    );
}