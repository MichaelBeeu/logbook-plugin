// eslint-disable-next-line no-restricted-imports
import * as Moment from 'moment';
import { formatLogbookDuration } from 'utils';

export class LogbookLine {
    #startTime: Moment.Moment;
    #endTime?: Moment.Moment;
    #duration?: Moment.Duration;
    #from?: number;
    #to?: number;

    constructor(
        startTime: Moment.Moment,
        endTime?: Moment.Moment,
        duration?: Moment.Duration,
        from?: number,
        to?: number,
    ) {
        this.#startTime = startTime;
        this.#endTime = endTime;
        this.#duration = duration;
        this.#from = from;
        this.#to = to;
    }

    set duration(value: Moment.Duration|undefined) {
        this.#duration = value;
    }

    get duration(): Moment.Duration|undefined {
        return this.#duration;
    }

    set startTime(value: Moment.Moment) {
        this.#startTime = value;
    }

    get startTime(): Moment.Moment {
        return this.#startTime;
    }

    set endTime(value: Moment.Moment) {
        this.#endTime = value;
    }

    get endTime(): Moment.Moment|undefined {
        return this.#endTime;
    }

    set from(value: number) {
        this.#from = value;
    }

    get from(): number|undefined {
        return this.#from;
    }

    set to(value: number) {
        this.#to = value;
    }

    get to(): number|undefined {
        return this.#to;
    }

    toString(indentation?: number): string {
        let secondHalf = '';
        if (this.#endTime !== undefined) {
            const duration = formatLogbookDuration(this.duration);

            secondHalf = `--[${this.#endTime.format('YYYY-MM-DD ddd HH:mm:ss')}] => ${duration}`;
        }
        
        const indent = "\t".repeat(indentation ?? 0);

        return `${indent}CLOCK: [${this.#startTime.format('YYYY-MM-DD ddd HH:mm:ss')}]${secondHalf}`;
    }
}

export class Logbook {
    #lines: LogbookLine[];
    #from: number;
    #to: number;
    #moment: typeof Moment;

    get lines(): LogbookLine[] {
        return this.#lines;
    }

    set from(value: number) {
        this.#from = value;
    }

    get from(): number {
        return this.#from;
    }

    set to(value: number) {
        this.#to = value;
    }

    get to(): number {
        return this.#to;
    }

    constructor(
        moment: typeof Moment,
        from: number = 0,
        to: number = 0,
        lines: LogbookLine[] = [],
    ) {
        this.#moment = moment;
        this.#from = from;
        this.#to = to;
        this.#lines = lines;
    }

    addLine(line: LogbookLine): this {
        this.#lines.push(line);
        return this;
    }

    eq(other: Logbook): boolean {
        return this.lines == other.lines;
    }

    getTotalDuration(calculateIncomplete: boolean = false): Moment.Duration {
        let result = this.lines.reduce(
            (total, line) => {
                return total.add(this.#ensureLineComplete(line).duration ?? this.#moment.duration(0));
            },
            this.#moment.duration(0)
        );

        if (calculateIncomplete) {
            // Look for an open clock. This would not be included in the previous
            // calculation because it lacks an endTime.
            const openClock = this.getOpenClock();
            if (openClock) {
                const now = this.#moment();
                result.add(this.#moment.duration(now.diff(openClock.startTime)));
            }
        }

        return result;
    }

    hasOpenClock(): boolean {
        return this.getOpenClock() !== undefined;
    }

    getOpenClock(): LogbookLine|undefined{
        return this.lines.find(l => l.endTime === undefined);
    }

    #ensureLineComplete(line: LogbookLine): LogbookLine {
        // Clone the line.
        const result: LogbookLine = new LogbookLine(
            line.startTime,
            line.endTime,
            line.duration,
            line.from,
            line.to
        );

        if (result.duration === undefined && result.endTime !== undefined) {
            result.duration = this.#moment.duration(result.endTime.diff(result.startTime));
        }

        return result;
    }

    toString(indentation?: number): string {
        indentation = (indentation ?? 0) + 1;
        const indent = "\t".repeat(indentation);
        
        return [
            `${indent}:LOGBOOK:`,
            ...this.lines.map(l => this.#ensureLineComplete(l).toString(indentation)),
            `${indent}:END:`
        ].join("\n");
    }
}