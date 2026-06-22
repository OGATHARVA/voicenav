import { domExecutor } from './utils/domExecutor';

console.log('[Voice Navigation] Content script loaded.');

// Create stylesheet for Accessibility Modes on the webpage
const styleEl = document.createElement('style');
styleEl.id = 'voice-nav-a11y-styles';
styleEl.textContent = `
  /* High Contrast Mode */
  html.hc-mode {
    filter: contrast(1.8) !important;
    background-color: #000 !important;
    color: #fff !important;
  }
  html.hc-mode * {
    background-color: #000 !important;
    color: #fff !important;
    border-color: #fff !important;
  }
  html.hc-mode img, html.hc-mode video {
    filter: contrast(0.6) !important;
  }

  /* Reduce Motion Mode */
  html.reduce-motion *,
  html.reduce-motion *::before,
  html.reduce-motion *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Text Spacing Mode */
  html.text-spacing {
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
    line-height: 1.8 !important;
  }
  html.text-spacing p,
  html.text-spacing li,
  html.text-spacing label,
  html.text-spacing span,
  html.text-spacing div,
  html.text-spacing a {
    line-height: 2 !important;
  }

  /* Underline Links Mode */
  html.underline-links a {
    text-decoration: underline !important;
    text-underline-offset: 3px !important;
  }
`;
document.documentElement.appendChild(styleEl);

// Map font sizes to CSS px values
const FONT_SIZE_MAP = {
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '20px',
  '2xl': '23px',
};

// Listen for messages from extension popup/side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VOICE_ACTION') {
    console.log('[Voice Navigation] Executing action in active tab:', message.command);
    let success = false;
    if (message.command.action === 'SCROLL') {
      const dir = message.command.target;
      try {
        if (dir === 'down')   window.scrollBy({ top:  400, behavior: 'smooth' });
        else if (dir === 'up')     window.scrollBy({ top: -400, behavior: 'smooth' });
        else if (dir === 'top')    window.scrollTo({ top:    0, behavior: 'smooth' });
        else if (dir === 'bottom') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        success = true;
      } catch (err) {
        console.error('Scroll failed:', err);
      }
    } else {
      success = domExecutor.executeCommand(message.command);
    }
    sendResponse({ success });
  } else if (message.type === 'GET_PAGE_TEXT') {
    console.log('[Voice Navigation] Fetching readable text from active tab...');
    const clone = (document.getElementById('main-content') || document.querySelector('main') || document.body).cloneNode(true);
    clone.querySelectorAll('script, style, iframe, noscript, [aria-hidden="true"], nav, footer, .sr-only').forEach(el => el.remove());
    const text = clone.textContent ? clone.textContent.replace(/\s+/g, ' ').trim() : '';
    sendResponse({ text });
  } else if (message.type === 'APPLY_A11Y') {
    console.log('[Voice Navigation] Applying accessibility styles in active tab:', message.settings);
    const { settings } = message;
    const root = document.documentElement;

    // Apply font size
    if (settings.fontSize && FONT_SIZE_MAP[settings.fontSize]) {
      root.style.fontSize = FONT_SIZE_MAP[settings.fontSize];
    }

    // Toggle accessibility classes
    root.classList.toggle('hc-mode', !!settings.highContrast);
    root.classList.toggle('reduce-motion', !!settings.reducedMotion);
    root.classList.toggle('text-spacing', !!settings.textSpacing);
    root.classList.toggle('underline-links', !!settings.underlineLinks);

    sendResponse({ success: true });
  }
  return true;
});
