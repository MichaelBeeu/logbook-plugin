import { ChangeSet, ChangeSpec, Text, Transaction, TransactionSpec } from "@codemirror/state";
import { moment } from "obsidian";
import { Logbook, LogbookLine } from "logbook";
import LogbookParser from "logbook_parser";
import { findWorkflowState, getWorkflowState, getWorkflowStates, getWorkflowStatus, WorkflowState } from "task";
import { isRangeOverlap } from "utils";

export function logbookTransactionFilter(
    transaction: Transaction
): TransactionSpec|readonly TransactionSpec[]
{
    let transactions: TransactionSpec[] = [
        transaction,
    ];
    let changes: ChangeSpec[] = [];

    console.log('logbookTransaction Filter', transaction);

    // Get the new document.
    const newDoc = transaction.newDoc;

    // Get the list of valid states.
    const workflowStates = getWorkflowStates();

    transaction.changes.iterChanges(
        (fromA: number, toA: number, fromB: number, toB: number, inserted: Text): void => {
            // Skip removals.
            if (fromB === toB) {
                return;
            }

            // Get the line at this position.
            const line = newDoc.lineAt(fromB);
            // Get the line as a string.
            const { text } = line;

            // Get current state.
            const state = getWorkflowStatus(text, line.from);

            if (state === null) {
                return;
            }

            console.log('state', state);

            const newState = state.currentState ?? '';

            let stateDesc: WorkflowState|undefined;

            // Update the state if the checkbox value has changed.
            if (state.checkboxValueRange && state.currentState && isRangeOverlap(state.checkboxValueRange.from, state.checkboxValueRange.to, fromB, toB)) {
                stateDesc = findWorkflowState((s) => s.checkbox === state.checkboxValue);
                if (stateDesc) {
                    changes.push({
                        from: state.currentStateRange?.from ?? line.from,
                        to: state.currentStateRange?.to ?? line.from,
                        insert: stateDesc?.name ?? '',
                    });

                    console.log("Update state -> checkbox changed");
                } else {
                    console.warn("No matching state found.", state.checkboxValue);
                }
            }

            // Update the checkbox if the state value has changed.
            if (state.currentStateRange && isRangeOverlap(state.currentStateRange.from, state.currentStateRange.to, fromB, toB)) {
                // Is this a valid state?
                if (workflowStates.contains(newState)) {
                    // Get state data.
                    stateDesc = getWorkflowState(newState);
                    // Get checkbox value.
                    const checkbox = stateDesc?.checkbox;

                    if (state.checkboxValue) {
                        // If found, change it to match the new value.
                        changes.push({
                            from: state.checkboxValueRange?.from ?? line.from,
                            to: state.checkboxValueRange?.to ?? line.from,
                            insert: checkbox,
                        });

                        console.log("Update checkbox -> state changed");
                    } else {
                        // If no checkbox is found, then add it.
                        const checkFrom = state.checkboxValueRange?.from
                            ?? state.listRange?.from
                            ?? (line.from + state.offset);
                        const checkTo = state.checkboxValueRange?.to
                            ?? state.listRange?.to
                            ?? (line.from + state.offset);

                        changes.push({
                            from: checkFrom,
                            to: checkTo,
                            insert: `- [${checkbox}] `,
                        });

                        console.log("Insert checkbox -> state changed");
                    }
                }
            } else {
                console.log("skipping due to lack of overlap");
            }

            if (stateDesc) {
                console.log('updating logbook');
                const logbookChanges = updateLogbook(
                    newDoc,
                    line.number,
                    stateDesc
                );

                changes = changes.concat(logbookChanges);
            }
        }
    );

    if (changes.length > 0) {
        const changeSet = ChangeSet.of(changes, newDoc.length);

        transactions.push({
            changes: changeSet,
            sequential: true,
        });
    }

    return transactions;
}

