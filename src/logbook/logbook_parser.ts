import { Line, Text } from '@codemirror/state';
import { Logbook, LogbookLine } from 'logbook/logbook';
import { ParseAdapterInterface } from 'logbook/parse_adapter';
import { moment } from 'obsidian';

type ParseMode = 'scan'|'drawer';

export default class LogbookParser {
    /**
     * Parse the provided document for all logbooks.
     * The parser will search "up" from the start position looking
     * for the first logbook drawer. Once it reaches the top line it will
     * resume from start to the end of the document.
     * 
     * @param doc 
     * @param start 
     * @returns 
     */
    parse(doc: ParseAdapterInterface, start: number = 1, end: number|undefined = undefined): Logbook|undefined
    {
        let result: Logbook|undefined = undefined;

        const logbookDrawerRe = /^\s*?:LOGBOOK:$/i;
        const drawerEndRe = /^\s*?:END:$/i;

        let from = start;
        end ??= doc.lines;

        // Start in scan mode.
        let mode: ParseMode = 'scan';
        // Store reference to parent line.
        let parentLine: Line|undefined = undefined;
        let pendingLogbook = new Logbook();

        for (let n = from; n <= end; n++) {
            // Get the current line.
            const line = doc.line(n);
            // Extract text.
            const { text } = line;

            if (mode == 'scan') {
                // Check if this is the start of a logbook drawer.
                const isLogbookDrawer = text.match(logbookDrawerRe) !== null && n > 1;

                if (isLogbookDrawer) {
                    pendingLogbook.from = line.from;

                    mode = 'drawer';
                    parentLine = doc.line(n - 1);
                } else {
                    // Not a logbook, so exit.
                    break;
                }
            } else if (mode == 'drawer') {
                // If we're in a drawer, check for the end.
                const isEnd = text.match(drawerEndRe) !== null;

                if (isEnd) {
                    pendingLogbook.to = line.to;

                    result = pendingLogbook;

                    break;
                } else {
                    // not the end, then assume it's a clock line.
                    const clock = this.#parseClock(line);
                    if (clock !== undefined) {
                        pendingLogbook.addLine(clock);
                    } else {
                        console.warn("Invalid clock line!", line);
                        return undefined;
                    }
                }
            }
        }

        return result;
    }

    parseAll(doc: ParseAdapterInterface, start: number = 1, end: number|undefined = undefined): Logbook[]
    {
        let result: Logbook[] = [];

        const logbookDrawerRe = /^\s*?:LOGBOOK:$/i;

        end = Math.min(doc.lines, end ?? doc.lines);

        for(let n = start; n <= end; ++n) {
            const line = doc.line(n);
            const { text } = line;

            if (text.match(logbookDrawerRe) !== null) {
                const logbook = this.parse(doc, n);

                if (logbook) {
                    result.push(logbook);
                }
            }
        }

        return result;
    }

    #parseClock(line: Line): LogbookLine|undefined {
        const { text, from } = line;
        const clockRe = /^CLOCK:\s*\[([^\]]+)\](?:--\[([^\]]+)\](?:\s*=>\s*(\d+:\d{2}(?::\d{2})?)?)?)?$/mi
        let result: LogbookLine|undefined = undefined;

        const clockData = text.match(clockRe);
        if (clockData) {
            const startTime = this.#parseDate(clockData?.[1]);
            if (startTime !== undefined) {
                const endTime = this.#parseDate(clockData[2]);
                const duration = this.#parseDuration(clockData[3]);

                result = new LogbookLine(
                    startTime,
                    endTime,
                    duration,
                    from,
                    from + text.length
                );
            }
        }

        return result;
    }

    #parseDate(datetime?: string): moment.Moment|undefined {
        if (datetime === undefined) {
            return undefined;
        }

        const parts = datetime.split(' ');
        const date = parts[0] ?? '';
        const time = parts[2] ?? parts[1] ?? '00:00:00';
        return moment(`${date}T${time}`);
    }

    #parseDuration(duration?: string): moment.Duration|undefined {
        if (duration === undefined) {
            return undefined;
        }

        const parts = duration.split(":");

        if (parts.length < 2) {
            return undefined;
        }

        const hours = parseInt(parts[0] ?? '0');
        const minutes = parseInt(parts[1] ?? '0');
        const seconds = parseInt(parts[2] ?? '0');

        return moment.duration({
            hours,
            minutes,
            seconds
        });
    }
}