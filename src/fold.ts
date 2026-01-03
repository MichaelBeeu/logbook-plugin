import { EditorState } from "@codemirror/state";

export function createFoldService() {
    return (editor: EditorState, from: number, to: number): {from: number, to: number}|null => {
        console.log('fold', from, to);

        return null;
    }
}