import { TaskParser } from "./task";

describe('test task parser', () => {
    let parser: TaskParser|null = null;

    beforeEach(() => {
        parser = new TaskParser();
    });

    test('can get workflow state', () => {
        const state = parser?.getWorkflowState('TODO');

        expect(state).not.toBeUndefined();
    });

    test('can get all workflow states', () => {
        const states = parser?.getWorkflowStates();

        expect(states?.length).toBeGreaterThan(0);
    });

    test('can get workflow regex', () => {
        const regex = parser?.getWorkflowRegex();

        expect(regex).not.toBeNull();
    });

    test('can find workflow state', () => {
        const state = parser?.findWorkflowState(state => state.checkbox == 'x');

        expect(state?.checkbox).toBe('x');
    });

    test('can get all workflow statuses', () => {
        const document=`
# Header
- [ ] TODO
- [ ] DOING The quick brown fox jumped over the lazy dog.
    - [ ] DOING
- [x] DONE foo

## Header 2
- DOING no checkbox

- bar no state
A line that should never be a task.
\`\`\`
- [ ] TODO This should not be a task, since it's in a codeblock.
\`\`\`
`;
        const statuses = parser?.getAllWorkflowStatuses(document);

        expect(statuses?.length).toBe(6);
    });

    test('get correct workflow offset', () => {
        const document=`01234
567890
- [ ] TODO adsf`
        
        const status = parser?.getAllWorkflowStatuses(document);

        expect(status?.[0]?.from).toBe(13);
    });

    test('get single workflow status', () => {
        const line = "- [ ] TODO";

        const status = parser?.getWorkflowStatus(line, 0);

        expect(status).not.toBeNull();
    });

    test('can increment a task', () => {
        let state = parser?.proceedWorkflow('TODO');
        expect(state?.name).toBe('DOING');

        state = parser?.proceedWorkflow('DOING');
        expect(state?.name).toBe('DONE');

        state = parser?.proceedWorkflow('DONE');
        expect(state?.name).toBe('TODO');
    });
});