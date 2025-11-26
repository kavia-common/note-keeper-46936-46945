import lng from '@lightningjs/core';
import NoteListItem from './NoteListItem';
import { theme } from '../theme';
import { store } from '../state/store';

/**
 * PUBLIC_INTERFACE
 * Sidebar - Scrollable list of notes integrated with global store.
 * Renders store.sortedNotes, highlights store.selectedNoteId.
 * Handles selection via click/enter and delete via a delete button with confirm.
 */
export default class Sidebar extends lng.Component {
  static _template() {
    const colors = theme?.colors || {};
    const ocean = {
      surface: colors.surface || 0xffffffff,
      background: colors.background || 0xfff9fafb,
      border: 0x1a111827,
      text: colors.onSurface || 0xff111827,
      primary: colors.primary || 0xff2563eb,
    };

    return {
      w: 380,
      h: 1080,
      rect: true,
      color: ocean.background,
      shader: { type: lng.shaders.RoundedRectangle, radius: 12 },
      // Top header for section
      Header: {
        x: 16, y: 12, w: 348, h: 32,
        Title: {
          text: {
            text: 'Notes',
            fontSize: 24,
            textColor: ocean.text,
          },
        },
      },
      Divider: {
        y: 52, x: 12, w: 356, h: 1,
        rect: true,
        color: ocean.border,
      },
      // Scrollable list area
      ListWrapper: {
        x: 12,
        y: 60,
        w: 356,
        h: h => Math.max(0, h - 72),
        clipping: true,
        Items: {
          x: 0,
          y: 0,
        },
        // Simple custom scrollbar indicator
        Scrollbar: {
          x: 352,
          y: 0,
          w: 2,
          h: 0,
          rect: true,
          color: ocean.primary,
          alpha: 0.3,
        },
      },
      EmptyState: {
        x: 16,
        y: 80,
        alpha: 0,
        text: {
          text: 'No notes yet',
          fontSize: 20,
          textColor: 0xff6b7280,
        },
      },
    };
  }

  _construct() {
    this._notes = [];
    this._selectedId = null;
    this._scrollY = 0;
    this._focusedIndex = 0;
    this._unsubscribe = null;
  }

  _init() {
    // Subscribe to store
    this._unsubscribe = store.subscribe(() => {
      const state = store.getState();
      // Expecting state.sortedNotes and state.selectedNoteId
      const sortedNotes = state.sortedNotes || [];
      const selectedId = state.selectedNoteId || null;
      this._applyData(sortedNotes, selectedId);
    });

    // Initial state
    const state = store.getState();
    this._applyData(state.sortedNotes || [], state.selectedNoteId || null);

    // enable wheel/mouse scrolling
    this._enableMouse();
  }

  _detach() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  _applyData(notes, selectedId) {
    this._notes = notes;
    this._selectedId = selectedId;
    this._renderList();
  }

  _renderList() {
    const itemsTag = this.tag('ListWrapper').tag('Items');
    // remove existing children
    itemsTag.children = [];
    const children = [];

    if (!this._notes.length) {
      this.tag('EmptyState').alpha = 1;
    } else {
      this.tag('EmptyState').alpha = 0;
    }

    this._notes.forEach((note, idx) => {
      children.push({
        type: NoteListItem,
        note,
        index: idx,
        active: note.id === this._selectedId,
        y: idx * 72, // 64 height + 8 gap
        signals: {
          // not used here
        },
        onSelectHandler: (noteId) => {
          store.dispatch({ type: 'selectNote', payload: noteId });
        },
        onDeleteHandler: (noteId) => {
          // Simple confirm is inside NoteListItem by default; keep here to ensure dispatch
          store.dispatch({ type: 'deleteNote', payload: noteId });
        },
      });
    });

    itemsTag.children = children;

    // Restore focused index based on selected note if available
    const selIndex = Math.max(0, this._notes.findIndex(n => n.id === this._selectedId));
    this._focusedIndex = selIndex >= 0 ? selIndex : 0;

    this._updateScrollForFocus();
    this._updateScrollbar();
  }

  _updateScrollForFocus() {
    const listH = this.tag('ListWrapper').h;
    const itemH = 72;
    const targetTop = this._focusedIndex * itemH;
    const targetBottom = targetTop + itemH;

    if (targetTop < this._scrollY) {
      this._scrollY = Math.max(0, targetTop);
    } else if (targetBottom > this._scrollY + listH) {
      this._scrollY = Math.max(0, targetBottom - listH);
    }
    this._applyScroll();
  }

  _applyScroll() {
    const itemsTag = this.tag('ListWrapper').tag('Items');
    itemsTag.y = -this._scrollY;
    this._updateScrollbar();
  }

  _updateScrollbar() {
    const listWrapper = this.tag('ListWrapper');
    const itemsCount = this._notes.length;
    const itemH = 72;
    const totalH = itemsCount * itemH;
    const viewportH = listWrapper.h;

    const sb = listWrapper.tag('Scrollbar');

    if (totalH <= viewportH || viewportH <= 0) {
      sb.alpha = 0;
      return;
    }

    const ratio = viewportH / totalH;
    const barH = Math.max(24, Math.floor(viewportH * ratio));
    const maxScroll = totalH - viewportH;
    const scrollRatio = this._scrollY / maxScroll;

    sb.alpha = 0.3;
    sb.h = barH;
    sb.y = Math.floor((viewportH - barH) * scrollRatio);
  }

  // Keyboard navigation
  _getFocused() {
    const items = this.tag('ListWrapper').tag('Items').children;
    if (!items.length) return null;
    return items[this._focusedIndex] || null;
  }

  _focus() {
    // ensure selected is focused
    const selIndex = Math.max(0, this._notes.findIndex(n => n.id === this._selectedId));
    this._focusedIndex = selIndex >= 0 ? selIndex : 0;
    this._updateScrollForFocus();
  }

  _handleUp() {
    if (!this._notes.length) return false;
    this._focusedIndex = Math.max(0, this._focusedIndex - 1);
    this._updateScrollForFocus();
    return true;
  }

  _handleDown() {
    if (!this._notes.length) return false;
    this._focusedIndex = Math.min(this._notes.length - 1, this._focusedIndex + 1);
    this._updateScrollForFocus();
    return true;
  }

  _handleEnter() {
    const item = this._getFocused();
    if (item && item.noteId != null) {
      store.dispatch({ type: 'selectNote', payload: item.noteId });
      return true;
    }
    return false;
  }

  // Mouse wheel scroll
  _handleWheel({ deltaY = 0 }) {
    const itemsCount = this._notes.length;
    const itemH = 72;
    const totalH = itemsCount * itemH;
    const viewportH = this.tag('ListWrapper').h;

    if (totalH <= viewportH) return false;

    const maxScroll = totalH - viewportH;
    const next = Math.min(maxScroll, Math.max(0, this._scrollY + deltaY));
    if (next !== this._scrollY) {
      this._scrollY = next;
      this._applyScroll();
      return true;
    }
    return false;
  }
}
