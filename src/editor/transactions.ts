import { ChangeSet, ChangeSpec, EditorState, Extension, StateEffect, Text, Transaction, TransactionSpec } from "@codemirror/state";
import { moment } from "obsidian";
import { Logbook, LogbookLine } from "logbook/logbook";
import LogbookParser from "logbook/logbook_parser";
import { findWorkflowState, getWorkflowState, getWorkflowStates, getWorkflowStatus, WorkflowState } from "tasks/task";
import { isRangeOverlap } from "utils";
import LogbookPluginInterface from "main";
import { TextParseAdapter } from "logbook/parse_adapter";

interface LogbookUpdateResult {
    changes: ChangeSpec[];
    effects: StateEffect<any>[];
};

export function logbookTransactionFilter(
    plugin: LogbookPluginInterface
): Extension {
    return EditorState.transactionFilter.of(
        function(transaction: Transaction): TransactionSpec|readonly TransactionSpec[]
        {
            let transactions: TransactionSpec[] = [
                transaction,
            ];
            let changes: ChangeSpec[] = [];
            let effects: StateEffect<any>[] = [];

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
                        const {changes: logbookChanges, effects: logbookEffects } = updateLogbook(
                            plugin,
                            newDoc,
                            line.number,
                            stateDesc
                        );

                        changes = changes.concat(logbookChanges);
                        effects = effects.concat(logbookEffects);
                    }
                }
            );

            if (changes.length > 0) {
                const changeSet = ChangeSet.of(changes, newDoc.length);

                transactions.push({
                    changes: changeSet,
                    effects,
                    sequential: true,
                });
            }

            return transactions;
        }
    );
}


function updateLogbook(
    plugin: LogbookPluginInterface,
    doc: Text,
    lineNumber: number,
    state: WorkflowState
): LogbookUpdateResult
{
    const {
        app: {
            workspace: {
                activeEditor
            }
        }
    } = plugin;

    const file = activeEditor?.file;

    console.log('file', file);

    // The logbook should start directly below the current line.
    const logbookFrom = lineNumber + 1;

    const logbookParser = new LogbookParser(moment);

    const effects: StateEffect<any>[] = [];

    // Parse the logbook, or create a new one.
    const parseAdapter = new TextParseAdapter(doc);
    let logbook = logbookParser.parse(parseAdapter, logbookFrom);
    
    let outputPrefix = '';
    let outputSuffix = '';
    
    if (!logbook) {
        console.log('no logbook found. creating');
        let position = doc.length;

        if (logbookFrom <= doc.lines) {
            const line = doc.line(logbookFrom);
            position = line.from;
        } else {
            outputPrefix = "\n";
        }
        logbook = new Logbook(moment, position, position);
        outputSuffix = "\n";
    }

    console.log('logbook', logbook);

    const openClock = logbook.getOpenClock();
    if (state.clockState === 'open') {
        if (file) {
            plugin.addLogbookFile(file);
        }

        console.log('clock should be open');
        if (!openClock) {
            console.log('clock is not open. opening...');
            logbook.addLine(new LogbookLine( moment()));
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

    const newBlock = outputPrefix + logbook.toString() + outputSuffix;

    console.log('newBlock', newBlock);

    return {
        changes: [
            {
                from: logbook.from,
                to: logbook.to,
                insert: newBlock,
            },
        ],
        effects,
    };
}