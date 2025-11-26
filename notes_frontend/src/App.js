import Blits from '@lightningjs/blits'

// Theme (keep store import ready but avoid unused var for now)
import theme from './theme.js'
// import { store } from './state/store.js'

import NotesLayout from './pages/NotesLayout.js'

export default Blits.Application({
  /**
   * Root template sets a themed background and shows the current route.
   * Keep bindings simple for the Blits precompiler.
   */
  template: `
    <Element w="1920" h="1080" :color="$bgColor">
      <RouterView />
    </Element>
  `,
  state() {
    return {
      bgColor: theme.colors.background,
    }
  },
  hooks: {
    ready() {
      // Set page background to a subtle gradient aligned with Ocean theme when DOM exists.
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.margin = '0'
        document.body.style.background = theme.gradient()
        document.body.style.color = theme.colors.text
      }
      // Optional store bootstrap when NotesLayout lands:
      // store.loadNotes().catch(() => {})
    },
  },
  routes: [{ path: '/', component: NotesLayout }],
})
