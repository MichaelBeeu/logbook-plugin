import { StateField, Transaction, Extension, RangeSetBuilder, RangeSet, EditorState } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { TextParseAdapter } from 'logbook/parse_adapter';
import LogbookParser from 'logbook/logbook_parser';
import LogbookPluginInterface from 'main';
import TimeWidget from 'widgets/time_widget';
import { moment } from 'obsidian';

interface LogbookFieldState {
    decorations: DecorationSet;
};

export function logbookField(
    plugin: LogbookPluginInterface
): Extension {
    function process(state: EditorState): LogbookFieldState {
        const { doc } = state;
        const builder = new RangeSetBuilder<Decoration>();

        const parseAdapter = new TextParseAdapter(doc);
        const parser = new LogbookParser(moment);

        // Get all the workflows in the document.
        const tasks = plugin.taskParser.getAllWorkflowStatuses(doc.toString());

        for (const task of tasks) {
            // Get the line the task is on.
            const taskLine = doc.lineAt(task.from);
            // Parse the logbook following.
            const book = parser.parse(parseAdapter, taskLine.number + 1);

            // If this is a valid logbook, then add widgets/styles.
            if (book) {
                const from = book.from - 1;

                // Add the time widget.
                builder.add(
                    from,
                    from,
                    Decoration.widget({
                        widget: new TimeWidget(book, plugin, task),
                    })
                );

                if (plugin.settings.hideLogbooks) {
                    builder.add(
                        book.from,
                        book.to,
                        Decoration.replace({
                            block: true
                        })
                    );
                }
            }
        }

        return {
            decorations: builder.finish(),
        };
    };

    return StateField.define<LogbookFieldState>({
        create(state: EditorState):  LogbookFieldState {
            // Create initial state.
            return process(state);
        },

        update(oldState: LogbookFieldState, transaction: Transaction): LogbookFieldState {
            if (!transaction.docChanged) {
                return oldState;
            }

            const { state } = transaction;

            return process(state);

        },
        provide(field: StateField<LogbookFieldState>): Extension {
            return [
                EditorView.decorations.from(field, (t: LogbookFieldState) => {
                    return (RangeSet<Decoration>).join([t.decorations]);
                }),
                EditorView.atomicRanges.of(
                    v => v.state.field(field).decorations
                )
            ];
        }
    });
};