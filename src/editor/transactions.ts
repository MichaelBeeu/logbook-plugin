import { ChangeSet, ChangeSpec, EditorState, Extension, StateEffect, Text, Transaction, TransactionSpec } from "@codemirror/state";
import { moment } from "obsidian";
import { Logbook, LogbookLine } from "logbook/logbook";
import LogbookParser from "logbook/logbook_parser";
import type { WorkflowState } from "tasks/task";
import { isRangeOverlap } from "utils";
import LogbookPluginInterface from "main";
import { TextParseAdapter } from "logbook/parse_adapter";

interface LogbookUpdateResult {
    changes: ChangeSpec[];
    effects: StateEffect<{number: number}>[];
};

export const createLogbook = StateEffect.define<{number: number}>();

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
            let effects: StateEffect<{number: number}>[] = [];
            const { state } = transaction;

            // Get the new document.
            const newDoc = transaction.newDoc;

            // Get the list of valid states.
            const workflowStates = plugin.taskParser.getWorkflowStates();

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
                    const workflow = plugin.taskParser.getWorkflowStatus(text, line.from);

                    if (workflow === null) {
                        return;
                    }

                    let pos = workflow.to;

                    const newState = workflow.currentState ?? '';

                    let stateDesc: WorkflowState|undefined;

                    // Update the state if the checkbox value has changed.
                    if (workflow.checkboxValueRange && workflow.currentState && isRangeOverlap(workflow.checkboxValueRange.from, workflow.checkboxValueRange.to, fromB, toB)) {
                        stateDesc = plugin.taskParser.findWorkflowState((s) => s.checkbox === workflow.checkboxValue);
                        if (stateDesc && workflow.currentStateRange?.from) {
                            const newState = stateDesc?.name ?? '';

                            changes.push({
                                from: workflow.currentStateRange?.from,
                                to: workflow.currentStateRange?.to,
                                insert: newState,
                            });

                            const oldLength = workflow.currentStateRange.to - workflow.currentStateRange.from;
                            const newLength = newState.length;

                            pos += (newLength - oldLength);
                        } else {
                            console.warn("No matching state found.", workflow.checkboxValue);
                        }
                    }

                    // Update the checkbox if the state value has changed.
                    if (workflow.currentStateRange && isRangeOverlap(workflow.currentStateRange.from, workflow.currentStateRange.to, fromB, toB)) {
                        // Is this a valid state?
                        if (workflowStates.contains(newState)) {
                            // Get state data.
                            stateDesc = plugin.taskParser.getWorkflowState(newState);
                            // Get checkbox value.
                            const checkbox = stateDesc?.checkbox;

                            if (workflow.checkboxValue) {
                                // If found, change it to match the new value.
                                changes.push({
                                    from: workflow.checkboxValueRange?.from ?? line.from,
                                    to: workflow.checkboxValueRange?.to ?? line.from,
                                    insert: checkbox,
                                });
                            } else {
                                // If no checkbox is found, then add it.
                                const checkFrom = workflow.checkboxValueRange?.from
                                    ?? workflow.listRange?.from
                                    ?? (line.from + workflow.offset);
                                const checkTo = workflow.checkboxValueRange?.to
                                    ?? workflow.listRange?.to
                                    ?? (line.from + workflow.offset);
                                const insert = `- [${checkbox}] `;
                                const oldLength = checkTo - checkFrom;
                                const newLength = insert.length;

                                changes.push({
                                    from: checkFrom,
                                    to: checkTo,
                                    insert,
                                });

                                pos += (newLength - oldLength);
                            }
                        }
                    }

                    if (stateDesc) {
                        const {changes: logbookChanges, effects: logbookEffects } = updateLogbook(
                            plugin,
                            newDoc,
                            line.number,
                            stateDesc,
                            plugin.settings.matchIdentation ? workflow.offset : -1,
                            state,
                            pos
                        );

                        changes = changes.concat(logbookChanges);
                        effects = effects.concat(logbookEffects);

                        // transactions.push({
                        //     effects: logbookEffects,
                        // });
                    }
                }
            );

            if (changes.length > 0 || effects.length > 0) {
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
    workflow: WorkflowState,
    indentation: number,
    state: EditorState,
    pos: number
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

    // The logbook should start directly below the current line.
    const logbookFrom = lineNumber + 1;

    const logbookParser = new LogbookParser(moment);

    const effects: StateEffect<{number: number}>[] = [];

    // Parse the logbook, or create a new one.
    const parseAdapter = new TextParseAdapter(doc);
    let logbook = logbookParser.parse(parseAdapter, logbookFrom);

    let outputPrefix = '';
    let outputSuffix = '';
    let newLogbook = false;
    
    if (!logbook) {
        let position = doc.length;

        if (logbookFrom <= doc.lines) {
            const line = doc.line(logbookFrom);
            position = line.from;
        } else {
            outputPrefix = "\n";
        }
        logbook = new Logbook(moment, position, position);
        newLogbook = true;
        outputSuffix = "\n";
    }

    const openClock = logbook.getOpenClock();
    if (workflow.clockState === 'open') {
        if (file) {
            plugin.addLogbookFile(file);
        }

        if (!openClock) {
            logbook.addLine(new LogbookLine( moment()));

            if (newLogbook) {
                effects.push(
                    createLogbook.of({
                        number: logbookFrom
                    })
                );
            }
        }
    } else if (workflow.clockState === 'closed') {
        if (openClock) {
            openClock.endTime = moment();
        }
    }

    if ((logbook?.lines?.length ?? 0) <= 0) {
        return {
            changes: [],
            effects
        };
    }

    const newBlock = outputPrefix + logbook.toString(indentation) + outputSuffix;

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