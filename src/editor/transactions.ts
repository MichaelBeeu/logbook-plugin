import { Annotation, AnnotationType, ChangeSet, ChangeSpec, EditorSelection, EditorState, Extension, StateEffect, Text, Transaction, TransactionSpec } from "@codemirror/state";
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

function getAnnotations(transaction: Transaction, types: readonly AnnotationType<unknown>[]): Annotation<unknown>[] {
    return types.reduce(
        (annotations, type) => {
            // Get the value, and ensure the annotation exists.
            const value = transaction.annotation(type);
            if (value) {
                // Add to list.
                return [
                    ...annotations,
                    type.of(value),
                ];
            }
            
            return [...annotations];
        }, []
    );
}


export function taskNewlineFilter(
    plugin: LogbookPluginInterface
): Extension {
    return EditorState.transactionFilter.of(
        function(transaction: Transaction): TransactionSpec|readonly TransactionSpec[]
        {
            if (!plugin.settings.filterNewlines || !transaction.isUserEvent) {
                return transaction;
            }

            // Track new changes
            let changes: ChangeSpec[] = [];
            let selection: EditorSelection|undefined = transaction.selection;
            // Track if the transaction should be replaced, or not.
            let shouldReplace = false;

            // Get the document.
            const doc = transaction.startState.doc;

            transaction.changes.iterChanges(
                (fromA: number, toA: number, fromB: number, toB: number, inserted: Text): void => {
                    // Get the line at this position.
                    const line = doc.lineAt(fromA);

                    // Only act if the change includes inserting a newline, and occurs at the end of the line.
                    if (inserted.lines > 1 && toA == line.to) {
                        // Get the line as a string.
                        const { text } = line;

                        // Get current state.
                        const workflow = plugin.taskParser.getWorkflowStatus(text, line.from);

                        if (workflow !== null) {
                            // The logbook should start directly below the current line.
                            const logbookFrom = line.number + 1;

                            const logbookParser = new LogbookParser(moment);

                            // Parse the logbook
                            const parseAdapter = new TextParseAdapter(doc);
                            const logbook = logbookParser.parse(parseAdapter, logbookFrom);
                            
                            if (logbook) {
                                let insertedLines = inserted.toJSON();
                                let offset = 0;
                                
                                // If the first line has text, then insert it at the original location.
                                if (insertedLines[0] !== '') {
                                    const insert = insertedLines.shift();
                                    offset = (insert?.length ?? 0) - (toA - fromA);

                                    changes.push({
                                        from: fromA,
                                        to: toA,
                                        insert,
                                    });
                                    
                                    // Replace with a newline at the new location.
                                    insertedLines.unshift('');
                                }
                                
                                // Insert text at new location (after logbook)
                                const newInsert = insertedLines.join("\n");
                                changes.push({
                                    from: logbook.to,
                                    to: logbook.to,
                                    insert: insertedLines.join("\n"),
                                });
                                
                                // Move selection.
                                if (selection === undefined
                                    || (selection.main.from === selection.main.to
                                    && selection.main.to === (toA + 1))) {
                                    selection = EditorSelection.create(
                                        [EditorSelection.cursor(logbook.to + newInsert.length + offset)]
                                    );
                                }
                                
                                // A change to the transaction is required.
                                shouldReplace = true;

                                return;
                            }
                        }
                    }
                    
                    // Add change without modification.
                    changes.push({
                        from: fromA,
                        to: toA,
                        insert: inserted
                    });
                }
            );
            
            // Only replace the transaction if necessary,
            // otherwise fallback to the original transaction.
            if (shouldReplace) {
                let annotations: Annotation<unknown>[] = getAnnotations(
                    transaction,
                    [
                        Transaction.userEvent,
                        Transaction.addToHistory,
                        Transaction.remote,
                        Transaction.time
                    ]);
                
                // Return new transaction.
                const result: TransactionSpec = {
                    changes,
                    selection: selection,
                    effects: transaction.effects,
                    annotations,
                };
                
                return result;
            }
            
            return transaction;
        }
    );
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
            let effects: StateEffect<{number: number}>[] = [];

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

                                changes.push({
                                    from: checkFrom,
                                    to: checkTo,
                                    insert,
                                });
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
                        );

                        changes = changes.concat(logbookChanges);
                        effects = effects.concat(logbookEffects);
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
            if (plugin.settings.minLogLineThreshold > 0) {
                const duration = logbook.ensureLineComplete(openClock).duration;
                if (duration && duration.asSeconds() < plugin.settings.minLogLineThreshold) {
                    logbook.removeLine(openClock);
                }
            }
        }
    }

    // Only insert the book if it has lines within it.
    if ((logbook?.lines?.length ?? 0) <= 0) {
        if (newLogbook) {
            // Do not insert the logbook.
            return {
                changes: [],
                effects
            };
        } else {
            // Remove the empty logbook.
            return {
                changes: [
                    {
                        // Remove newline too.
                        from: logbook.from - 1,
                        to: logbook.to,
                        insert: "",
                    }
                ],
                effects
            };
        }
    }

    const indentChar = plugin.settings.indentType == 'tabs' ? "\t" : "    ";
    const newBlock = outputPrefix + logbook.toString(indentation, indentChar) + outputSuffix;

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