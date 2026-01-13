import { RegExpMatchArrayWithIndices } from "utils";

type ClockState = 'open'|'closed';

export interface WorkflowState {
    name: string;
    next: string;
    checkbox: string;
    clockState: ClockState;
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
    offset: number;
    currentState?: string;
    currentStateRange?: WorkflowRange;
    checkboxValue?: string;
    checkboxValueRange?: WorkflowRange;
    listRange?: WorkflowRange;
    currentWorkflowState?: WorkflowState;
    indentation?: number;
}

const taskWorkflow: Workflow = {
    "TODO": {
        name: "TODO",
        next: "DOING",
        checkbox: ' ',
        clockState: 'closed',
    },
    "DOING": {
        name: "DOING",
        next: "DONE",
        checkbox: ' ',
        clockState: 'open',
    },
    "DONE": {
        name: "DONE",
        next: "TODO",
        checkbox: 'x',
        clockState: 'closed',
    },

    "LATER": {
        name: "LATER",
        next: "NOW",
        checkbox: ' ',
        clockState: 'closed',
    },
    "NOW": {
        name: "NOW",
        next: "DONE",
        checkbox: ' ',
        clockState: 'open',
    },
};

export function getWorkflowState(state: string): WorkflowState|undefined {
    return taskWorkflow[state];
}

export function getWorkflowStates(): string[] {
    return Object.keys(taskWorkflow);
}

export function getWorkflowRegex(): RegExp {
    let states = getWorkflowStates().join('|');
    const r = `^(?<offset>\\\s*)(?<list>- )(?:(\\\[(?<checkbox>.)\\\] )?)?(?<state>${states})?`;

    return new RegExp(r, 'gd');
}

export function findWorkflowState(
    predicate: (status: WorkflowState) => boolean
): WorkflowState|undefined
{
    return Object.values(taskWorkflow).find(predicate);
}

export function getWorkflowStatus(
    line: string,
    offset: number
): WorkflowStatus|null
{
    const logbookMatch = line.match(/^\s*(:LOGBOOK:$|CLOCK:|:END:$)/);

    if (logbookMatch !== null) {
        return null;
    }

    const regex = getWorkflowRegex();

    const match = regex.exec(line) as RegExpMatchArrayWithIndices;

    if (match !== null) {
        const index = match.index ?? 0;
        const checkboxValue = match.groups?.['checkbox'];

        const matchOffset = match.indices?.groups?.['offset']?.[1] ?? 0;

        let result: WorkflowStatus = {
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
            result.currentWorkflowState = getWorkflowState(stateValue);
            result.currentStateRange = {
                from: offset + stateFrom,
                to: offset + stateTo,
            }
        }

        return result;
    }

    return null;
}

export function proceedWorkflow(currentState?: string): WorkflowResult|null {
    if (!currentState) {
        const name = Object.keys(taskWorkflow)[0];

        if (name && name in taskWorkflow) {
            return {
                name: name,
                state: taskWorkflow[name]!,
            };
        }

        return null;
    }

    if (!(currentState in taskWorkflow)) {
        return null;
    }

    const state = taskWorkflow[currentState];
    const next = state?.next;
    if (!next || !(next in taskWorkflow)) {
        return null;
    }

    return {
        name: next,
        state: taskWorkflow[next]!,
    };
}