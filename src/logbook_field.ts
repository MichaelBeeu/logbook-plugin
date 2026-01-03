import { StateField, Transaction, Extension, RangeSetBuilder, Line } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import LogbookParser from 'logbook_parser';
import LogbookWidget from 'logbook_widget';
import TimeWidget from 'time_widget';

type ParseMode = 'scan'|'drawer';

export const logbookField = StateField.define<DecorationSet>({
    create(state): DecorationSet {
        return Decoration.none;
    },
    update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();

        const { state } = transaction;

        const { doc } = state;

        const parser = new LogbookParser();

        const books = parser.parseAll(doc);

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

        // const folding = state.facet(foldService);

        /*
        const logbookDrawerRe = /^\s*?:LOGBOOK:$/i;
        const drawerEndRe = /^\s*?:END:$/i;
        let mode: ParseMode = 'scan';

        let from = 0;
        let to = 0;
        let parentLine: Line|undefined = undefined;

        for (let n = 1; n <= doc.lines; n++) {
            const line = doc.line(n);
            const { text } = line;

            if (mode == 'scan') {
                const isLogbookDrawer = text.match(logbookDrawerRe) !== null && n > 1;

                if (isLogbookDrawer) {
                    from = line.from;
                    parentLine = doc.line(n-1);

                    mode = 'drawer';
                }
            } else if (mode == 'drawer') {
                const isDrawerEnd = text.match(drawerEndRe) !== null;

                if (isDrawerEnd) {
                    mode = 'scan';

                    to = line.to;
                    const slice = doc.sliceString(from, to);

                    const logbookParser = new LogbookParser(slice, from, to);

                    console.log("Drawer from ", from, " to ", to);
                    console.log("parent line", parentLine);

                    if (parentLine) {
                        builder.add(
                            parentLine.to-1,
                            parentLine.to,
                            Decoration.widget({
                                widget: new TimeWidget(logbookParser),
                            })
                        );
                    }

                    const logbookLines = logbookParser.getLines();

                    console.log("logbook toString", logbookParser.toString());

                    for (const [id, line] of logbookLines.entries()) {
                        const color = id % 2 == 0 ? 'red' : 'green';

                        builder.add(
                            line.from ?? 0,
                            line.to ?? 0,
                            Decoration.mark({
                                attributes: {
                                    style: `background: ${color}`
                                }
                            })
                        );
                    }

                    // builder.add(
                    //     from,
                    //     to,
                    //     Decoration.replace({
                    //         widget: new LogbookWidget(slice),
                    //         block: true,
                    //     })
                    // );
                }
            } else {
                console.warn("Unknown parse mode %s", mode);
            }
        }
        */

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