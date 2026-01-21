import LogbookParser from "logbook/logbook_parser";
import { NodeArrayParseAdapter } from "logbook/parse_adapter";
import { LogbookPluginInterface } from "main";
import { MarkdownPostProcessor, MarkdownPostProcessorContext, moment } from "obsidian";
import { formatLogbookDuration } from "utils";

export function markdownPostProcessor(
    plugin: LogbookPluginInterface
): MarkdownPostProcessor {
    const parser = new LogbookParser(moment);

    function nodeFilter(node: Node): number {
        // Don't interact text within a code element.
        if (node?.parentElement?.nodeName == 'CODE') {
            return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
    }

    function evictNodes(nodeList: Node[]): void {
        for (const node of nodeList) {
            // Remove the preceeding break, if present.
            const sibling = node.previousSibling;
            if (sibling?.nodeName == 'BR') {
                sibling.parentElement?.removeChild(sibling);
            }

            node.parentElement?.removeChild(node);
        }
        return;
    }

    return async (el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> => {
        // Skip if hiding logbooks is disabled.
        if (!plugin.settings.hideLogbooksInReadMode) {
            return;
        }

        const nodeIter = document.createNodeIterator(el, NodeFilter.SHOW_TEXT, nodeFilter);

        // Regex to look for logbook start/end
        const logbookStartRe = /^:LOGBOOK:$/g
        const clockRe = /^CLOCK: /g
        const logbookEndRe = /^:END:$/g
        let inBook = false;

        // Keep a list of nodes that are part of a logbook to be removed.
        let evictList: Node[] = [];

        // Iterate though all nodes.
        for (let node = nodeIter.nextNode(); node !== null; node = nodeIter.nextNode()) {
            if (node.nodeType == Node.TEXT_NODE) {
                const content = node.textContent?.trim();

                // Look for start of logbook.
                if (content?.match(logbookStartRe) !== null) {
                    inBook = true
                    evictList = [];
                    evictList.push(node);
                } else if (inBook && content?.match(logbookEndRe) !== null) { // Look for end of logbook.
                    inBook = false;
                    evictList.push(node);

                    // Parse the collected nodes as a logbook.
                    const parseAdapter = new NodeArrayParseAdapter(evictList);
                    const book = parser.parse(parseAdapter);

                    // Get the current time spent.
                    const duration = book?.getTotalDuration();

                    if (duration && evictList[0] && node.parentElement instanceof HTMLElement) {
                        const timer = node.parentElement.createEl('div', {
                            cls: [
                                'logbook-time',
                                plugin.settings.timeWidgetPosition == 'right'
                                    ?  'logbook-time-right'
                                    : '',
                            ],
                            text: formatLogbookDuration(duration),
                            prepend: true,
                            parent: evictList[0]
                        });

                        // Move the element to just before the logbook.
                        if (evictList[0].previousSibling) {
                            evictList[0].parentNode?.insertBefore(timer, evictList[0].previousSibling);
                        }
                    }

                    evictNodes(evictList);
                } else if (inBook && content?.match(clockRe) !== null) { // Ensure each line within the book is a CLOCK.
                    evictList.push(node);
                } else { // If no prior condition matches, then assume we're not in a book.
                    inBook = false;
                }
            }
        }

        return;
    }
}