import lng from '@lightningjs/core';
import { theme } from '../theme.js';

/**
 * PUBLIC_INTERFACE
 * IconButton: A reusable, themed icon button with hover, focus ring, active, and disabled states.
 * 
 * Props:
 * - icon: string | Texture | function => Icon content (text glyph, image texture, or custom render function).
 * - label: string => Accessible label for the button (and optional visual label if showLabel is true).
 * - showLabel: boolean => If true, renders the label next to the icon.
 * - disabled: boolean => If true, disables interactions and applies disabled styles.
 * - primary: boolean => If true, uses primary color accent background on hover/active.
 * - onClick: function => Invoked when the button is "pressed" (Enter/OK or click).
 * - size: 'sm' | 'md' | 'lg' => Controls padding and icon size.
 * - tabIndex: number => Optional focus order index, defaults to 0 for focusable.
 * 
 * Usage:
 *   <IconButton icon="＋" label="Add note" onClick={() => {}} primary />
 */
export default class IconButton extends lng.Component {
  static _template() {
    return {
      w: 44,
      h: 40,
      rect: true,
      rtt: true,
      shader: { type: lng.shaders.RoundedRect, radius: 8 },
      color: 0x00ffffff, // transparent by default
      alpha: 1,
      FocusRing: {
        mount: 0.5, x: 22, y: 20, w: 48, h: 44, rect: true,
        shader: { type: lng.shaders.RoundedRect, radius: 10, stroke: 2, strokeColor: 0x00000000 },
        color: 0x00000000, alpha: 1, visible: false
      },
      Content: {
        x: 10, y: 8,
        Icon: {
          text: { text: '', fontSize: 20, textColor: 0xff111827 }
        },
        Label: {
          x: 8,
          text: { text: '', fontSize: 16, textColor: 0xff111827 }
        }
      }
    };
  }

  _construct() {
    this._props = {
      icon: '',
      label: '',
      showLabel: false,
      disabled: false,
      primary: false,
      onClick: null,
      size: 'md',
      tabIndex: 0
    };
    this._hovered = false;
    this._pressed = false;
  }

  // PUBLIC_INTERFACE
  set props(v) {
    /** Sets props for IconButton and re-renders accordingly. */
    this._props = { ...this._props, ...(v || {}) };
    this._applyProps();
  }

  get props() {
    return this._props;
  }

  _applyProps() {
    const { icon, label, showLabel, disabled, primary, size } = this._props;

    const sizes = {
      sm: { w: 36, h: 32, padX: 8, padY: 6, icon: 16, label: 14, radius: 8 },
      md: { w: 44, h: 40, padX: 10, padY: 8, icon: 20, label: 16, radius: 10 },
      lg: { w: 52, h: 48, padX: 12, padY: 10, icon: 24, label: 18, radius: 12 }
    };
    const S = sizes[size] || sizes.md;

    this.w = showLabel ? (S.w + 100) : S.w;
    this.h = S.h;

    // Base surface color
    const surface = theme?.surface || '#ffffff';
    const textColor = theme?.text || '#111827';
    const primaryHex = theme?.primary || '#2563EB';
    const disabledAlpha = 0.5;

    const colorToArgb = (hex) => {
      // Accepts '#RRGGBB' or '#AARRGGBB'
      const h = (hex || '').replace('#', '');
      if (h.length === 8) {
        return Number('0x' + h);
      }
      return Number('0xff' + h);
    };

    const toAlpha = (hex, alpha) => {
      const argb = colorToArgb(hex);
      const a = Math.max(0, Math.min(1, alpha));
      const aByte = Math.round(a * 255);
      const rgb = argb & 0x00ffffff;
      return (aByte << 24) | rgb;
    };

    // Update content positions and sizes
    this.patch({
      shader: { type: lng.shaders.RoundedRect, radius: S.radius },
      FocusRing: {
        x: this.w / 2, y: this.h / 2, w: this.w + 4, h: this.h + 4,
        shader: { type: lng.shaders.RoundedRect, radius: S.radius + 2 },
      },
      Content: {
        x: S.padX, y: S.padY,
        Icon: {
          text: {
            text: typeof icon === 'string' ? icon : '',
            fontSize: S.icon,
            textColor: disabled ? toAlpha(textColor, disabledAlpha) : colorToArgb(textColor)
          },
          texture: typeof icon !== 'string' ? icon : undefined
        },
        Label: {
          x: typeof icon === 'string' && showLabel ? (S.icon + 8) : 0,
          text: {
            text: showLabel ? (label || '') : '',
            fontSize: S.label,
            textColor: disabled ? toAlpha(textColor, disabledAlpha) : colorToArgb(textColor)
          },
          visible: !!showLabel
        }
      }
    });

    // Background & interaction visuals
    const baseBg = toAlpha(surface, disabled ? 0.6 : 1);
    const hoverBg = primary ? toAlpha(primaryHex, disabled ? 0.2 : 0.12) : toAlpha('#000000', disabled ? 0.04 : 0.05);
    const activeBg = primary ? toAlpha(primaryHex, disabled ? 0.25 : 0.2) : toAlpha('#000000', disabled ? 0.06 : 0.08);

    if (this._pressed) {
      this.color = activeBg;
    } else if (this._hovered) {
      this.color = hoverBg;
    } else {
      this.color = baseBg;
    }

    this.alpha = disabled ? 0.7 : 1;

    // Focus ring visibility and color
    const focusRingColor = toAlpha(primaryHex, 0.9);
    this.tag('FocusRing').patch({
      visible: this.hasFocus() && !disabled,
      shader: { type: lng.shaders.RoundedRect, radius: S.radius + 2, stroke: 2, strokeColor: focusRingColor }
    });

    // Pointer enablement
    this.pointerEnabled = !disabled;
  }

  _focus() {
    this.tag('FocusRing').visible = !this._props.disabled;
    this._applyProps();
  }

  _unfocus() {
    this.tag('FocusRing').visible = false;
    this._applyProps();
  }

  _handleEnter() {
    if (this._props.disabled) return;
    if (typeof this._props.onClick === 'function') {
      this._props.onClick();
    }
  }

  _handleClick() {
    this._handleEnter();
  }

  _handleMouseEnter() {
    if (this._props.disabled) return;
    this._hovered = true;
    this.setSmooth('scale', 1.03, { duration: 0.12 });
    this._applyProps();
  }

  _handleMouseLeave() {
    this._hovered = false;
    this._pressed = false;
    this.setSmooth('scale', 1.0, { duration: 0.12 });
    this._applyProps();
  }

  _handleMouseDown() {
    if (this._props.disabled) return;
    this._pressed = true;
    this.setSmooth('scale', 0.98, { duration: 0.08 });
    this._applyProps();
  }

  _handleMouseUp() {
    if (this._props.disabled) return;
    this._pressed = false;
    this.setSmooth('scale', this._hovered ? 1.03 : 1.0, { duration: 0.1 });
    this._applyProps();
  }
}
