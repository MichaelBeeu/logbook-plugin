import { LogbookLine } from "logbook/logbook";
// eslint-disable-next-line no-restricted-imports
import * as moment from 'moment';

export interface LogbookTest {
    content: string;
    numLogbooks: number;
    entries?: LogbookLine[][],
};

export const Logbooks = [
    {
        content: "",
        numLogbooks: 0,
    },
    {
        content: "This is a test",
        numLogbooks: 0,
    },
    {
        content: `Lorem ipsum dolor sit amet
  :LOGBOOK:
  CLOCK: [2026-01-01 Thu 00:00:00]--[2026-01-01 Thu 23:59:59] => 23:59:59
  :END:`,
        numLogbooks: 1,
        entries: [
            [
                new LogbookLine( moment('2026-01-01T00:00:00'), moment('2026-01-01T23:59:59'), moment.duration('23:59:59')),
            ],
        ],
    },
    {
        content: `Lorem ipsum dolor sit amet
  :LOGBOOK:
  CLOCK: [2026-01-01 Thu 00:00:00]--[2026-01-01 Thu 23:59:59] => 23:59:59
  :END:
foo bar baz
\`\`\`
  :LOGBOOK:
  CLOCK: [2026-01-01 Thu 00:00:00]--[2026-01-01 Thu 23:59:59] => 23:59:59
  :END:
\`\`\`
asdf
`,
        numLogbooks: 1,
        entries: [
            [
                new LogbookLine( moment('2026-01-01T00:00:00'), moment('2026-01-01T23:59:59'), moment.duration('23:59:59')),
            ],
        ],
    },
    {
        content: `Lorem ipsum dolor sit amet
  :LOGBOOK:
  CLOCK: [2026-01-01 Thu 00:00:00]--[2026-01-01 Thu 23:59:59] => 23:59:59
  :END:
foo bar baz
\`\`\`
  :LOGBOOK:
  CLOCK: [2026-01-01 Thu 00:00:00]--[2026-01-01 Thu 23:59:59] => 23:59:59
  :END:
\`\`\`
asdf
  :LOGBOOK:
  CLOCK: [2026-01-01 Thu 00:00:00]--[2026-01-01 Thu 23:59:59] => 23:59:59
  :END:
`,
        numLogbooks: 2,
        entries: [
            [
                new LogbookLine( moment('2026-01-01T00:00:00'), moment('2026-01-01T23:59:59'), moment.duration('23:59:59')),
            ],
            [
                new LogbookLine( moment('2026-01-01T00:00:00'), moment('2026-01-01T23:59:59'), moment.duration('23:59:59')),
            ],
        ],
    },
    {
        content: `Lorem ipsum dolor sit amet
  :LOGBOOK:
  CLOCK: [2026-01-01 Thu 00:00:00]--[2026-01-01 Thu 23:59:59] => 23:59:59
foo bar baz
\`\`\`
  :LOGBOOK:
  CLOCK: [2026-01-01 Thu 00:00:00]--[2026-01-01 Thu 23:59:59] => 23:59:59
  :END:
\`\`\`
asdf
  :LOGBOOK:
  CLOCK: [2026-01-01 Thu 00:00:00]--[2026-01-01 Thu 23:59:59] => 23:59:59
  :END:
`,
        numLogbooks: 1,
        entries: [
            [
                new LogbookLine( moment('2026-01-01T00:00:00'), moment('2026-01-01T23:59:59'), moment.duration('23:59:59')),
            ],
            [
                new LogbookLine( moment('2026-01-01T00:00:00'), moment('2026-01-01T23:59:59'), moment.duration('23:59:59')),
            ],
        ],
    },
] satisfies LogbookTest[];