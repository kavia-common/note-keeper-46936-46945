import Blits from '@lightningjs/blits'
const { Component, Lightning } = Blits
import theme from '../theme.js'
import { store } from '../state/store.js'

/**
 * PUBLIC_INTERFACE
 * NotesLayout: Application shell rendering header, sidebar list, and content area.
 * - Subscribes to store for notes and selection
 * - Displays mock/local notes when no API is configured
 */
export default class NotesLayout extends Component {
  static template() {
    const headerH = 72
    const sidebarW = 420
    return {
      w: 1920,
      h: 1080,
      rect: true,
      color: 0x00ffffff,

      Header: {
        w: 1920,
        h: headerH,
        rect: true,
        color: 0xffffffff,
        shader: { type: Lightning.shaders.RoundedRectangle, radius: 0 },
        BottomBorder: {
          x: 0, y: headerH - 1, w: 1920, h: 1, rect: true, color: 0xffe5e7eb,
        },
        Title: {
          x: 32,
          y: Math.floor(headerH / 2),
          mountY: 0.5,
          text: { text: 'Notes', fontSize: 34, textColor: 0xff111827 },
        },
        AddHint: {
          x: 1920 - 32,
          y: Math.floor(headerH / 2),
          mount: 1,
          text: { text: 'Press N to add', fontSize: 18, textColor: 0xff6b7280 },
        },
      },

      Body: {
        x: 0, y: headerH, w: 1920, h: 1080 - headerH,

        Sidebar: {
          x: 16, y: 16, w: sidebarW - 32, h: (1080 - headerH) - 32,
          rect: true, color: 0xfff3f4f6,
          shader: { type: Lightning.shaders.RoundedRectangle, radius: 12 },
          Title: {
            x: 16, y: 12,
            text: { text: 'Your Notes', fontSize: 22, textColor: 0xff111827 }
          },
          List: {
            x: 16, y: 48,
            children: [],
          },
        },

        Content: {
          x: sidebarW + 16, y: 16, w: 1920 - (sidebarW + 32), h: (1080 - headerH) - 32,
          rect: true, color: 0xffffffff,
          shader: { type: Lightning.shaders.RoundedRectangle, radius: 12 },
          Padding: {
            x: 24, y: 24,
            Title: { text: { text: 'Select or create a note', fontSize: 28, textColor: 0xff6b7280 } },
            Body: { y: 48, text: { text: '', fontSize: 22, textColor: 0xff111827, wordWrapWidth: 1920 - (sidebarW + 32) - 48, lineHeight: 36 } },
          }
        },
      },
    }
  }

  _setup() {
    // basic global shortcuts: N to add note, Enter to select first
    this._keyHandler = (e) => {
      const key = e.key
      const ctrl = e.ctrlKey || e.metaKey
      const ae = document.activeElement
      const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)
      if (!typing && (key === 'n' || key === 'N' || (ctrl && (key === 'n' || key === 'N')))) {
        e.preventDefault()
        this._addNote()
      }
    }
    if (typeof window !== 'undefined') window.addEventListener('keydown', this._keyHandler, { passive: false })

    // subscribe to store updates
    this._unsubscribe = store.subscribe(() => this._renderFromStore())

    // initial load (localStorage or API)
    if (typeof store.loadNotes === 'function') {
      store.loadNotes().catch(() => {
        // ignore errors; UI will still render mock/local state
      })
    }

    // initial render
    this._renderFromStore()
  }

  _detach() {
    if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null }
    if (this._keyHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._keyHandler)
      this._keyHandler = null
    }
  }

  _addNote() {
    // prefer async API of our store
    Promise.resolve(store.addNote({ title: 'Untitled', content: '' }))
      .then((created) => {
        const id = created?.id
        if (id != null) store.selectNote(id)
      })
      .catch((e) => console.warn('addNote failed', e))
  }

  _renderFromStore() {
    const state = typeof store.getState === 'function' ? store.getState() : {}
    const notes = Array.isArray(state.notes) ? state.notes : []
    const selectedId = state.selectedNoteId ?? null

    // sort by updatedAt desc
    const items = [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

    // sidebar list
    const list = this.tag('Body.Sidebar.List')
    list.children = items.map((n, i) => ({
      x: 0, y: i * 52, h: 44, w: (this.tag('Body.Sidebar').w || 360) - 32,
      rect: true, color: n.id === selectedId ? 0x112563eb : 0x00ffffff,
      shader: { type: Lightning.shaders.RoundedRectangle, radius: 8 },
      Label: { x: 12, y: 10, text: { text: n.title || 'Untitled', fontSize: 20, textColor: 0xff111827, maxLines: 1, wordWrapWidth: 260 } },
      __noteId: n.id,
    }))

    // attach click handlers for selection
    list.children.forEach((child) => {
      child.onClick = () => {
        if (child.__noteId != null) store.selectNote(child.__noteId)
      }
    })

    // content area
    const contentTitle = this.tag('Body.Content.Padding.Title')
    const contentBody = this.tag('Body.Content.Padding.Body')
    const current = notes.find(n => n.id === selectedId) || null
    if (current) {
      contentTitle.text.text = current.title || 'Untitled'
      contentBody.text.text = current.content || ''
    } else {
      contentTitle.text.text = 'Select or create a note'
      contentBody.text.text = ''
    }
  }

  _getFocused() {
    return this
  }
}
