import { StateField, Transaction, Extension, RangeSetBuilder, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { TextParseAdapter } from 'logbook/parse_adapter';
import LogbookParser from 'logbook/logbook_parser';
import LogbookPluginInterface from 'main';
import TimeWidget from 'widgets/time_widget';
import { moment } from 'obsidian';

interface LogbookFieldState {
    decorations: DecorationSet;
    atomicDecorations: DecorationSet;
};

export function logbookField(
    plugin: LogbookPluginInterface
): Extension {
    return StateField.define<LogbookFieldState>({
        create(state):  LogbookFieldState {
            return {
                decorations: Decoration.none,
                atomicDecorations: Decoration.none,
            };
        },
        update(oldState: LogbookFieldState, transaction: Transaction): LogbookFieldState {
            const builder = new RangeSetBuilder<Decoration>();
            const atomicBuilder = new RangeSetBuilder<Decoration>();

            const { state } = transaction;

            const { doc } = state;

            const parseAdapter = new TextParseAdapter(doc);
            const parser = new LogbookParser(moment);

            // Get all the workflows in the document.
            const tasks = plugin.taskParser.getAllWorkflowStatuses(doc.toString());

            for (const task of tasks) {
                // If we have a current status, then mark it.
                if (task?.currentStateRange) {
                    builder.add(
                        task?.currentStateRange?.from,
                        task.currentStateRange.to,
                        Decoration.mark({
                            attributes: {
                                style: "font-weight: bold",
                                // Disable spellcheck on the task state, as it should be valid even
                                // if not in the dictionary.
                                spellcheck: "false",
                            }
                        })
                    );
                }

                // Get the line the task is on.
                const taskLine = doc.lineAt(task.from);
                // Parse the logbook following.
                const book = parser.parse(parseAdapter, taskLine.number + 1);

                // If this is a valid logbook, then add widgets/styles.
                if (book) {
                    const from = book.from - 1;

                    // Add the time widget.
                    atomicBuilder.add(
                        from,
                        from,
                        Decoration.widget({
                            widget: new TimeWidget(book, plugin, task),
                        })
                    );
                    
                    // If logbooks should be hidden, then hide this one.
                    if (plugin.settings.hideLogbooks) {
                        atomicBuilder.add(
                            book.from,
                            book.to + 1,
                            Decoration.replace({
                                block: true,
                            })
                        );
                    }
                }
            }

            return {
                decorations: builder.finish(),
                atomicDecorations: atomicBuilder.finish(),
            };
        },
        provide(field: StateField<LogbookFieldState>): Extension {
            return [
                EditorView.decorations.from(field, (t: LogbookFieldState) => {
                    return (RangeSet<Decoration>).join([t.decorations, t.atomicDecorations]);
                }),
                EditorView.atomicRanges.of(
                    v => v.state.field(field).atomicDecorations
                )
            ];
        }
    });
};