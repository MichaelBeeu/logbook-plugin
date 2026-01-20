import { foldService } from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
import LogbookParser from "logbook/logbook_parser";
import { TextParseAdapter } from "logbook/parse_adapter";
import LogbookPluginInterface from "main";
import { moment } from 'obsidian';

export function logbookFoldService(
    plugin: LogbookPluginInterface
): Extension {
    return foldService.of(
        (state: EditorState, from: number, to: number): {from: number, to: number}|null => {
            // Exit early if collapsing logbooks is disabled.
            if (!plugin.settings.collapseLogbooks) {
                return null;
            }

            const isSourceMode = plugin.isSourceMode();
            if (!isSourceMode) {

                const { doc } = state;
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
                const parser = new LogbookParser(moment);
                const book = parser.parse(parseAdapter, lineStart.number);

                if (book) {
                    return {
                        from: lineStart.from,
                        to: book.to,
                    };
                }
            }

            return null;
        }
    );
};