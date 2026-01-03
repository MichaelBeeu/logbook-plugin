import { StreamLanguage, StringStream } from "@codemirror/language";

interface LogbookParserState {
    inLogbook: boolean;
};

export function createStreamParser(): StreamLanguage<LogbookParserState> {
    return StreamLanguage.define(
        {
            name: "logbook",
            startState(): LogbookParserState {
                return {
                    inLogbook: false
                };
            },
            token(stream: StringStream, state: LogbookParserState): string|null {
                console.log('token...');
                if (stream.match(/^\s*:LOGBOOK:/)) {
                    console.log('in logbook');
                    state.inLogbook = true;
                    return 'meta';
                } else if (stream.match(/^\s*:END:/)) {
                    console.log('out of logbook');
                    state.inLogbook = false;
                    return 'meta';
                }

                console.log('no match');

                stream.next();

                if (state.inLogbook) {
                    console.log('in logbook');
                    // stream.next();
                    return 'meta';
                }

                console.log('not in logbook');

                return null;
            },
        }
    );
}