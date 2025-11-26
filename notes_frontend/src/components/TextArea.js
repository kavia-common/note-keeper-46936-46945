import lng from '@lightningjs/core';
import { theme } from '../theme.js';

/**
 * PUBLIC_INTERFACE
 * TextArea: A reusable multiline text input with Ocean theme.
 * 
 * Props:
 * - value: string => Current text value.
 * - placeholder: string => Placeholder text when empty.
 * - disabled: boolean => If true, disables input.
 * - onChange: function(value: string) => Called when value changes.
 * - onSubmit: function(value: string) => Called when Ctrl+Enter is pressed.
 * - width: number => Width in px.
 * - height: number => Height in px.
 * - size: 'sm' | 'md' | 'lg' => Controls paddings and font sizes.
 * - name: string => Optional field name (for forms/accessibility).
 */
export default class TextArea extends lng.Component {
  static _template() {
    return {
      w: 520,
      h: 200,
      rect: true,
      rtt: true,
      shader: { type: lng.shaders.RoundedRect, radius: 10 },
      color: 0xffffffff,
      FocusRing: {
        mount: 0.5, x: 260, y: 100, w: 528, h: 208, rect: true,
        shader: { type: lng.shaders.RoundedRect, radius: 12, stroke: 2, strokeColor: 0x00000000 },
        color: 0x00000000, visible: false
      },
      Scroller: {
        x: 14, y: 12, w: 492, h: 176, clipping: true,
        Content: {
          y: 0,
          TextField: {
            text: { text: '', fontSize: 18, textColor: 0xff111827, lineHeight: 26, wordWrapWidth: 492, maxLines: 0 }
          },
          Placeholder: {
            text: { text: '', fontSize: 18, textColor: 0x99111827, lineHeight: 26, wordWrapWidth: 492, maxLines: 0 }, visible: false
          }
        }
      },
      Cursor: {
        x: 14, y: 12, w: 2, h: 20, rect: true, color: 0xff111827, alpha: 0
      }
    };
  }

  _construct() {
    this._props = {
      value: '',
      placeholder: '',
      disabled: false,
      onChange: null,
      onSubmit: null,
      width: 520,
      height: 200,
      size: 'md',
      name: ''
    };
    this._cursorIndex = 0;
    this._blinkTimer = null;
  }

  // PUBLIC_INTERFACE
  set props(v) {
    /** Sets props for TextArea and re-renders accordingly. */
    this._props = { ...this._props, ...(v || {}) };
    this._cursorIndex = Math.min(this._props.value?.length || 0, this._cursorIndex);
    this._applyProps();
  }

  get props() {
    return this._props;
  }

  _applyProps() {
    const { width, height, size, value, placeholder, disabled } = this._props;

    const sizes = {
      sm: { font: 16, padX: 10, padY: 8, radius: 8, line: 22 },
      md: { font: 18, padX: 14, padY: 12, radius: 10, line: 26 },
      lg: { font: 20, padX: 16, padY: 14, radius: 12, line: 30 }
    };
    const S = sizes[size] || sizes.md;

    this.w = width || 520;
    this.h = height || 200;

    const surface = theme?.surface || '#ffffff';
    const textColor = theme?.text || '#111827';
    const primaryHex = theme?.primary || '#2563EB';

    const toArgb = (hex) => {
      const h = (hex || '').replace('#', '');
      if (h.length === 8) return Number('0x' + h);
      return Number('0xff' + h);
    };
    const withAlpha = (hex, a) => {
      const argb = toArgb(hex);
      const aByte = Math.round(Math.max(0, Math.min(a, 1)) * 255);
      return (aByte << 24) | (argb & 0x00ffffff);
    };

    const borderColor = this.hasFocus() ? withAlpha(primaryHex, 0.9) : withAlpha('#000000', 0.08);
    const bg = withAlpha(surface, disabled ? 0.6 : 1);

    const innerW = this.w - S.padX * 2;
    const innerH = this.h - S.padY * 2;

    this.patch({
      shader: { type: lng.shaders.RoundedRect, radius: S.radius, stroke: 1, strokeColor: borderColor },
      color: bg,
      FocusRing: {
        x: this.w / 2, y: this.h / 2, w: this.w + 8, h: this.h + 8,
        shader: { type: lng.shaders.RoundedRect, radius: S.radius + 2, stroke: 2, strokeColor: withAlpha(primaryHex, 0.9) },
        visible: this.hasFocus() && !disabled
      },
      Scroller: {
        x: S.padX, y: S.padY, w: innerW, h: innerH,
        Content: {
          TextField: {
            text: { text: value || '', fontSize: S.font, textColor: disabled ? withAlpha(textColor, 0.5) : toArgb(textColor), lineHeight: S.line, wordWrapWidth: innerW, maxLines: 0 }
          },
          Placeholder: {
            text: { text: (!value ? placeholder : ''), fontSize: S.font, textColor: withAlpha(textColor, 0.6), lineHeight: S.line, wordWrapWidth: innerW, maxLines: 0 },
            visible: !value
          }
        }
      },
      Cursor: {
        x: S.padX + this._measureText(value?.slice(0, this._cursorIndex) || '', S.font, innerW),
        y: S.padY,
        h: S.font,
        color: toArgb(textColor),
        alpha: this.hasFocus() && !disabled ? 1 : 0
      }
    });

    this.pointerEnabled = !disabled;

    if (this.hasFocus() && !disabled) this._startBlink();
    else this._stopBlink();
  }

