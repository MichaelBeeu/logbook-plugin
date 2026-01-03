import { foldService } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

export const logbookFoldService = foldService.of(
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