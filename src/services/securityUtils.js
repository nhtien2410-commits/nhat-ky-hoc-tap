/**
 * Security & Sanitization Utilities
 * Prevents Cross-Site Scripting (XSS) and enforces character boundaries.
 */

export const MAX_LENGTHS = {
  TITLE: 200,
  DESCRIPTION: 1000,
  COMMENT: 1000,
  TAG: 30,
  GROUP_NAME: 80,
  GROUP_DESC: 250
};

/**
 * Escape HTML special characters to prevent stored/reflected XSS attacks
 */
export function sanitizeText(input, maxLength = null) {
  if (input === null || input === undefined) return '';
  let str = String(input);

  // Enforce max length constraint
  if (typeof maxLength === 'number' && maxLength > 0) {
    str = str.slice(0, maxLength);
  }

  // Escape HTML entities
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Clean plain text for UI preview without executing scripts
 */
export function cleanPlainText(input, maxLength = null) {
  if (input === null || input === undefined) return '';
  let str = String(input).trim();
  if (typeof maxLength === 'number' && maxLength > 0 && str.length > maxLength) {
    return str.slice(0, maxLength);
  }
  return str;
}
