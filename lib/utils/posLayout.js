/**
 * Viewport + flex shell utilities for one-page POS layouts.
 * Ensures header/footer stay pinned and only the middle pane scrolls.
 */

/**
 * @param {boolean} isFullscreen
 * @param {'terminal'|'cart'|'products'} [pane]
 */
export function getPosShellHeightClass(isFullscreen, pane = 'terminal') {
    if (isFullscreen) {
        return pane === 'terminal' ? 'h-screen max-h-screen' : 'h-full min-h-0';
    }
    // Hub chrome: top nav + tab bar (~8rem). Cap on very tall displays for readability.
    return pane === 'terminal'
        ? 'h-[calc(100dvh-8rem)] min-h-[480px] max-h-[calc(100dvh-4rem)]'
        : 'h-full min-h-0';
}

export const POS_SCROLL_MIDDLE =
    'flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin';

export const POS_SHELL_HEADER = 'shrink-0 z-10';

export const POS_SHELL_FOOTER =
    'shrink-0 z-10 border-t bg-inherit shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.35)]';
