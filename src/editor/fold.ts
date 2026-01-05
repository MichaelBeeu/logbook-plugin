import { foldService } from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
import LogbookParser from "logbook/logbook_parser";
import { TextParseAdapter } from "logbook/parse_adapter";
import LogbookPluginInterface from "main";

export function logbookFoldService(
    plugin: LogbookPluginInterface
): Extension {
    return foldService.of(
        (state: EditorState, from: number, to: number): {from: number, to: number}|null => {
            const { doc } = state;
            const { lines } = doc;
            const lineStart = doc.lineAt(from);

            const { text: startText } = lineStart;

            if (startText.match(/^\s*:LOGBOOK:$/) === null) {
                return null;
            }

            // Grab the text before the line. Look for what looks like code block delimiters.
            const docBefore = doc.slice(0, lineStart.from).toString();
            const codeBlocks = docBefore.match(/^```/gm) ?? [];
            const numCodeBlocks = codeBlocks.length;

            // If there's an odd number of code block markers, then assume we're in a codeblock, and exit.
            if (numCodeBlocks % 2 === 1) {
                return null;
            }

            const parseAdapter = new TextParseAdapter(doc);
            const parser = new LogbookParser();
            const book = parser.parse(parseAdapter, lineStart.number);

            if (book) {
                return {
                    from: lineStart.from,
                    to: book.to,
                };
            }

            return null;
        }
    );
};