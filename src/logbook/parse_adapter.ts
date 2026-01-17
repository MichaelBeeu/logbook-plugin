import { Text } from "@codemirror/state";
import { RegExpMatchArrayWithIndices } from "utils";

export class ParseLine {
    readonly from: number;
    readonly to: number;
    readonly number: number;
    readonly text: string;

    readonly #length: number;

    constructor(
        from: number,
        to: number,
        number: number,
        text: string,
        length?: number
    ) {
        this.from = from;
        this.to = to;
        this.number = number;
        this.text = text;
        this.#length = length ?? this.text.length;
    }

    get length(): number {
        return this.#length;
    }
}

export interface ParseAdapterInterface {
    get lines(): number;

    line(n: number): ParseLine;
}

export class TextParseAdapter implements ParseAdapterInterface {
    #doc: Text;

    constructor(doc: Text) {
        this.#doc = doc;
    }

    get lines(): number {
        return this.#doc.lines;
    }

    line(n: number): ParseLine {
        const line = this.#doc.line(n);
        return new ParseLine(
            line.from,
            line.to,
            line.number,
            line.text,
            line.length
        );
    }
}

export class StringParseAdapter implements ParseAdapterInterface {
    #text: string;
    #content?: ParseLine[];
    #lines: number = 0;

    constructor(text: string) {
        this.#text = text;
    }

    get content(): ParseLine[] {
        if (!this.#content) {
            this.#content = [];

            const re = new RegExp("^.*$", 'gmd');

            const matches = this.#text.matchAll(re); // as RegExpMatchArrayWithIndices[];

            if (matches) {
                let number = 0;
                for (const match of matches) {
                    number ++;
                    const indices = (match as RegExpMatchArrayWithIndices).indices[0];
                    if (indices) {
                        const [from, to] = indices;

                        this.#content[number] = new ParseLine(
                                from,
                                to,
                                number,
                                match[0],
                                to - from
                            );
                    }
                }

                this.#lines = number;
            }

            // if (matches) {
            //     for (const match of matches) {
            //         const [from, to] = match[1].indices;
            //     }
            // }
        }
        return this.#content;
    }

    get lines(): number {
        if (!this.#content) {
            // TODO: Fix this to explicity calculate the number of lines,
            // instead of relying on the side-affect of acessing `content`.
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            this.content;
        }

        return this.#lines;
    }

    line(n: number): ParseLine {
        if (n <= this.lines && n in this.content) {
            return this.content[n]!;
        }

        throw new RangeError(`Line ${n} does not exist in document with ${this.lines} lines.`);
    }
}