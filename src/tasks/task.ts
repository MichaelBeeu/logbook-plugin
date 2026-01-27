import { RegExpMatchArrayWithIndices } from "utils";

type ClockState = 'open'|'closed';

export interface WorkflowState {
    name: string;
    next: string;
    checkbox: string;
    clockState: ClockState;
    cssClass: string;
}

type Workflow = Record<string, WorkflowState>;

export interface WorkflowResult {
    name: string;
    state: WorkflowState;
}

export interface WorkflowRange {
    from: number;
    to: number;
}

export interface WorkflowStatus {
    from: number;
    to: number;
    offset: number;
    currentState?: string;
    currentStateRange?: WorkflowRange;
    checkboxValue?: string;
    checkboxValueRange?: WorkflowRange;
    listRange?: WorkflowRange;
    currentWorkflowState?: WorkflowState;
    indentation?: number;
    workflow?: WorkflowState;
}

const defaultTaskWorkflow: Workflow = {
    "TODO": {
        name: "TODO",
        next: "DOING",
        checkbox: ' ',
        clockState: 'closed',
        cssClass: 'logbook-task-state-paused',
    },
    "DOING": {
        name: "DOING",
        next: "DONE",
        checkbox: ' ',
        clockState: 'open',
        cssClass: 'logbook-task-state-inprogress',
    },
    "DONE": {
        name: "DONE",
        next: "TODO",
        checkbox: 'x',
        clockState: 'closed',
        cssClass: 'logbook-task-state-done',
    },

    "LATER": {
        name: "LATER",
        next: "NOW",
        checkbox: ' ',
        clockState: 'closed',
        cssClass: 'logbook-task-state-paused',
    },
    "NOW": {
        name: "NOW",
        next: "DONE",
        checkbox: ' ',
        clockState: 'open',
        cssClass: 'logbook-task-state-inprogress',
    },
};

export class TaskParser
{
    #taskWorkflow: Workflow = defaultTaskWorkflow;

    setTaskWorkflow(taskWorkflow: Workflow): this {
        this.#taskWorkflow = taskWorkflow;

        return this;
    }

    getWorkflowState(state: string): WorkflowState|undefined {
        return this.#taskWorkflow[state];
    }

    getWorkflowStates(): string[] {
        return Object.keys(this.#taskWorkflow);
    }

    getWorkflowRegex(flags: string = 'gd'): RegExp {
        let states = this.getWorkflowStates().join('|');
        // eslint-disable-next-line no-useless-escape
        const r = `^(?<offset>[ \\\t]*)(?<list>- )(?:(\\\[(?<checkbox>.)\\\] )?)?(?<state>${states})?\\\s`;

        return new RegExp(r, flags);
    }

    findWorkflowState(
        predicate: (status: WorkflowState) => boolean
    ): WorkflowState|undefined
    {
        return Object.values(this.#taskWorkflow).find(predicate);
    }

    getAllWorkflowStatuses(
        document: string,
        offset: number = 0
    ): WorkflowStatus[]
    {
        let result: WorkflowStatus[] = [];

        const regex = this.getWorkflowRegex('gdm');

        const matches = document.matchAll(regex);

        for (const match of matches) {
            const status = this.getWorkflowStatus(match[0], offset + match.index);
            if (status) {
                result.push(status);
            }
        }

        return result;
    }

    getWorkflowStatus(
        line: string,
        offset: number
    ): WorkflowStatus|null
    {
        const logbookMatch = line.match(/^\s*(:LOGBOOK:$|CLOCK:|:END:$)/);

        if (logbookMatch !== null) {
            return null;
        }

        const regex = this.getWorkflowRegex();

        const match = regex.exec(line) as RegExpMatchArrayWithIndices;

        if (match !== null) {
            const index = match.index ?? 0;
            const checkboxValue = match.groups?.['checkbox'];

            const matchOffset = match.indices?.groups?.['offset']?.[1] ?? 0;

            let result: WorkflowStatus = {
                from: offset + index,
                to: offset + match[0].length,
                offset: matchOffset,
                currentStateRange: {
                    from: offset + index,
                    to: offset + index,
                },
                indentation: match.groups?.['offset']?.length ?? 0,
            };

            if (match.indices?.groups?.['list']) {
                result.listRange = {
                    from: offset + (match.indices?.groups?.['list']?.[0] ?? index),
                    to: offset + (match.indices?.groups?.['list']?.[1] ?? index),
                };
                result.currentStateRange = {
                    from: offset + (match.indices?.groups?.['list']?.[1] ?? index),
                    to: offset + (match.indices?.groups?.['list']?.[1] ?? index),
                };
            }

            if (checkboxValue) {
                const checkboxIndices = match?.indices?.groups?.['checkbox'] ?? [0, 0];
                const checkboxFrom = checkboxIndices[0];
                const checkboxTo = checkboxIndices[1];
                result.checkboxValue = match?.groups?.['checkbox'];
                result.checkboxValueRange = {
                    from: offset + checkboxFrom,
                    to: offset + checkboxTo,
                };

                result.currentStateRange = {
                    from: result.checkboxValueRange.to + 2,
                    to: result.checkboxValueRange.to + 2,
                };
            }

            const stateValue = match.groups?.['state'];
            if (stateValue) {
                const stateIndices = match?.indices?.groups?.['state'] ?? [0, 0];
                const stateFrom = stateIndices[0];
                const stateTo = stateIndices[1];
                result.currentState = stateValue;
                result.workflow = this.getWorkflowState(stateValue);
                result.currentWorkflowState = this.getWorkflowState(stateValue);
                result.currentStateRange = {
                    from: offset + stateFrom,
                    to: offset + stateTo,
                }
            }

            return result;
        }

        return null;
    }

    proceedWorkflow(currentState?: string): WorkflowResult|null {
        if (!currentState) {
            const name = Object.keys(this.#taskWorkflow)[0];

            if (name && name in this.#taskWorkflow) {
                return {
                    name: name,
                    state: this.#taskWorkflow[name]!,
                };
            }

            return null;
        }

        if (!(currentState in this.#taskWorkflow)) {
            return null;
        }

        const state =this. #taskWorkflow[currentState];
        const next = state?.next;
        if (!next || !(next in this.#taskWorkflow)) {
            return null;
        }

        return {
            name: next,
            state: this.#taskWorkflow[next]!,
        };
    }
}