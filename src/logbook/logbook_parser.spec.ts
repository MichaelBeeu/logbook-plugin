// eslint-disable-next-line no-restricted-imports
import * as Moment from 'moment';
import { StringParseAdapter } from 'logbook/parse_adapter';
import LogbookParser from 'logbook/logbook_parser';
import { Logbooks, type LogbookTest } from 'test/data';
import { Logbook } from './logbook';

describe('test logbook parser', () => {

    let parser: LogbookParser|null = null;

    beforeEach(() => {
        parser = new LogbookParser(Moment);
    });

    test.each(Logbooks)("correct number of logbooks parsed",
        (testCase: LogbookTest) => {
            const parseAdapter = new StringParseAdapter(testCase.content);

            const books = parser?.parseAll(parseAdapter);

            expect(books?.length).toBe(testCase.numLogbooks);
        }
    )

    test.each(Logbooks)("correct lines parsed",
        (testCase: LogbookTest) => {
            const parseAdapter = new StringParseAdapter(testCase.content);

            const books = parser?.parseAll(parseAdapter);

            for (const [idx, book] of Object.entries(books!) as [keyof LogbookTest['entries'], Logbook][]) {
                const expected = testCase.entries?.[idx] ?? null;

                if (!expected) {
                    continue;
                }

                expect(book.lines).toEqual(expected);
            }
        }
    )
});