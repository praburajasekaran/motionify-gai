import DOMPurify from 'isomorphic-dompurify';

const TIPTAP_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    // Block
    'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'code',
    // Lists
    'ul', 'ol', 'li',
    // Inline
    'strong', 'em', 'u', 's', 'sub', 'sup',
    'a', 'mark', 'span',
    // Table
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // Media
    'img',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel',
    'src', 'alt', 'title', 'width', 'height',
    'class',
    'colspan', 'rowspan',
    'data-type',
    'start',
  ],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'svg', 'math', 'style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  ALLOW_DATA_ATTR: true,
};

// Sanitize link hrefs to prevent javascript: URI XSS
DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
  if (node.tagName === 'A') {
    const href = node.getAttribute('href') || '';
    if (
      !/^https?:\/\//i.test(href) &&
      !href.startsWith('/') &&
      !href.startsWith('#') &&
      !href.startsWith('mailto:')
    ) {
      node.removeAttribute('href');
    }
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, TIPTAP_CONFIG);
}
