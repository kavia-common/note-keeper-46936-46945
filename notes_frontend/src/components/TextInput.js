import lng from '@lightningjs/core';
import { theme } from '../theme';

/**
 * PUBLIC_INTERFACE
 * TextInput: A reusable single-line text input with Ocean theme.
 * 
 * Props:
 * - value: string => Current text value.
 * - placeholder: string => Placeholder text when empty.
 * - disabled: boolean => If true, disables input.
 * - onChange: function(value: string) => Called when value changes.
 * - onSubmit: function(value: string) => Called when Enter is pressed.
 * - width: number => Desired width in px.
 * - size: 'sm' | 'md' | 'lg' => Controls paddings and font sizes.
 * - name: string => Optional field name (for forms/accessibility).
 */
export default class TextInput extends lng.Component {
  static _template() {
    return {
      w: 320,
      h: 40,
      rect: true,
      rtt: true,
      shader: { type: lng.shaders.RoundedRect, radius: 10 },
      color: 0xffffffff,
      FocusRing: {
        mount: 0.5, x: 160, y: 20, w: 328, h: 48, rect: true,
        shader: { type: lng.shaders.RoundedRect, radius: 12, stroke: 2, strokeColor: 0x00000000 },
        color: 0x00000000, visible: false
      },
      Cursor: {
        x: 14, y: 10, w: 2, h: 20, rect: true, color: 0xff111827, alpha: 0
      },
      TextField: {
        x: 14, y: 10,
        text: { text: '', fontSize: 18, textColor: 0xff111827, maxLines: 1 }
      },
      Placeholder: {
        x: 14, y: 10,
        text: { text: '', fontSize: 18, textColor: 0x99111827, maxLines: 1 }, visible: false
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
      width: 320,
      size: 'md',
      name: ''
    };
    this._cursorIndex = 0;
    this._blinkTimer = null;
  }

  // PUBLIC_INTERFACE
  set props(v) {
    /** Sets props for TextInput and re-renders accordingly. */
    this._props = { ...this._props, ...(v || {}) };
    this._cursorIndex = Math.min(this._props.value?.length || 0, this._cursorIndex);
    this._applyProps();
  }

  get props() {
    return this._props;
  }

  _applyProps() {
    const { width, size, value, placeholder, disabled } = this._props;

    const sizes = {
      sm: { h: 32, font: 16, padX: 10, padY: 6, radius: 8 },
      md: { h: 40, font: 18, padX: 14, padY: 10, radius: 10 },
      lg: { h: 48, font: 20, padX: 16, padY: 14, radius: 12 }
    };
    const S = sizes[size] || sizes.md;

    this.w = width || 320;
    this.h = S.h;

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

    this.patch({
      shader: { type: lng.shaders.RoundedRect, radius: S.radius, stroke: 1, strokeColor: borderColor },
      color: bg,
      FocusRing: {
        x: this.w / 2, y: this.h / 2, w: this.w + 8, h: this.h + 8,
        shader: { type: lng.shaders.RoundedRect, radius: S.radius + 2, stroke: 2, strokeColor: withAlpha(primaryHex, 0.9) },
        visible: this.hasFocus() && !disabled
      },
      TextField: {
        x: S.padX, y: S.padY,
        text: { text: value || '', fontSize: S.font, textColor: disabled ? withAlpha(textColor, 0.5) : toArgb(textColor), maxLines: 1 }
      },
      Placeholder: {
        x: S.padX, y: S.padY,
        text: { text: (!value ? placeholder : ''), fontSize: S.font, textColor: withAlpha(textColor, 0.6) },
        visible: !value
      },
      Cursor: {
        y: S.padY,
        h: S.font,
        x: S.padX + this._measureText(value?.slice(0, this._cursorIndex) || '', S.font),
        color: toArgb(textColor),
        alpha: this.hasFocus() && !disabled ? 1 : 0
      }
    });

    this.pointerEnabled = !disabled;
    if (this.hasFocus() && !disabled) {
      this._startBlink();
    } else {
      this._stopBlink();
    }
  }

  _measureText(text, size) {
    // Basic estimate using average width factor for simple monospace-like cursor positioning
    const avgFactor = 0.56; // approximate average for typical sans-serif
    return Math.round(text.length * size * avgFactor);
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

    const { key } = event;
    let v = this._props.value || '';
    let idx = this._cursorIndex;

    if (key === 'Enter') {
      if (typeof this._props.onSubmit === 'function') {
        this._props.onSubmit(v);
      }
      return true;
    }
    if (key === 'Backspace') {
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
    // approximate click -> set cursor position to end
    this._cursorIndex = (this._props.value || '').length;
    this._applyProps();
  }
}
