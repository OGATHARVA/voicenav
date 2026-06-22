import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/* ── Language options ────────────────────────────────────────────── */
// eslint-disable-next-line react-refresh/only-export-components
export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', native: 'English', bcp47: 'en-US', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi',   native: 'हिंदी',   bcp47: 'hi-IN', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', native: 'मराठी',   bcp47: 'mr-IN', flag: '🇮🇳' },
];

/* ── Defaults ──────────────────────────────────────────────────────── */
const DEFAULTS = {
  fontSize:        'base',   // 'sm' | 'base' | 'lg' | 'xl' | '2xl'
  highContrast:    false,
  reducedMotion:   false,
  textSpacing:     false,
  underlineLinks:  false,
  focusIndicators: 'default', // 'default' | 'enhanced' | 'high'
  language:        'en',      // 'en' | 'hi' | 'mr'
};

const FONT_SIZE_MAP = {
  sm:  '14px',
  base:'16px',
  lg:  '18px',
  xl:  '20px',
  '2xl': '23px',
};

const AccessibilityContext = createContext(null);

export function AccessibilityProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('tycs-a11y');
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
    } catch { return DEFAULTS; }
  });

  /* Synchronize settings from chrome.storage.local if running as extension */
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('tycs-a11y', (result) => {
        if (result && result['tycs-a11y']) {
          setSettings(result['tycs-a11y']);
        }
      });
    }
  }, []);

  /* Persist settings to localStorage and chrome.storage.local */
  useEffect(() => {
    try {
      localStorage.setItem('tycs-a11y', JSON.stringify(settings));
    } catch { /* ignore */ }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ 'tycs-a11y': settings });
    }

    // Send accessibility settings update to the active browser tab
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'APPLY_A11Y',
            settings
          }).catch(err => {
            // Content script might not be injected in special chrome:// pages or during load
          });
        }
      });
    }
  }, [settings]);

  /* Apply classes/styles to <html> element */
  useEffect(() => {
    const root = document.documentElement;

    /* Font size */
    root.style.setProperty('--a11y-font-size', FONT_SIZE_MAP[settings.fontSize]);
    root.style.fontSize = FONT_SIZE_MAP[settings.fontSize];

    /* High contrast */
    root.classList.toggle('hc-mode', settings.highContrast);

    /* Reduced motion */
    root.classList.toggle('reduce-motion', settings.reducedMotion);

    /* Text spacing (WCAG 1.4.12) */
    root.classList.toggle('text-spacing', settings.textSpacing);

    /* Underline links */
    root.classList.toggle('underline-links', settings.underlineLinks);

    /* Enhanced focus */
    root.dataset.focus = settings.focusIndicators;
  }, [settings]);

  const update = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULTS), []);

  return (
    <AccessibilityContext.Provider value={{ settings, update, reset, FONT_SIZE_MAP }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used inside AccessibilityProvider');
  return ctx;
}
