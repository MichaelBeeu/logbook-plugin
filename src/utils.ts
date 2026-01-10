import * as Moment from 'moment';

export type RegExpMatchArrayWithIndices = RegExpMatchArray & { indices: Array<[number, number]> & { groups: { [key: string]: [number, number]}} };

export function formatLogbookDuration(duration: Moment.Duration|undefined): string {
    if (duration === undefined) {
        return '';
    }

    const hours = Math.floor(duration?.asHours() ?? 0).toString().padStart(2, '0');
    const minutes = (Math.floor(duration?.asMinutes() ?? 0) % 60).toString().padStart(2, '0');
    const seconds = (Math.floor(duration?.asSeconds() ?? 0) % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

export function isRangeOverlap(
    fromA: number, toA: number,
    fromB: number, toB: number
): boolean
{
    // Overlap can occur in the following scenarios:
    // - fromA is between fromB and toB.
    //    [---<====]--->
    //    [---<====>---]
    // - toA is between fromB and toB.
    //    <----[===>---]
    //    [----<===>---]
    // - fromA and toA encompass fromB and toB.
    //    <----[===]--->
    // Overlap cannot occur in the following scenarios:
    // - fromB and toB are less than fromA
    //    [---] <--->
    // - fromB and toB are greater than toA
    //    <---> [---]

    // Look for lack of overlap, and invert the result.
    // These conditions should be easier.

    return !(
        (fromB < fromA && toB < fromA)
        || (fromB > toA && toB > toA)
    );
}