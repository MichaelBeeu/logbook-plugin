import { moment } from 'obsidian';
import { formatLogbookDuration } from 'utils';

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

        this.#duration ??= moment.duration(this.#endTime.diff(this.#startTime));

        return this.#duration;
    }

    set startTime(value: moment.Moment) {
        this.#startTime = value;
    }

    get startTime(): moment.Moment {
        return this.#startTime;
    }

    set endTime(value: moment.Moment) {
        this.#endTime = value;
    }

    get endTime(): moment.Moment|undefined {
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

    toString(): string {
        let secondHalf = '';
        if (this.#endTime !== undefined) {
            // const totalTime = this.duration?.asMilliseconds() ?? 0;

            const duration = formatLogbookDuration(this.duration);

            secondHalf = `--[${this.#endTime.format('YYYY-MM-DD ddd HH:mm:ss')}] => ${duration}`;
        }
        return `CLOCK: [${this.#startTime.format('YYYY-MM-DD ddd HH:mm:ss')}]${secondHalf}`;
    }
}

export class Logbook {
    #lines: LogbookLine[];
    #from: number;
    #to: number;

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
        from: number = 0,
        to: number = 0,
        lines: LogbookLine[] = []
    ) {
        this.#from = from;
        this.#to = to;
        this.#lines = lines;
    }

    addLine(line: LogbookLine): this {
        this.#lines.push(line);
        // console.log("adding line", this.#lines);
        return this;
    }

    eq(other: Logbook): boolean {
        return this.lines == other.lines;
    }

    getTotalDuration(): moment.Duration {
        return this.lines.reduce(
            (total, line) => {
                return total.add(line.duration);
            },
            moment.duration(0)
        );
        // let totalDuration = moment.duration(0);

        // for (const line of this.lines) {
        //     totalDuration.add(line.duration);
        // }

        // return totalDuration;
    }

    hasOpenClock(): boolean {
        return this.getOpenClock() !== undefined;
    }

    getOpenClock(): LogbookLine|undefined{
        return this.lines.find(l => l.endTime === undefined);
    }

    toString(): string {
        return [
            ":LOGBOOK:",
            ...this.lines.map(l => l.toString()),
            ":END:"
        ].join("\n");
    }
}