  _measureText(text, size, wrapWidth) {
    // Approximate line wrapping and cursor X position
    const avgFactor = 0.56;
    const pxPerChar = size * avgFactor;
    const charsPerLine = Math.max(1, Math.floor(wrapWidth / pxPerChar));
    const lines = Math.floor(text.length / charsPerLine);
    const col = text.length % charsPerLine;
    return col * pxPerChar;
  }

  _startBlink() {
    if (this._blinkTimer) return;
    this._blinkTimer = this.stage.setInterval(() => {
      const cursor = this.tag('Cursor');
      cursor.alpha = cursor.alpha === 1 ? 0 : 1;
    }, 500);
  }

  _stopBlink() {
    if (this._blinkTimer) {
      this.stage.clearInterval(this._blinkTimer);
      this._blinkTimer = null;
    }
    const cursor = this.tag('Cursor');
    if (cursor) cursor.alpha = 0;
  }

  _focus() {
    this.setSmooth('scale', 1.01, { duration: 0.12 });
    this._applyProps();
  }

  _unfocus() {
    this.setSmooth('scale', 1.0, { duration: 0.12 });
    this._applyProps();
  }

  // Handle typing
  _handleKey(event) {
    const { disabled } = this._props;
    if (disabled) return false;
    const { key, ctrl } = event;

    let v = this._props.value || '';
    let idx = this._cursorIndex;

    if (key === 'Enter' && ctrl) {
      if (typeof this._props.onSubmit === 'function') {
        this._props.onSubmit(v);
      }
      return true;
    }

    if (key === 'Enter') {
      v = v.slice(0, idx) + '\n' + v.slice(idx);
      idx += 1;
    } else if (key === 'Backspace') {
      if (idx > 0) {
        v = v.slice(0, idx - 1) + v.slice(idx);
        idx -= 1;
      }
    } else if (key === 'Delete') {
      if (idx < v.length) {
        v = v.slice(0, idx) + v.slice(idx + 1);
      }
    } else if (key === 'ArrowLeft') {
      idx = Math.max(0, idx - 1);
    } else if (key === 'ArrowRight') {
      idx = Math.min(v.length, idx + 1);
    } else if (key.length === 1) {
      v = v.slice(0, idx) + key + v.slice(idx);
      idx += 1;
    } else {
      return false;
    }

    this._cursorIndex = idx;
    this._updateValue(v);
    return true;
  }

  _updateValue(v) {
    this._props.value = v;
    if (typeof this._props.onChange === 'function') {
      this._props.onChange(v);
    }
    this._applyProps();
  }

  _handleClick() {
    this._cursorIndex = (this._props.value || '').length;
    this._applyProps();
  }
}
