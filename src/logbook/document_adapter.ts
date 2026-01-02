import { Text } from "@codemirror/state"

export abstract class DocumentAdapter
{
    abstract lineCount(): number;
    abstract getLine(line: number): string;
    abstract getRange(from: number, to: number): string;
}

// export class TextAdapter extends DocumentAdapter {
//     #doc: Text;

//     constructor(doc: Text) {
//         super();

//         this.#doc = doc;
//     }

//     lineCount(): number {
//         return this.#doc.lines;
//     }

//     getLine(line: number): string {
//         return this.#doc.line(line);
//     }


// }