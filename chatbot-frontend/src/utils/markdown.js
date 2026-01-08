import { marked } from 'marked';
import { sanitizeHtml } from './constants';

// Configure marked options
marked.setOptions({ breaks: true, gfm: true });

// Utility function to render markdown
export function renderMarkdown(text) {
    try {
        return sanitizeHtml(marked.parse(text));
    } catch (error) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
