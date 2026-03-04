/**
 * NIGHTMARE THEME
 * "Code under falling stars"
 * 
 * A premium cinematic cyberpunk experience.
 * Tokyo rooftop at 2AM under a living neon sky.
 * 
 * For full visual experience, companion CSS must be loaded:
 * import './nightmareEffects.css'
 */

export default {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Base tokens
    { token: '', foreground: 'e6f1ff', background: '05060a' },
    
    // Comments - Dimmed neon blue (#5c7cfa)
    { token: 'comment', foreground: '5c7cfa', fontStyle: 'italic' },
    { token: 'comment.line', foreground: '5c7cfa', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '5c7cfa', fontStyle: 'italic' },
    { token: 'comment.doc', foreground: '5c7cfa', fontStyle: 'italic' },

    // Keywords - Neon magenta → pink gradient base (#ff00ff → #ff4dff)
    // Using mid-point for gradient effect
    { token: 'keyword', foreground: 'ff2aff' },
    { token: 'keyword.control', foreground: 'ff2aff' },
    { token: 'keyword.control.conditional', foreground: 'ff2aff' },
    { token: 'keyword.control.loop', foreground: 'ff2aff' },
    { token: 'keyword.control.flow', foreground: 'ff2aff' },
    { token: 'keyword.control.return', foreground: 'ff2aff' },
    { token: 'keyword.control.import', foreground: 'ff2aff' },
    { token: 'keyword.control.export', foreground: 'ff2aff' },
    { token: 'keyword.control.default', foreground: 'ff2aff' },
    { token: 'keyword.other', foreground: 'ff2aff' },
    { token: 'storage', foreground: 'ff2aff' },
    { token: 'storage.modifier', foreground: 'ff2aff' },

    // Types - Electric violet (#9d4edd)
    { token: 'storage.type', foreground: '9d4edd' },
    { token: 'type', foreground: '9d4edd' },
    { token: 'type.identifier', foreground: '9d4edd' },
    { token: 'entity.name.type', foreground: '9d4edd' },
    { token: 'entity.name.class', foreground: '9d4edd' },
    { token: 'support.type', foreground: '9d4edd' },
    { token: 'support.class', foreground: '9d4edd' },

    // Functions - Electric cyan (#00f7ff)
    { token: 'entity.name.function', foreground: '00f7ff' },
    { token: 'support.function', foreground: '00f7ff' },
    { token: 'meta.function-call', foreground: '00f7ff' },

    // Strings - Toxic neon green (#00ff85)
    { token: 'string', foreground: '00ff85' },
    { token: 'string.quoted', foreground: '00ff85' },
    { token: 'string.template', foreground: '00ff85' },
    { token: 'string.escape', foreground: '00f7ff' },
    { token: 'string.regexp', foreground: '00ff85' },

    // Numbers - Neon orange (#ffae00)
    { token: 'constant.numeric', foreground: 'ffae00' },
    { token: 'constant.language', foreground: 'ffae00' },
    { token: 'constant.character', foreground: 'ffae00' },
    { token: 'keyword.constant', foreground: 'ffae00' },

    // Operators - Soft white (#f0f4ff)
    { token: 'keyword.operator', foreground: 'f0f4ff' },
    { token: 'punctuation', foreground: 'f0f4ff' },
    { token: 'delimiter', foreground: 'f0f4ff' },
    { token: 'delimiter.bracket', foreground: 'f0f4ff' },
    { token: 'meta.brace', foreground: 'f0f4ff' },

    // Variables - Cool white (#e6f1ff)
    { token: 'variable', foreground: 'e6f1ff' },
    { token: 'variable.parameter', foreground: 'e6f1ff' },
    { token: 'variable.other', foreground: 'e6f1ff' },
    { token: 'entity.name.variable', foreground: 'e6f1ff' },

    // HTML/JSX Tags
    { token: 'entity.name.tag', foreground: '00f7ff' },
    { token: 'entity.other.attribute-name', foreground: 'ff2aff' },

    // Special
    { token: 'invalid', foreground: 'ff5b86', fontStyle: 'underline' },
    { token: 'invalid.deprecated', foreground: 'ff5b86', fontStyle: 'strikethrough' },
    { token: 'markup.bold', foreground: 'ffae00', fontStyle: 'bold' },
    { token: 'markup.italic', foreground: 'e6f1ff', fontStyle: 'italic' },
    { token: 'markup.heading', foreground: '00f7ff', fontStyle: 'bold' },
  ],
  colors: {
    // Editor base
    'editor.foreground': '#e6f1ff',
    'editor.background': '#05060a',
    
    // Selection - Translucent violet glass
    'editor.selectionBackground': '#9d4edd33',
    'editor.inactiveSelectionBackground': '#9d4edd1a',
    'editor.selectionHighlightBackground': '#9d4edd26',
    
    // Active line - Subtle purple glass glow
    'editor.lineHighlightBackground': '#1a0a2e26',
    'editor.lineHighlightBorder': '#00000000',
    
    // Cursor - Neon cyan (pulse animation in CSS)
    'editorCursor.foreground': '#00f7ff',
    'editorCursor.background': '#05060a',
    
    // Find matches
    'editor.findMatchBackground': '#ff2aff66',
    'editor.findMatchHighlightBackground': '#ff2aff33',
    'editor.findRangeHighlightBackground': '#00f7ff22',
    
    // Word highlights
    'editor.wordHighlightBackground': '#00f7ff2a',
    'editor.wordHighlightStrongBackground': '#00f7ff40',
    
    // Line numbers
    'editorLineNumber.foreground': '#4a5679',
    'editorLineNumber.activeForeground': '#00f7ff',
    
    // Whitespace
    'editorWhitespace.foreground': '#1a2138',
    
    // Indent guides
    'editorIndentGuide.background': '#1a213826',
    'editorIndentGuide.activeBackground': '#00f7ff40',
    
    // Brackets
    'editorBracketMatch.background': '#00f7ff1a',
    'editorBracketMatch.border': '#00f7ff',
    
    // Gutter
    'editorGutter.background': '#05060a',
    'editorGutter.modifiedBackground': '#00f7ff',
    'editorGutter.addedBackground': '#00ff85',
    'editorGutter.deletedBackground': '#ff5b86',
    
    // Scrollbar
    'scrollbarSlider.background': '#9d4edd33',
    'scrollbarSlider.hoverBackground': '#9d4edd55',
    'scrollbarSlider.activeBackground': '#9d4edd77',
    
    // Overview ruler
    'editorOverviewRuler.border': '#00000000',
    'editorOverviewRuler.errorForeground': '#ff5b86',
    'editorOverviewRuler.warningForeground': '#ffae00',
    
    // Minimap
    'minimap.selectionHighlight': '#9d4edd66',
    'minimap.findMatchHighlight': '#ff2aff55',
    
    // Widget (autocomplete, hover, etc.)
    'editorWidget.background': '#0a0b1580',
    'editorWidget.border': '#ff2aff66',
    'editorWidget.foreground': '#e6f1ff',
    'editorSuggestWidget.background': '#0a0b1599',
    'editorSuggestWidget.border': '#ff2aff66',
    'editorSuggestWidget.selectedBackground': '#9d4edd33',
    'editorHoverWidget.background': '#0a0b1599',
    'editorHoverWidget.border': '#00f7ff66',
  },
};
