import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { LogbookPluginInterface } from "main";

export function taskViewPlugin(
    plugin: LogbookPluginInterface
) {
    function tasks(view: EditorView): DecorationSet {
        const { state: { doc } } = view;

        const builder = new RangeSetBuilder<Decoration>();

        // Get all the workflows in the document.
        const tasks = plugin.taskParser.getAllWorkflowStatuses(doc.toString());

        for (const task of tasks) {
            // If we have a current status, then mark it.
            if (task?.currentStateRange && task?.currentState) {
                builder.add(
                    task?.currentStateRange?.from,
                    task.currentStateRange.to,
                    Decoration.mark({
                        attributes: {
                            class: `logbook-task-state ${task.workflow?.cssClass}`,
                            // Disable spellcheck on the task state, as it should be valid even
                            // if not in the dictionary.
                            spellcheck: "false",
                        }
                    })
                );
            }
        }

        return builder.finish();
    };

    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet

            constructor(view: EditorView) {
                this.decorations = tasks(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged ||
                    syntaxTree(update.startState) != syntaxTree(update.state)) {
                    this.decorations = tasks(update.view);
                }
            }
        },
        {
            decorations: v => v.decorations,

            eventHandlers: {
                pointerdown: (e, view) => {
                    if (e.button !== 0) {
                        return;
                    }

                    const target= e.target as HTMLElement;
                    if (target.nodeName == 'SPAN'
                        && target.classList.contains('logbook-task-state')) {
                        const { state: { doc } } = view;

                        const pos = view.posAtDOM(target);
                        const line = doc.lineAt(pos);

                        const changes = plugin.cycleTasks(view, line.number, line.number);
                        if (changes.length > 0) {
                            view.dispatch({
                                changes
                            });
                        }
                    }
                }
            }
        }
    );
};