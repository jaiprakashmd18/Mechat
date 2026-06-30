import xssFilter from 'xss';

/** Strips dangerous HTML/script content from user-supplied text before persisting it. */
export function xss(input: string): string {
  return xssFilter(input, {
    whiteList: {}, // strip all HTML tags; Markdown rendering happens client-side on sanitized plaintext
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  });
}
