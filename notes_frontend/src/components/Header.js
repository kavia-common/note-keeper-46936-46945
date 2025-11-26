import { Component } from 'blits';
import { store } from '../state/store';
import theme from '../theme';

/**
 * Header component for the Notes app.
 * Renders a title and a primary "Add Note" button styled with the Ocean Professional theme.
 * The button dispatches addNote, selects the newly created note, and surfaces a keyboard shortcut hint.
 *
 * PUBLIC_INTERFACE
 * - Props:
 *   - title: string - Optional title override (default: "Notes").
 *   - onAdd?: (note) => void - Optional callback invoked after a new note is added and selected.
 *   - showShortcutHint?: boolean - Show keyboard shortcut hint text (default: true).
 * - Methods:
 *   - focusAdd(): focus the Add Note button programmatically.
 *   - blurAdd(): remove focus from the Add Note button.
 */
export default class Header extends Component {
  /** This is a public function. */
  // PUBLIC_INTERFACE
  static getProps() {
    return {
      title: {
        type: String,
        default: 'Notes',
      },
      onAdd: {
        type: Function,
        default: null,
      },
      showShortcutHint: {
        type: Boolean,
        default: true,
      },
    };
  }

  /**
   * Template for the header: Title on the left, Add Note button on the right with shortcut hint below.
   */
  template() {
    const colors = {
      primary: theme?.colors?.primary || '#2563EB',
      text: theme?.colors?.text || '#111827',
      surface: theme?.colors?.surface || '#ffffff',
      secondary: theme?.colors?.secondary || '#F59E0B',
      background: theme?.colors?.background || '#f9fafb',
    };

    const buttonBase = {
      padding: '10 16',
      borderRadius: 8,
      cursor: 'pointer',
      color: '#ffffff',
      backgroundColor: colors.primary,
      boxShadow: '0 2 6 rgba(0,0,0,0.08)',
      transition: 'all 120ms ease',
      fontWeight: 600,
    };

    const buttonFocus = {
      outline: `2px solid ${colors.secondary}`,
      outlineOffset: 2,
    };

    return /* html */ `
      <div
        style="
          width: 100%;
          background: ${colors.surface};
          color: ${colors.text};
          border-bottom: 1px solid rgba(0,0,0,0.06);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 10;
        "
      >
        <div style="display:flex; align-items:center; gap: 12px;">
          <div
            data-ref="logo"
            aria-hidden="true"
            style="
              width: 28px; height: 28px; border-radius: 8px;
              background: linear-gradient(135deg, rgba(37,99,235,0.15), rgba(17,24,39,0.05));
              border: 1px solid rgba(0,0,0,0.06);
            "
          ></div>
          <h1
            data-ref="title"
            style="
              margin: 0;
              font-size: 18px;
              font-weight: 700;
              letter-spacing: 0.2px;
            "
          >${this.props.title}</h1>
        </div>

        <div style="display:flex; flex-direction: column; align-items: flex-end;">
          <button
            data-ref="addBtn"
            aria-label="Add Note"
            title="Add Note"
            style="
              padding: ${buttonBase.padding};
              border-radius: ${buttonBase.borderRadius}px;
              cursor: ${buttonBase.cursor};
              color: ${buttonBase.color};
              background: ${buttonBase.backgroundColor};
              box-shadow: ${buttonBase.boxShadow};
              transition: ${buttonBase.transition};
              border: none;
              display: inline-flex;
              align-items: center;
              gap: 8px;
              font-weight: ${buttonBase.fontWeight};
            "
            onmouseenter="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(37,99,235,0.22)';"
            onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(0,0,0,0.08)';"
            onfocus="this.style.outline='${buttonFocus.outline}'; this.style.outlineOffset='${buttonFocus.outlineOffset}px';"
            onblur="this.style.outline='none'; this.style.outlineOffset='0';"
          >
            <span
              aria-hidden="true"
              style="
                display:inline-flex;
                width: 18px; height: 18px; border-radius: 4px;
                background: rgba(255,255,255,0.16);
                align-items:center; justify-content:center; font-size: 14px; line-height: 1;
              "
            >+</span>
            <span>Add Note</span>
          </button>
          ${
            this.props.showShortcutHint
              ? `<span
                  data-ref="shortcut"
                  style="margin-top: 6px; font-size: 12px; color: rgba(17,24,39,0.6);"
                  aria-live="polite"
                >Tip: Press N to quickly add a note</span>`
              : ''
          }
        </div>
      </div>
    `;
  }

  /**
   * After mounting, wire up event listeners and keyboard shortcut.
   */
  onMounted() {
    const addBtn = this.ref('addBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this._handleAddNote());
      // allow Enter/Space activation for accessibility
      addBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._handleAddNote();
        }
      });
    }

    // Global keyboard shortcut: "N" to add a note
    this._keyHandler = (e) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
      if (!isTyping && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        this._handleAddNote();
      }
    };
    window.addEventListener('keydown', this._keyHandler, { passive: false });
  }

  /**
   * Clean up listeners on destroy.
   */
  onDestroyed() {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    const addBtn = this.ref('addBtn');
    if (addBtn) {
      addBtn.replaceWith(addBtn.cloneNode(true));
    }
  }

  /**
   * Handles add note: dispatch addNote to store, select the new note, and call optional onAdd callback.
   */
  _handleAddNote() {
    try {
      // Dispatch addNote in global store; expect it to return the created note or id.
      const result = store.dispatch('addNote');
      // Some stores may return synchronously, others may be async (Promise).
      const handleResult = (created) => {
        const createdNote = created && created.note ? created.note : created;
        const noteId = createdNote?.id ?? created?.id ?? created;
        if (noteId != null) {
          store.dispatch('selectNote', noteId);
        }
        if (typeof this.props.onAdd === 'function') {
          this.props.onAdd(createdNote ?? { id: noteId });
        }
        // announce hint for assistive tech
        const shortcut = this.ref('shortcut');
        if (shortcut) {
          shortcut.textContent = 'Note added. Press N to add another.';
          setTimeout(() => {
            if (shortcut) shortcut.textContent = 'Tip: Press N to quickly add a note';
          }, 1800);
        }
      };

      if (result && typeof result.then === 'function') {
        result.then(handleResult).catch((err) => {
          console.error('Failed to add note (async):', err);
        });
      } else {
        handleResult(result);
      }
    } catch (e) {
      console.error('Failed to add note:', e);
    }
  }

  // PUBLIC_INTERFACE
  focusAdd() {
    /** Focus the Add Note button programmatically. */
    const addBtn = this.ref('addBtn');
    if (addBtn && typeof addBtn.focus === 'function') addBtn.focus();
  }

  // PUBLIC_INTERFACE
  blurAdd() {
    /** Remove focus from the Add Note button programmatically. */
    const addBtn = this.ref('addBtn');
    if (addBtn && typeof addBtn.blur === 'function') addBtn.blur();
  }
}
