import { foldService } from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
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

            for (let n = lineStart.number; n <= lines; ++n) {
                const line = doc.line(n);
                const { text } = line;

                if (text.match(/^\s*:END:$/) !== null) {
                    return {
                        from: lineStart.from,
                        to: line.to,
                    };
                }
            }

            return null;
        }
    );
};