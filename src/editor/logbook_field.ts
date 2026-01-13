import { StateField, Transaction, Extension, RangeSetBuilder, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { TextParseAdapter } from 'logbook/parse_adapter';
import LogbookParser from 'logbook/logbook_parser';
import LogbookPluginInterface from 'main';
import TimeWidget from 'widgets/time_widget';
import { moment } from 'obsidian';
import { getWorkflowStatus } from 'tasks/task';

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

            const books = parser.parseAll(parseAdapter);

            for (const book of books) {
                const from = book.from - 1;
                
                const parentLine = doc.lineAt(from);
                const { text: parentText } = parentLine;
                const taskState = getWorkflowStatus(parentText, parentLine.from);

                atomicBuilder.add(
                    from,
                    from,
                    Decoration.widget({
                        widget: new TimeWidget(book, plugin, taskState),
                    })
                );
                
                if (taskState?.currentStateRange) {
                    builder.add(
                        taskState?.currentStateRange?.from,
                        taskState.currentStateRange.to,
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