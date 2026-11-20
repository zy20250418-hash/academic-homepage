const themeToggle = document.querySelector('.theme-toggle');
const themePreference = window.matchMedia('(prefers-color-scheme: dark)');
const themeKey = 'academic-homepage-theme';

function readTheme() {
  try {
    const savedTheme = window.localStorage.getItem(themeKey);
    return ['light', 'dark'].includes(savedTheme) ? savedTheme : null;
  } catch {
    return null;
  }
}

function renderTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(dark));
}

let selectedTheme = readTheme();

function applyPreference() {
  renderTheme(selectedTheme ?? (themePreference.matches ? 'dark' : 'light'));
}

applyPreference();
themeToggle.hidden = false;
themePreference.addEventListener('change', applyPreference);

themeToggle.addEventListener('click', () => {
  selectedTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  renderTheme(selectedTheme);
  try {
    window.localStorage.setItem(themeKey, selectedTheme);
  } catch {
    // Theme switching still works for the current page when storage is unavailable.
  }
});
