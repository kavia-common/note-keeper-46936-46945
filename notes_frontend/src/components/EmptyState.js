import lng from '@lightningjs/core';
import theme from '../theme';
import store from '../state/store';

/**
 * EmptyState component
 * Renders an ocean-themed friendly prompt encouraging user to add the first note.
 * Provides a button that dispatches addNote and selects it.
 */
export default class EmptyState extends lng.Component {
  static _template() {
    return {
      w: w => w,
      h: h => h,
      rect: true,
      color: 0xFFF9FAFB, // background from theme background
      // Subtle gradient-like overlay using alpha shapes
      Background: {
        w: w => w,
        h: h => h,
        rect: true,
        colorTop: 0x1A2563EB, // primary with low alpha
        colorBottom: 0x00000000,
        shader: { type: lng.shaders.RadialGradient, radius: 800, pivot: 0.5 },
        mount: 0.5,
        x: w => w * 0.5,
        y: h => h * 0.5
      },
      Container: {
        w: w => w,
        h: h => h,
        x: w => w * 0.5,
        y: h => h * 0.5,
        mount: 0.5,
        Title: {
          text: {
            text: 'No notes yet',
            fontSize: 48,
            textColor: 0xFF111827, // theme.text
            fontFace: 'Regular'
          }
        },
        Subtitle: {
          y: 64,
          text: {
            text: 'Create your first note to get started.',
            fontSize: 26,
            textColor: 0xCC111827
          }
        },
        ActionBtn: {
          y: 140,
          mountX: 0.5,
          rect: true,
          w: 320,
          h: 64,
          color: 0xFF2563EB, // primary
          shader: { type: lng.shaders.RoundedRectangle, radius: 12 },
          Label: {
            mount: 0.5,
            x: 160,
            y: 32,
            text: {
              text: 'Add your first note',
              fontSize: 24,
              textColor: 0xFFFFFFFF
            }
          },
          FocusRing: {
            alpha: 0,
            mount: 0.5,
            x: 160,
            y: 32,
            rect: true,
            w: 340,
            h: 74,
            color: 0x1A2563EB,
            shader: { type: lng.shaders.RoundedRectangle, radius: 16 }
          }
        },
        Hint: {
          y: 220,
          text: {
            text: 'Tip: Use the + button in the header anytime.',
            fontSize: 20,
            textColor: 0x99111827
          }
        }
      }
    };
  }

  _init() {
    // Ensure we have access to actions from store if exposed
    // Fallback to dispatching by type if actions object is not provided.
    this._actions = store.actions || {};
  }

  // PUBLIC_INTERFACE
  set onCreate(callback) {
    this._onCreate = callback;
  }

  _handleEnter() {
    this._createNote();
    return true;
  }

  _handleOk() {
    return this._handleEnter();
  }

  _getFocused() {
    return this.tag('ActionBtn');
  }

  _focus() {
    this.tag('ActionBtn').animation({
      duration: 0.2, actions: [{ p: 'scale', v: { 0: 1.0, 1: 1.03 } }]
    }).start();
    this.tag('ActionBtn.FocusRing').patch({ alpha: 1 });
  }

  _unfocus() {
    this.tag('ActionBtn').patch({ scale: 1.0 });
    this.tag('ActionBtn.FocusRing').patch({ alpha: 0 });
  }

  _handleEnterRelease() {
    // noop to prevent repeated triggers on hold
  }

  _createNote() {
    const state = store.getState ? store.getState() : {};
    const hasAdd = this._actions.addNote || null;

    let newNoteId;

    if (hasAdd) {
      const result = this._actions.addNote();
      // If action returns created id
      newNoteId = result && result.id ? result.id : undefined;
    } else if (store.dispatch) {
      // Generic dispatch fallback
      const action = { type: 'notes/addNote' };
      const res = store.dispatch(action);
      newNoteId = res && res.id ? res.id : undefined;
    }

    // Select the note
    const selectAction =
      (this._actions.selectNote && this._actions.selectNote(newNoteId)) ||
      (store.dispatch && store.dispatch({ type: 'notes/selectNote', payload: newNoteId }));

    if (this._onCreate) {
      this._onCreate(newNoteId);
    }
  }

  // PUBLIC_INTERFACE
  static mountTo(parent) {
    const comp = parent.stage.c({ type: EmptyState });
    parent.childList.add(comp);
    return comp;
  }
}