function updateLogbook(
    doc: Text,
    lineNumber: number,
    state: WorkflowState
): ChangeSpec[]
{
    // The logbook should start directly below the current line.
    const logbookFrom = lineNumber + 1;

    const logbookParser = new LogbookParser();

    // Parse the logbook, or create a new one.
    let logbook = logbookParser.parse(doc, logbookFrom);
    
    let outputPrefix = '';
    
    if (!logbook) {
        console.log('no logbook found. creating');
        let position = doc.length;

        if (logbookFrom <= doc.lines) {
            const line = doc.line(logbookFrom);
            position = line.from;
        } else {
            outputPrefix = "\n";
        }
        logbook = new Logbook(position, position);
    }

    console.log('logbook', logbook);

    const openClock = logbook.getOpenClock();
    if (state.clockState === 'open') {
        console.log('clock should be open');
        if (!openClock) {
            console.log('clock is not open. opening...');
            logbook.addLine(new LogbookLine(moment()));
        } else {
            console.log('clock is open');
        }
    } else if (state.clockState === 'closed') {
        console.log('clock should be closed');
        if (openClock) {
            console.log('clock is open. closing');
            openClock.endTime = moment();
        } else {
            console.log('clock is closed');
        }
    }

    console.log('logbook', logbook);

    const newBlock = outputPrefix + logbook.toString();

    console.log('newBlock', newBlock);

    return [
        {
            from: logbook.from,
            to: logbook.to,
            insert: newBlock,
        }
    ];
}

// export function logbookTransactionFilter(
//     transaction: Transaction
// ): TransactionSpec|readonly TransactionSpec[]
// {
//     let transactions: TransactionSpec[] = [
//         transaction,
//     ];

//     // const startState = transaction.startState;
//     // const startDoc = startState.doc;

//     // Get the new document.
//     const newDoc = transaction.newDoc;

//     // Get the list of valid states.
//     const workflowStates = getWorkflowStates();

//     const workflowRegex = getWorkflowRegex();

//     transaction.changes.iterChanges(
//         (fromA: number, toA: number, fromB: number, toB: number, inserted: Text): void => {
//             console.log('change', fromA, toA, fromB, toB, inserted);

//             // Get the line at this position.
//             const line = newDoc.lineAt(fromB);
//             // Get the line as a string.
//             const { text } = line;

//             const match = workflowRegex.exec(text) as RegExpMatchArrayWithIndices;

//             if (match === null) {
//                 return;
//             }

//             console.log('match', match);

//             const word = match[2] ?? '';
//             const stateFrom = line.from + (match.indices?.[2]?.[0] ?? 0);
//             const stateTo = line.from + (match.indices?.[2]?.[1] ?? 0);

//             if (!isRangeOverlap(stateFrom, stateTo, fromB, toB)) {
//                 console.log("no overlap");
//                 return;
//             }

//             // Is this a valid state?
//             if (workflowStates.contains(word)) {
//                 // Get state data.
//                 const state = getWorkflowState(word);
//                 // Get checkbox value.
//                 const checkbox = state?.checkbox ?? ' ';

//                 // const origLine = startDoc.line(fromA);
//                 // const { text: origText } = origLine;

//                 // Look for an existing checkbox.
//                 const checkboxRe = new RegExp('^\\s*- \\[(.)\\]', 'gd');
//                 const match = checkboxRe.exec(text) as RegExpMatchArrayWithIndices;
//                 console.log('checkbox match', match);
//                 if (match !== null) {
//                     // If found, change it to match the new value.
//                     const matchOffset = match.index ?? 0;
//                     const checkboxFrom = match.indices?.[1]?.[0] ?? 3;
//                     const checkboxTo = match.indices?.[1]?.[1] ?? 3;

//                     const change = ChangeSet.of([
//                         {
//                             from: line.from + checkboxFrom,
//                             to: line.from + checkboxTo,
//                             insert: checkbox,
//                         }
//                     ], newDoc.length)

