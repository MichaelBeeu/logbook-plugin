import { EditorView } from "@codemirror/view";
import { LogbookLine } from "logbook";
import LogbookParser from "logbook_parser";
import { Editor, EditorChange, MarkdownView, moment} from "obsidian";
import { getWorkflowRegex, getWorkflowStatus, proceedWorkflow } from "task";

export function toggleClock(editor: Editor, view: MarkdownView) {
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
                console.log("Skipping empty line ", line);
                continue;
            }

            console.log("toggle ", line);

            // Get the current workflow status of the line.
            const status = getWorkflowStatus(text, line.from);

            if (status) {
                // Compute the next state.
                const nextState = proceedWorkflow(status.currentState);
                // When adding a state to an existing line we must ensure there is a space added
                // between the state name and the existing text.
                const stateSuffix = (!!status.currentState) ? '' : ' ';

                console.log('change pos', 
                    status.currentStateRange?.from,
                    status
                );

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

                // // Check for checkbox value.
                // if (!status.checkboxValueRange) {
                //     // If missing a value, then add it to the changelist.
                //     // This must be shifted onto the beginning so it appears in the correct location
                //     // when both the status and checkbox is being added.
                //     changes.unshift({
                //         from: editor.offsetToPos(status.currentStateRange?.from ?? line.from),
                //         to: editor.offsetToPos(status.currentStateRange?.from ?? line.from),
                //         text: `- [${nextState?.state.checkbox ?? ' '}] `,
                //     });
                // } else {
                //     // Change the state of the checkbox.
                //     changes.unshift({
                //         from: editor.offsetToPos(status.checkboxValueRange?.from ?? line.from),
                //         to: editor.offsetToPos(status.checkboxValueRange?.to ?? line.from),
                //         text: nextState?.state.checkbox ?? ' ',
                //     });
                // }
            }
        }

        /*
        const match = text.match(workflowRe);
        if (match !== null) {
            const currentState = match[2] ?? 'DONE';

            console.log('match', match);

            const nextState = proceedWorkflow(currentState);
            if (nextState) {
                // Replace with new state name.
                const offset = (match[1]?.length ?? 0) + (match.index ?? 0);
                let from = line.from + offset;
                let to = from + currentState?.length;

                editor.transaction({
                    changes: [
                        {
                            from: editor.offsetToPos(from),
                            to: editor.offsetToPos(to),
                            text: nextState.name,
                        },
                    ]
                });

                // Check for presence of checkbox value.
                if (match[1] !== '') {
                    // Get the new value of the checkbox.
                    const checkbox = nextState.state.checkbox;
                    const newCheckboxValue = checkbox ?? ' ';

                    // Calculate replacement range.
                    from = line.from + (match.index ?? 0) + 3;
                    to = from + 1;

                    editor.transaction({
                        changes: [
                            {
                                from: editor.offsetToPos(from),
                                to: editor.offsetToPos(to),
                                text: newCheckboxValue,
                            },
                        ]
                    });
                }
            }
        } else {
            const from = line.from;
            const to = from;

            editor.transaction({
                changes: [
                    {
                        from: editor.offsetToPos(from),
                        to: editor.offsetToPos(to),
                        text: "- [ ] TODO ",
                    }
                ]
            });
        }
        */
    }


    if (changes.length > 0) {
        // Send transactions to editor.
        editor.transaction({ changes });
    }
}

/*
export function toggleClock(editor: Editor, view: MarkdownView) {
    // @ts-expect-error, not typed
    const editorView = view.editor.cm as EditorView;
    const { state: { doc } } = editorView;

    const selections = editor.listSelections();
    const logbookParser = new LogbookParser();
    const books = logbookParser.parse(doc);

    for (const selection of selections) {
        const offset = editor.posToOffset(selection.anchor);

        // Find the book for this selection.
        for (const book of books) {
            if (offset >= book.from && offset <= book.to) {
                // Get any open clock.
                let openClock = book.getOpenClock();

                // If it's open, then close it, else create a new one.
                if (openClock) {
                    openClock.endTime = moment();
                } else {
                    openClock = new LogbookLine(moment());

                    book.addLine(openClock);
                }

                // Replace the logbook block.
                const blockText = book.toString();

                editor.transaction({
                    changes: [
                        {
                            from: editor.offsetToPos(book.from),
                            to: editor.offsetToPos(book.to),
                            text: blockText,
                        }
                    ]
                });

                break;
            }
        }
    }
}
*/