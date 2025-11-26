import Blits, { Component } from '@lightningjs/blits'
import theme, { theme as themeNamed } from './theme.js'
import NotesLayout from './pages/NotesLayout.js'

/**
 * PUBLIC_INTERFACE
 * Root Application for Notes
 * - Sets background and mounts NotesLayout at root route.
 * - Avoids complex JavaScript inside template to keep Blits precompiler happy.
 */
export default Blits.Application({
  template: `
    <Element w="1920" h="1080" :color="$bgColor">
      <RouterView />
    </Element>
  `,
  state() {
    return {
      bgColor: 0xffffffff, // replaced in ready() using CSS for gradient background
    }
  },
  hooks: {
    ready() {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.margin = '0'
        document.body.style.background = (themeNamed?.gradient?.() || theme.gradient())
        document.body.style.color = (themeNamed?.colors?.text || theme.colors?.text || '#111827')
      }
    },
  },
  routes: [
    { path: '/', component: NotesLayout },
  ],
})
