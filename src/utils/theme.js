/**
 * Theme utility functions for managing application theme
 */

/**
 * Initialize theme from localStorage or system preference
 */
export function initializeTheme() {
  // Get saved theme from localStorage
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem('theme');
    console.log("Saved theme:", savedTheme);
  } catch (error) {
    console.warn('localStorage not available for theme, using system preference:', error);
  }
  
  // Apply the saved theme or use system preference as fallback
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (savedTheme === 'high-contrast') {
    document.documentElement.setAttribute('data-theme', 'high-contrast');
  } else if (savedTheme === 'deuteranopia-protanopia-friendly') {
    document.documentElement.setAttribute('data-theme', 'deuteranopia-protanopia-friendly');
  } else if (savedTheme === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    applySystemTheme();
  }

  // Add listener for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', handleSystemThemeChange);
}

/**
 * Apply system theme preference
 */
function applySystemTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

/**
 * Handle system theme change events
 * @param {MediaQueryListEvent} e - Media query change event
 */
function handleSystemThemeChange(e) {
  // Only update if user is using system theme (no theme in localStorage)
  let hasThemeInStorage = false;
  try {
    hasThemeInStorage = !!localStorage.getItem('theme');
  } catch (error) {
    console.warn('localStorage not available for theme check:', error);
  }
  
  if (!hasThemeInStorage) {
    if (e.matches) {
      // System switched to dark mode
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      // System switched to light mode
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }
}

/**
 * Set theme and save preference to localStorage
 * @param {string} theme - Theme name ('light', 'dark', 'high-contrast', 'colorblind-friendly', or 'system')
 */
export function setTheme(theme) {
  console.log("Setting theme to:", theme);
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    try {
      localStorage.setItem('theme', 'dark');
    } catch (error) {
      console.warn('Unable to save theme to localStorage:', error);
    }
  }
  else if (theme === 'high-contrast') {
    document.documentElement.setAttribute('data-theme', 'high-contrast');
    try {
      localStorage.setItem('theme', 'high-contrast');
    } catch (error) {
      console.warn('Unable to save theme to localStorage:', error);
    }
  }
  else if (theme === 'deuteranopia-protanopia-friendly') {
    document.documentElement.setAttribute('data-theme', 'deuteranopia-protanopia-friendly');
    try {
      localStorage.setItem('theme', 'deuteranopia-protanopia-friendly');
    } catch (error) {
      console.warn('Unable to save theme to localStorage:', error);
    }
  }
  else if (theme === 'light') {
    document.documentElement.removeAttribute('data-theme');
    try {
      localStorage.setItem('theme', 'light');
    } catch (error) {
      console.warn('Unable to save theme to localStorage:', error);
    }
  }
  else if (theme === 'system') {
    // Remove the localStorage item first so handleSystemThemeChange will work
    try {
      localStorage.removeItem('theme');
    } catch (error) {
      console.warn('Unable to remove theme from localStorage:', error);
    }
    // Apply current system theme
    applySystemTheme();
  }
  else {
    console.warn('Unknown theme:', theme);
  }
}