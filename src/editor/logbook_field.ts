import { StateField, Transaction, Extension, RangeSetBuilder, Line } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { TextParseAdapter } from 'logbook/parse_adapter';
import LogbookParser from 'logbook/logbook_parser';
import LogbookPluginInterface from 'main';
import TimeWidget from 'widgets/time_widget';

export function logbookField(
    plugin: LogbookPluginInterface
): Extension {
    return StateField.define<DecorationSet>({
        create(state): DecorationSet {
            return Decoration.none;
        },
        update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();

            const { state } = transaction;

            const { doc } = state;

            const parseAdapter = new TextParseAdapter(doc);
            const parser = new LogbookParser();

            const books = parser.parseAll(parseAdapter);

            for (const book of books) {
                const from = book.from - 1;

                builder.add(
                    from,
                    from,
                    Decoration.widget({
                        widget: new TimeWidget(book),
                    })
                );
            }

            return builder.finish();
        },
        provide(field: StateField<DecorationSet>): Extension {
            return [
                EditorView.decorations.from(field),
                EditorView.atomicRanges.of(
                    v => v.state.field(field)
                )
            ];
        }
    });
};