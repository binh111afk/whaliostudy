/**
 * NIGHTMARE THEME v2.0 - ULTRA NEON EDITION
 * "Code under a holographic aurora"
 * 
 * An ULTIMATE cinematic cyberpunk experience.
 * Neo-Tokyo rooftop at 2AM under a holographic aurora storm.
 * Maximum neon saturation. Maximum visual impact.
 * 
 * For full visual experience, companion CSS must be loaded:
 * import './nightmareEffects.css'
 * 
 * Features:
 * - Ultra-saturated neon color palette
 * - Holographic gradient effects
 * - Aurora-inspired color transitions
 * - Maximum glow intensity
 */

export default {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Base tokens - Slightly brighter for better neon contrast
    { token: '', foreground: 'f0f6ff', background: '030408' },
    
    // Comments - Ethereal blue with aurora tint (#6b8cff)
    { token: 'comment', foreground: '6b8cff', fontStyle: 'italic' },
    { token: 'comment.line', foreground: '6b8cff', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '6b8cff', fontStyle: 'italic' },
    { token: 'comment.doc', foreground: '7d9dff', fontStyle: 'italic' },
    { token: 'punctuation.definition.comment', foreground: '5573e8', fontStyle: 'italic' },

    // Keywords - ULTRA HOT MAGENTA (#ff00ff → #ff00aa)
    // Pure neon magenta - maximum saturation
    { token: 'keyword', foreground: 'ff00ff' },
    { token: 'keyword.control', foreground: 'ff10ff' },
    { token: 'keyword.control.conditional', foreground: 'ff00ff' },
    { token: 'keyword.control.loop', foreground: 'ff20ff' },
    { token: 'keyword.control.flow', foreground: 'ff00dd' },
    { token: 'keyword.control.return', foreground: 'ff00ff' },
    { token: 'keyword.control.import', foreground: 'ff30ff' },
    { token: 'keyword.control.export', foreground: 'ff30ff' },
    { token: 'keyword.control.default', foreground: 'ff20ee' },
    { token: 'keyword.control.trycatch', foreground: 'ff00cc' },
    { token: 'keyword.control.new', foreground: 'ff00ff' },
    { token: 'keyword.other', foreground: 'ff10ee' },
    { token: 'storage', foreground: 'ff00ff' },
    { token: 'storage.modifier', foreground: 'dd00ff' },
    { token: 'storage.modifier.async', foreground: 'ff00dd' },

    // Types - ULTRA ELECTRIC VIOLET (#c840ff)
    { token: 'storage.type', foreground: 'c840ff' },
    { token: 'type', foreground: 'c840ff' },
    { token: 'type.identifier', foreground: 'bf50ff' },
    { token: 'entity.name.type', foreground: 'c840ff' },
    { token: 'entity.name.class', foreground: 'd050ff' },
    { token: 'entity.name.interface', foreground: 'b830ff' },
    { token: 'entity.name.enum', foreground: 'aa40ff' },
    { token: 'support.type', foreground: 'c840ff' },
    { token: 'support.class', foreground: 'd050ff' },
    { token: 'support.type.primitive', foreground: 'c850ff' },
    { token: 'entity.other.inherited-class', foreground: 'b060ff' },

    // Functions - HYPER CYAN (#00ffff)
    { token: 'entity.name.function', foreground: '00ffff' },
    { token: 'support.function', foreground: '00f0ff' },
    { token: 'meta.function-call', foreground: '00ffff' },
    { token: 'entity.name.method', foreground: '00e8ff' },
    { token: 'support.function.builtin', foreground: '20ffff' },
    { token: 'support.function.console', foreground: '00ddff' },
    { token: 'support.function.dom', foreground: '00ccff' },
    { token: 'meta.function-call.generic', foreground: '00ffff' },

    // Strings - RADIOACTIVE NEON GREEN (#00ff7f)
    { token: 'string', foreground: '00ff7f' },
    { token: 'string.quoted', foreground: '00ff7f' },
    { token: 'string.quoted.single', foreground: '00ff6f' },
    { token: 'string.quoted.double', foreground: '00ff8f' },
    { token: 'string.template', foreground: '00ff9f' },
    { token: 'string.escape', foreground: '00ffff' },
    { token: 'string.regexp', foreground: '7fff00' },
    { token: 'string.interpolated', foreground: '30ff70' },
    { token: 'constant.character.escape', foreground: '00ffdd' },

    // Numbers - PLASMA ORANGE (#ff9500 → #ffcc00)
    { token: 'constant.numeric', foreground: 'ffaa00' },
    { token: 'constant.numeric.integer', foreground: 'ffbb00' },
    { token: 'constant.numeric.float', foreground: 'ff9900' },
    { token: 'constant.numeric.hex', foreground: 'ffcc00' },
    { token: 'constant.language', foreground: 'ff8800' },
    { token: 'constant.language.boolean', foreground: 'ffaa00' },
    { token: 'constant.language.null', foreground: 'ff7700' },
    { token: 'constant.language.undefined', foreground: 'ff6600' },
    { token: 'constant.character', foreground: 'ffbb00' },
    { token: 'keyword.constant', foreground: 'ffaa00' },

    // Operators - GHOST WHITE with subtle cyan (#f5faff)
    { token: 'keyword.operator', foreground: 'f5faff' },
    { token: 'keyword.operator.assignment', foreground: 'e0f0ff' },
    { token: 'keyword.operator.comparison', foreground: 'f0f8ff' },
    { token: 'keyword.operator.arithmetic', foreground: 'f5faff' },
    { token: 'keyword.operator.logical', foreground: 'ddeeff' },
    { token: 'keyword.operator.spread', foreground: 'ff80ff' },
    { token: 'punctuation', foreground: 'e8f4ff' },
    { token: 'delimiter', foreground: 'e8f4ff' },
    { token: 'delimiter.bracket', foreground: 'e0f0ff' },
    { token: 'meta.brace', foreground: 'e0f0ff' },
    { token: 'meta.brace.round', foreground: 'cce8ff' },
    { token: 'meta.brace.square', foreground: 'bbe0ff' },
    { token: 'meta.brace.curly', foreground: 'aaddff' },

    // Variables - ICY WHITE (#f0f6ff)
    { token: 'variable', foreground: 'f0f6ff' },
    { token: 'variable.parameter', foreground: 'e8f0ff' },
    { token: 'variable.other', foreground: 'f0f6ff' },
    { token: 'variable.other.constant', foreground: 'ffcc00' },
    { token: 'variable.other.property', foreground: 'e0ecff' },
    { token: 'variable.language.this', foreground: 'ff80ff' },
    { token: 'variable.language.super', foreground: 'ff60ff' },
    { token: 'entity.name.variable', foreground: 'f0f6ff' },

    // HTML/JSX Tags - NEON GRADIENT EFFECT
    { token: 'entity.name.tag', foreground: '00ffff' },
    { token: 'entity.name.tag.html', foreground: '00e0ff' },
    { token: 'entity.name.tag.custom', foreground: 'c840ff' },
    { token: 'entity.other.attribute-name', foreground: 'ff00ff' },
    { token: 'entity.other.attribute-name.class', foreground: 'ff40ff' },
    { token: 'entity.other.attribute-name.id', foreground: 'ffaa00' },
    { token: 'punctuation.definition.tag', foreground: '80e0ff' },

    // CSS Specific - RAINBOW NEON
    { token: 'entity.name.tag.css', foreground: '00ffff' },
    { token: 'entity.other.attribute-name.class.css', foreground: '00ff7f' },
    { token: 'entity.other.attribute-name.id.css', foreground: 'ffaa00' },
    { token: 'entity.other.attribute-name.pseudo-class.css', foreground: 'ff00ff' },
    { token: 'entity.other.attribute-name.pseudo-element.css', foreground: 'ff40ff' },
    { token: 'support.type.property-name.css', foreground: '00ffff' },
    { token: 'support.constant.color.css', foreground: 'ffaa00' },
    { token: 'constant.other.color.css', foreground: 'ff00ff' },
    { token: 'keyword.other.unit.css', foreground: '00ff7f' },

    // JSON - STRUCTURED NEON
    { token: 'support.type.property-name.json', foreground: '00ffff' },
    { token: 'string.value.json', foreground: '00ff7f' },

    // Markdown - DOCUMENT GLOW
    { token: 'markup.heading', foreground: '00ffff', fontStyle: 'bold' },
    { token: 'markup.heading.1', foreground: 'ff00ff', fontStyle: 'bold' },
    { token: 'markup.heading.2', foreground: 'c840ff', fontStyle: 'bold' },
    { token: 'markup.heading.3', foreground: '00ffff', fontStyle: 'bold' },
    { token: 'markup.bold', foreground: 'ffaa00', fontStyle: 'bold' },
    { token: 'markup.italic', foreground: 'ff80ff', fontStyle: 'italic' },
    { token: 'markup.underline', foreground: '00ffff', fontStyle: 'underline' },
    { token: 'markup.inline.raw', foreground: '00ff7f' },
    { token: 'markup.quote', foreground: '6b8cff', fontStyle: 'italic' },
    { token: 'markup.list', foreground: 'ffaa00' },
    { token: 'markup.link', foreground: '00ffff' },

    // Special tokens
    { token: 'invalid', foreground: 'ff3366', fontStyle: 'underline' },
    { token: 'invalid.deprecated', foreground: 'ff6688', fontStyle: 'strikethrough' },
    { token: 'meta.decorator', foreground: 'ffaa00' },
    { token: 'punctuation.decorator', foreground: 'ff8800' },
    { token: 'support.other.namespace', foreground: 'c840ff' },
    { token: 'meta.import', foreground: 'ff40ff' },
    { token: 'meta.export', foreground: 'ff40ff' },
  ],
  colors: {
    // Editor base - DEEPER BLACK for maximum neon pop
    'editor.foreground': '#f0f6ff',
    'editor.background': '#030408',
    
    // Selection - GLOWING VIOLET GLASS
    'editor.selectionBackground': '#c840ff40',
    'editor.inactiveSelectionBackground': '#c840ff20',
    'editor.selectionHighlightBackground': '#c840ff30',
    
    // Active line - AURORA GLOW
    'editor.lineHighlightBackground': '#ff00ff08',
    'editor.lineHighlightBorder': '#ff00ff15',
    
    // Cursor - HYPER CYAN with intense glow
    'editorCursor.foreground': '#00ffff',
    'editorCursor.background': '#030408',
    
    // Find matches - HOT MAGENTA
    'editor.findMatchBackground': '#ff00ff55',
    'editor.findMatchHighlightBackground': '#ff00ff35',
    'editor.findRangeHighlightBackground': '#00ffff25',
    
    // Word highlights - CYAN PULSE
    'editor.wordHighlightBackground': '#00ffff30',
    'editor.wordHighlightStrongBackground': '#00ffff50',
    'editor.wordHighlightBorder': '#00ffff40',
    
    // Line numbers - AURORA GRADIENT
    'editorLineNumber.foreground': '#5a6890',
    'editorLineNumber.activeForeground': '#00ffff',
    
    // Whitespace
    'editorWhitespace.foreground': '#1a2540',
    
    // Indent guides - NEON TRACES
    'editorIndentGuide.background': '#1a254030',
    'editorIndentGuide.activeBackground': '#00ffff60',
    
    // Brackets - RAINBOW GLOW
    'editorBracketMatch.background': '#00ffff25',
    'editorBracketMatch.border': '#00ffff',
    'editorBracketHighlight.foreground1': '#ffaa00',
    'editorBracketHighlight.foreground2': '#ff00ff',
    'editorBracketHighlight.foreground3': '#00ffff',
    'editorBracketHighlight.foreground4': '#00ff7f',
    'editorBracketHighlight.foreground5': '#c840ff',
    'editorBracketHighlight.foreground6': '#ff3366',
    
    // Gutter - DEEP SPACE
    'editorGutter.background': '#030408',
    'editorGutter.modifiedBackground': '#00ffff',
    'editorGutter.addedBackground': '#00ff7f',
    'editorGutter.deletedBackground': '#ff3366',
    'editorGutter.commentRangeForeground': '#5a6890',
    
    // Scrollbar - PLASMA TRAIL
    'scrollbarSlider.background': '#ff00ff30',
    'scrollbarSlider.hoverBackground': '#ff00ff50',
    'scrollbarSlider.activeBackground': '#ff00ff70',
    
    // Overview ruler
    'editorOverviewRuler.border': '#00000000',
    'editorOverviewRuler.errorForeground': '#ff3366',
    'editorOverviewRuler.warningForeground': '#ffaa00',
    'editorOverviewRuler.infoForeground': '#00ffff',
    'editorOverviewRuler.modifiedForeground': '#c840ff',
    'editorOverviewRuler.addedForeground': '#00ff7f',
    'editorOverviewRuler.deletedForeground': '#ff3366',
    
    // Minimap - HOLOGRAPHIC PREVIEW
    'minimap.background': '#03040800',
    'minimap.selectionHighlight': '#c840ff80',
    'minimap.findMatchHighlight': '#ff00ff70',
    'minimap.errorHighlight': '#ff336680',
    'minimap.selectionOccurrenceHighlight': '#00ffff60',
    
    // Widget - GLASSMORPHISM SUPREME
    'editorWidget.background': '#0808120e0',
    'editorWidget.border': '#ff00ff80',
    'editorWidget.foreground': '#f0f6ff',
    'editorWidget.resizeBorder': '#00ffff60',
    
    // Suggest widget - NEON DROPDOWN
    'editorSuggestWidget.background': '#080812cc',
    'editorSuggestWidget.border': '#ff00ff60',
    'editorSuggestWidget.foreground': '#f0f6ff',
    'editorSuggestWidget.selectedBackground': '#c840ff40',
    'editorSuggestWidget.selectedForeground': '#ffffff',
    'editorSuggestWidget.highlightForeground': '#00ffff',
    'editorSuggestWidget.focusHighlightForeground': '#ff00ff',
    
    // Hover widget - CYAN GLASS
    'editorHoverWidget.background': '#080812cc',
    'editorHoverWidget.border': '#00ffff60',
    'editorHoverWidget.foreground': '#f0f6ff',
    'editorHoverWidget.highlightForeground': '#ff00ff',
    'editorHoverWidget.statusBarBackground': '#050810',
    
    // Error/Warning squiggles - NEON INDICATORS
    'editorError.foreground': '#ff3366',
    'editorError.border': '#ff336650',
    'editorWarning.foreground': '#ffaa00',
    'editorWarning.border': '#ffaa0050',
    'editorInfo.foreground': '#00ffff',
    'editorInfo.border': '#00ffff50',
    
    // Peek view
    'peekView.border': '#ff00ff',
    'peekViewEditor.background': '#080812',
    'peekViewEditor.matchHighlightBackground': '#ff00ff40',
    'peekViewResult.background': '#050810',
    'peekViewResult.lineForeground': '#f0f6ff',
    'peekViewResult.matchHighlightBackground': '#00ffff40',
    'peekViewResult.selectionBackground': '#c840ff40',
    'peekViewTitle.background': '#0a0f1a',
    'peekViewTitleDescription.foreground': '#6b8cff',
    'peekViewTitleLabel.foreground': '#00ffff',
    
    // Diff editor
    'diffEditor.insertedTextBackground': '#00ff7f20',
    'diffEditor.removedTextBackground': '#ff336620',
    'diffEditor.insertedLineBackground': '#00ff7f15',
    'diffEditor.removedLineBackground': '#ff336615',
    
    // Merge conflicts
    'merge.currentHeaderBackground': '#00ff7f40',
    'merge.currentContentBackground': '#00ff7f15',
    'merge.incomingHeaderBackground': '#00ffff40',
    'merge.incomingContentBackground': '#00ffff15',
    
    // Panel
    'panel.background': '#030408',
    'panel.border': '#ff00ff40',
    'panelTitle.activeBorder': '#00ffff',
    'panelTitle.activeForeground': '#00ffff',
    'panelTitle.inactiveForeground': '#5a6890',
    
    // Terminal
    'terminal.background': '#030408',
    'terminal.foreground': '#f0f6ff',
    'terminal.ansiBlack': '#030408',
    'terminal.ansiBlue': '#6b8cff',
    'terminal.ansiCyan': '#00ffff',
    'terminal.ansiGreen': '#00ff7f',
    'terminal.ansiMagenta': '#ff00ff',
    'terminal.ansiRed': '#ff3366',
    'terminal.ansiWhite': '#f0f6ff',
    'terminal.ansiYellow': '#ffaa00',
    'terminal.ansiBrightBlack': '#5a6890',
    'terminal.ansiBrightBlue': '#8aa4ff',
    'terminal.ansiBrightCyan': '#40ffff',
    'terminal.ansiBrightGreen': '#40ff9f',
    'terminal.ansiBrightMagenta': '#ff40ff',
    'terminal.ansiBrightRed': '#ff6088',
    'terminal.ansiBrightWhite': '#ffffff',
    'terminal.ansiBrightYellow': '#ffcc40',
    'terminalCursor.foreground': '#00ffff',
    
    // Git decoration
    'gitDecoration.addedResourceForeground': '#00ff7f',
    'gitDecoration.modifiedResourceForeground': '#00ffff',
    'gitDecoration.deletedResourceForeground': '#ff3366',
    'gitDecoration.untrackedResourceForeground': '#ffaa00',
    'gitDecoration.ignoredResourceForeground': '#5a6890',
    'gitDecoration.conflictingResourceForeground': '#ff00ff',
    
    // Input
    'input.background': '#080812',
    'input.border': '#ff00ff40',
    'input.foreground': '#f0f6ff',
    'input.placeholderForeground': '#5a689080',
    'inputOption.activeBackground': '#ff00ff40',
    'inputOption.activeBorder': '#ff00ff',
    'inputValidation.errorBackground': '#ff336630',
    'inputValidation.errorBorder': '#ff3366',
    'inputValidation.infoBackground': '#00ffff30',
    'inputValidation.infoBorder': '#00ffff',
    'inputValidation.warningBackground': '#ffaa0030',
    'inputValidation.warningBorder': '#ffaa00',
    
    // Button
    'button.background': '#ff00ff',
    'button.foreground': '#ffffff',
    'button.hoverBackground': '#ff40ff',
    'button.secondaryBackground': '#c840ff',
    'button.secondaryForeground': '#ffffff',
    'button.secondaryHoverBackground': '#d060ff',
    
    // Badge
    'badge.background': '#ff00ff',
    'badge.foreground': '#ffffff',
    
    // Lists
    'list.activeSelectionBackground': '#c840ff40',
    'list.activeSelectionForeground': '#ffffff',
    'list.focusBackground': '#ff00ff30',
    'list.focusForeground': '#f0f6ff',
    'list.highlightForeground': '#00ffff',
    'list.hoverBackground': '#ff00ff15',
    'list.hoverForeground': '#f0f6ff',
    'list.inactiveSelectionBackground': '#c840ff25',
    'list.inactiveSelectionForeground': '#f0f6ff',
    
    // Sidebar
    'sideBar.background': '#030408',
    'sideBar.foreground': '#a0aaca',
    'sideBar.border': '#ff00ff20',
    'sideBarTitle.foreground': '#00ffff',
    'sideBarSectionHeader.background': '#0a0f1a',
    'sideBarSectionHeader.foreground': '#ff00ff',
    'sideBarSectionHeader.border': '#ff00ff30',
    
    // Activity bar
    'activityBar.background': '#030408',
    'activityBar.foreground': '#00ffff',
    'activityBar.inactiveForeground': '#5a6890',
    'activityBar.border': '#ff00ff20',
    'activityBarBadge.background': '#ff00ff',
    'activityBarBadge.foreground': '#ffffff',
    
    // Status bar
    'statusBar.background': '#030408',
    'statusBar.foreground': '#a0aaca',
    'statusBar.border': '#ff00ff30',
    'statusBar.debuggingBackground': '#ff00ff',
    'statusBar.debuggingForeground': '#ffffff',
    'statusBar.noFolderBackground': '#030408',
    'statusBarItem.activeBackground': '#ff00ff40',
    'statusBarItem.hoverBackground': '#ff00ff25',
    'statusBarItem.prominentBackground': '#c840ff',
    'statusBarItem.prominentForeground': '#ffffff',
    'statusBarItem.prominentHoverBackground': '#d060ff',
    'statusBarItem.remoteBackground': '#00ffff',
    'statusBarItem.remoteForeground': '#030408',
    
    // Title bar
    'titleBar.activeBackground': '#030408',
    'titleBar.activeForeground': '#f0f6ff',
    'titleBar.inactiveBackground': '#030408',
    'titleBar.inactiveForeground': '#5a6890',
    'titleBar.border': '#ff00ff30',
    
    // Tab bar
    'tab.activeBackground': '#080812',
    'tab.activeForeground': '#00ffff',
    'tab.activeBorder': '#00ffff',
    'tab.activeBorderTop': '#ff00ff',
    'tab.border': '#ff00ff15',
    'tab.hoverBackground': '#ff00ff15',
    'tab.inactiveBackground': '#030408',
    'tab.inactiveForeground': '#5a6890',
    'tab.unfocusedActiveBackground': '#050810',
    'tab.unfocusedActiveBorder': '#00ffff60',
    'tab.unfocusedActiveForeground': '#a0aaca',
    'tab.unfocusedInactiveForeground': '#5a6890',
    
    // Editor groups
    'editorGroup.border': '#ff00ff40',
    'editorGroupHeader.tabsBackground': '#030408',
    'editorGroupHeader.tabsBorder': '#ff00ff30',
    
    // Breadcrumb
    'breadcrumb.background': '#030408',
    'breadcrumb.foreground': '#5a6890',
    'breadcrumb.focusForeground': '#00ffff',
    'breadcrumbPicker.background': '#080812',
    
    // Notifications
    'notificationCenter.border': '#ff00ff',
    'notificationCenterHeader.background': '#0a0f1a',
    'notificationCenterHeader.foreground': '#00ffff',
    'notificationToast.border': '#ff00ff',
    'notifications.background': '#080812',
    'notifications.border': '#ff00ff40',
    'notifications.foreground': '#f0f6ff',
    'notificationsErrorIcon.foreground': '#ff3366',
    'notificationsWarningIcon.foreground': '#ffaa00',
    'notificationsInfoIcon.foreground': '#00ffff',
    
    // Quick input
    'quickInput.background': '#080812',
    'quickInput.foreground': '#f0f6ff',
    'quickInputList.focusBackground': '#c840ff40',
    'quickInputList.focusForeground': '#ffffff',
    'quickInputTitle.background': '#0a0f1a',
    
    // Menu
    'menu.background': '#080812',
    'menu.foreground': '#f0f6ff',
    'menu.separatorBackground': '#ff00ff40',
    'menu.selectionBackground': '#c840ff40',
    'menu.selectionForeground': '#ffffff',
    'menubar.selectionBackground': '#ff00ff30',
    'menubar.selectionForeground': '#00ffff',
    
    // Debug
    'debugToolBar.background': '#080812',
    'debugToolBar.border': '#ff00ff60',
    'debugExceptionWidget.background': '#ff336630',
    'debugExceptionWidget.border': '#ff3366',
    
    // Settings
    'settings.headerForeground': '#00ffff',
    'settings.modifiedItemIndicator': '#ff00ff',
    'settings.focusedRowBackground': '#ff00ff15',
    
    // Keybinding
    'keybindingLabel.background': '#ff00ff30',
    'keybindingLabel.foreground': '#f0f6ff',
    'keybindingLabel.border': '#ff00ff60',
    'keybindingLabel.bottomBorder': '#ff00ff80',
    
    // Dropdown
    'dropdown.background': '#080812',
    'dropdown.foreground': '#f0f6ff',
    'dropdown.border': '#ff00ff40',
    'dropdown.listBackground': '#080812',
    
    // Checkbox
    'checkbox.background': '#080812',
    'checkbox.border': '#ff00ff60',
    'checkbox.foreground': '#00ffff',
    
    // Welcome page
    'welcomePage.buttonBackground': '#ff00ff30',
    'welcomePage.buttonHoverBackground': '#ff00ff50',
    'walkThrough.embeddedEditorBackground': '#050810',
    
    // Extension
    'extensionIcon.starForeground': '#ffaa00',
    'extensionButton.prominentBackground': '#ff00ff',
    'extensionButton.prominentForeground': '#ffffff',
    'extensionButton.prominentHoverBackground': '#ff40ff',
    
    // Contrast
    'contrastBorder': '#ff00ff30',
    'focusBorder': '#00ffff60',
    'foreground': '#f0f6ff',
    'icon.foreground': '#a0aaca',
    'selection.background': '#c840ff50',
    'textLink.activeForeground': '#00ffff',
    'textLink.foreground': '#ff00ff',
    'textPreformat.foreground': '#00ff7f',
    'textBlockQuote.background': '#ff00ff10',
    'textBlockQuote.border': '#ff00ff60',
    'textCodeBlock.background': '#080812',
    'textSeparator.foreground': '#ff00ff30',
    
    // Scrollbar decorations
    'scrollbar.shadow': '#00000066',
  },
};
