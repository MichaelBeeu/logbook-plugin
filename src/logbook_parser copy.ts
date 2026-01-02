import { moment } from 'obsidian';

export class LogbookLine {
    #startTime: moment.Moment;
    #endTime?: moment.Moment;
    #duration?: moment.Duration;
    #from?: number;
    #to?: number;

    constructor(
        startTime: moment.Moment,
        endTime?: moment.Moment,
        duration?: moment.Duration,
        from?: number,
        to?: number,
    ) {
        this.#startTime = startTime;
        this.#endTime = endTime;
        this.#duration = duration;
        this.#from = from;
        this.#to = to;
    }

    get duration(): moment.Duration|undefined {
        if (this.#endTime === undefined) {
            return undefined;
        }

        this.#duration ??= moment.duration(this.#startTime.diff(this.#endTime));

        return this.#duration;
    }

    get startTime(): moment.Moment {
        return this.#startTime;
    }

    get endTime(): moment.Moment|undefined {
        return this.#endTime;
    }

    get from(): number|undefined {
        return this.#from;
    }

    get to(): number|undefined {
        return this.#to;
    }

    toString(): string {
        let secondHalf = '';
        if (this.#endTime !== undefined) {
            const d = moment.utc(this.duration?.asMilliseconds()).format("HH:mm:ss");
            secondHalf = `--[${this.#endTime.format('YYYY-MM-DD ddd HH:mm:ss')}] => ${d}`;
        }
        return `CLOCK: [${this.#startTime.format('YYYY-MM-DD ddd HH:mm:ss')}]${secondHalf}`;
    }
}

export default class LogbookParser {
    #logbook: string;
    #lines: LogbookLine[];
    #from: number;
    #to: number;

    get from(): number {
        return this.#from;
    }

    get to(): number {
        return this.#to;
    }

    constructor(logbook: string, from: number, to: number) {
        this.#logbook = logbook;
        this.#from = from;
        this.#to = to;
    }

    eq(logbook: LogbookParser): boolean {
        return this.#logbook == logbook.#logbook;
    }

    getLogbook(): string {
        return this.#logbook;
    }

    #parseLines(): LogbookLine[] {
        const rawLines = this.#logbook.split("\n");
        const clockRe = /^CLOCK:\s*\[([^\]]+)\](?:--\[([^\]]+)\]\s*=>\s*(\d{1,2}:\d{2}(?::\d{2})?))?$/mi

        // Keep track of offset.
        let from = this.#from;

        return rawLines.map(
            (line) => {
                const clock = line.match(clockRe);
                const startTime = this.#parseDate(clock?.[1]);
                let result: LogbookLine|undefined = undefined;

                if (startTime !== undefined && clock) {
                    const endTime = this.#parseDate(clock[2]);
                    const duration = this.#parseDuration(clock[3]);

                    result = new LogbookLine(
                        startTime,
                        endTime,
                        duration,
                        from,
                        from + line.length,
                    );
                }

                from += line.length + 1;

                return result;
            }
        ).filter(l => l !== null && l !== undefined);
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

        const hours = (parts[0] ?? '0').padStart(2, '0');
        const minutes = (parts[1] ?? '0').padStart(2, '0');
        const seconds = (parts[2] ?? '0').padStart(2, '0');

        return moment.duration(`${hours}:${minutes}:${seconds}`);
    }

    getLines(): LogbookLine[] {
        this.#lines ??= this.#parseLines();

        return this.#lines;
    }

    getTotalDuration(): moment.Duration {
        let totalDuration = moment.duration(0);

        for (const line of this.getLines()) {
            console.log(line.toString());
            totalDuration.add(line.duration);
        }

        return totalDuration;
    }

    hasOpenClock(): boolean {
        return this.getOpenClock() !== undefined;
    }

    getOpenClock(): LogbookLine|undefined{
        return this.getLines().reverse().find(l => l.endTime === undefined);
    }

    toString(): string {
        return [
            ":LOGBOOK:",
            ...this.getLines().map(l => l.toString()),
            ":END:"
        ].join("\n");
    }
}