//                     // const newChanges = transaction.changes.map(change);

//                     // console.log(
//                     //     'update checkbox',
//                     //     change, newChanges, `[${checkbox}]`,
//                     //     line.from + checkboxFrom,
//                     //     line.from + checkboxTo,
//                     // );

//                     // transactions = [{
//                     //     changes: newChanges
//                     // }];

//                     // transactions.push({
//                     //     changes: [
//                     //         {
//                     //             from: line.from + checkboxFrom,
//                     //             to: line.from + checkboxTo,
//                     //             insert: checkbox,
//                     //         }
//                     //     ]
//                     // });

//                     transactions.push({
//                         changes: [
//                             change
//                         ],
//                         sequential: true,
//                     });
//                 } else {
//                     // If no checkbox is found, then add it.
//                     const spMatch = text.match(/^\s*/);
//                     const lineOffset = spMatch?.index ?? 0;
//                     transactions.push({
//                         changes: [
//                             {
//                                 from: line.from + lineOffset,
//                                 to: line.from + lineOffset,
//                                 insert: `- [${checkbox}] `,
//                             }
//                         ],
//                         sequential: true,
//                     });
//                 }
//             }
//         }
//     );

//     console.log('transactions', transactions);

//     return transactions;
// }


// export function logbookTransactionFilter(
//     transaction: Transaction
// ): TransactionSpec|readonly TransactionSpec[]
// {
//     const transactions: TransactionSpec[] = [
//         transaction,
//     ];

//     // Get the new document.
//     const newDoc = transaction.newDoc;

//     // Get the list of valid states.
//     const workflowStates = getWorkflowStates();

//     transaction.changes.iterChanges(
//         (fromA: number, toA: number, fromB: number, toB: number, inserted: Text): void => {
//             console.log('change', fromA, toA, fromB, toB, inserted);

//             // Get the line at this position.
//             const line = newDoc.lineAt(fromA);
//             // Get offset of change relative to start of the line.
//             const offset = fromA - line.from;
//             // Get the line as a string.
//             const { text } = line;
//             // Split into "words". Capture space so we can use it to track offset easier.
//             const parts = text.split(/( )/);

//             // Search for the current word.
//             let wordOffset = offset;
//             const word = parts.find(
//                 (value: string): boolean => {
//                     wordOffset -= value.length;
//                     return wordOffset < 0;
//                 }
//             ) ?? '';

//             // Is this a valid state?
//             if (workflowStates.contains(word)) {
//                 // Get state data.
//                 const state = getWorkflowState(word);
//                 // Get checkbox value.
//                 const checkbox = state?.checkbox ?? ' ';

//                 // Look for an existing checkbox.
//                 const checkboxRe = new RegExp('^\\s*- \\[(.)\\]', 'gd');
//                 const match = checkboxRe.exec(text) as RegExpMatchArrayWithIndices;
//                 console.log('checkbox match', match);
//                 if (match !== null) {
//                     // If found, change it to match the new value.
//                     const matchOffset = match.index ?? 0;
//                     const checkboxFrom = match.indices?.[1]?.[0] ?? 3;
//                     const checkboxTo = match.indices?.[1]?.[1] ?? 3;

//                     transactions.push({
//                         changes: [
//                             {
//                                 from: line.from + checkboxFrom,
//                                 to: line.from + checkboxTo,
//                                 insert: checkbox,
//                             }
//                         ]
//                     });
//                 } else {
//                     // If no checkbox is found, then add it.
//                     const spMatch = text.match(/^\s*/);
//                     const lineOffset = spMatch?.index ?? 0;
//                     transactions.unshift({
//                         changes: [
//                             {
//                                 from: line.from + lineOffset,
//                                 to: line.from + lineOffset,
//                                 insert: `- [${checkbox}] `,
//                             }
//                         ]
//                     });
//                 }
//             }
//         }
//     );

//     return transactions;
// }