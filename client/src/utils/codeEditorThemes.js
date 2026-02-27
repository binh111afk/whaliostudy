export const CODE_EDITOR_THEME_STORAGE_KEY = 'whalio.code-editor-theme';
export const DEFAULT_DARK_THEME_KEY = 'one-dark-pro';
export const DEFAULT_LIGHT_THEME_KEY = 'light-plus';
const LEGACY_DARK_THEME_VALUE = 'dark';
const LEGACY_LIGHT_THEME_VALUE = 'light';

const themeRegistry = [
  {
    key: 'light-plus',
    label: 'Light Plus',
    monacoTheme: 'whalio-light-plus',
    isDark: false,
    terminal: {
      panelBackground: '#f8fafc',
      headerBackground: '#eef2ff',
      bodyBackground: '#ffffff',
      border: '#cbd5e1',
      text: '#1e293b',
      mutedText: '#475569',
    },
  },
  {
    key: 'dracula',
    label: 'Dracula',
    monacoTheme: 'whalio-dracula',
    isDark: true,
    terminal: {
      panelBackground: '#1f2029',
      headerBackground: '#2c2f3f',
      bodyBackground: '#171821',
      border: '#44475a',
      text: '#f8f8f2',
      mutedText: '#bd93f9',
    },
  },
  {
    key: 'monokai',
    label: 'Monokai',
    monacoTheme: 'whalio-monokai',
    isDark: true,
    terminal: {
      panelBackground: '#1f1f1f',
      headerBackground: '#2d2d2d',
      bodyBackground: '#151515',
      border: '#4f4f4f',
      text: '#f8f8f2',
      mutedText: '#ffd866',
    },
  },
  {
    key: 'night-owl',
    label: 'Night Owl',
    monacoTheme: 'whalio-night-owl',
    isDark: true,
    terminal: {
      panelBackground: '#111b27',
      headerBackground: '#172332',
      bodyBackground: '#0b1724',
      border: '#29445d',
      text: '#d6deeb',
      mutedText: '#82aaff',
    },
  },
  {
    key: 'one-dark-pro',
    label: 'One Dark Pro',
    monacoTheme: 'whalio-one-dark-pro',
    isDark: true,
    terminal: {
      panelBackground: '#1f2430',
      headerBackground: '#252b39',
      bodyBackground: '#171b24',
      border: '#3c4458',
      text: '#abb2bf',
      mutedText: '#61afef',
    },
  },
  {
    key: 'synthwave-84',
    label: "SynthWave '84",
    monacoTheme: 'whalio-synthwave-84',
    isDark: true,
    hasNeonGlow: true,
    terminal: {
      panelBackground: '#251447',
      headerBackground: '#2f1858',
      bodyBackground: '#1d1035',
      border: '#6a3bbd',
      text: '#f6ecff',
      mutedText: '#f97e72',
    },
  },
];

const themeByKey = new Map(themeRegistry.map((theme) => [theme.key, theme]));
const definedThemeKeys = new Set();

const themeDefinitionLoaders = {
  'light-plus': () => import('../monacoThemes/lightPlus.js'),
  dracula: () => import('../monacoThemes/dracula.js'),
  monokai: () => import('../monacoThemes/monokai.js'),
  'night-owl': () => import('../monacoThemes/nightOwl.js'),
  'one-dark-pro': () => import('../monacoThemes/oneDarkPro.js'),
  'synthwave-84': () => import('../monacoThemes/synthwave84.js'),
};

export const CODE_EDITOR_THEME_OPTIONS = themeRegistry;

export const getCodeEditorThemeConfig = (themeKey) => {
  return themeByKey.get(String(themeKey || '')) || themeByKey.get(DEFAULT_DARK_THEME_KEY);
};

export const resolveInitialCodeEditorTheme = (rawValue) => {
  const normalizedValue = String(rawValue || '').trim();
  if (normalizedValue === LEGACY_DARK_THEME_VALUE) return DEFAULT_DARK_THEME_KEY;
  if (normalizedValue === LEGACY_LIGHT_THEME_VALUE) return DEFAULT_LIGHT_THEME_KEY;
  if (themeByKey.has(normalizedValue)) return normalizedValue;
  return DEFAULT_DARK_THEME_KEY;
};

export const toggleCodeEditorThemeByTone = (themeKey) => {
  const theme = getCodeEditorThemeConfig(themeKey);
  return theme.isDark ? DEFAULT_LIGHT_THEME_KEY : DEFAULT_DARK_THEME_KEY;
};

export const ensureCodeEditorTheme = async (monaco, themeKey) => {
  if (!monaco?.editor) {
    return getCodeEditorThemeConfig(themeKey);
  }

  const resolvedTheme = getCodeEditorThemeConfig(themeKey);
  const loader = themeDefinitionLoaders[resolvedTheme.key];

  if (!definedThemeKeys.has(resolvedTheme.key) && loader) {
    const module = await loader();
    const themeDefinition = module?.default;
    if (themeDefinition) {
      monaco.editor.defineTheme(resolvedTheme.monacoTheme, themeDefinition);
      definedThemeKeys.add(resolvedTheme.key);
    }
  }

  monaco.editor.setTheme(resolvedTheme.monacoTheme);
  return resolvedTheme;
};
