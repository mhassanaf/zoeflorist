---
name: Organic Elegance
colors:
  surface: '#fff8f6'
  surface-dim: '#e8d7d0'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1eb'
  surface-container: '#fceae3'
  surface-container-high: '#f6e5de'
  surface-container-highest: '#f0dfd8'
  on-surface: '#221a16'
  on-surface-variant: '#504440'
  inverse-surface: '#382e2a'
  inverse-on-surface: '#ffede6'
  outline: '#83746f'
  outline-variant: '#d5c3bd'
  surface-tint: '#7b5549'
  primary: '#7b5549'
  on-primary: '#ffffff'
  primary-container: '#f7c5b5'
  on-primary-container: '#755043'
  inverse-primary: '#edbcac'
  secondary: '#a13d3d'
  on-secondary: '#ffffff'
  secondary-container: '#fe8481'
  on-secondary-container: '#751c1f'
  tertiary: '#715a47'
  on-tertiary: '#ffffff'
  tertiary-container: '#eacab3'
  on-tertiary-container: '#6b5442'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcf'
  primary-fixed-dim: '#edbcac'
  on-primary-fixed: '#2f140b'
  on-primary-fixed-variant: '#613e33'
  secondary-fixed: '#ffdad8'
  secondary-fixed-dim: '#ffb3af'
  on-secondary-fixed: '#410006'
  on-secondary-fixed-variant: '#812628'
  tertiary-fixed: '#fddcc4'
  tertiary-fixed-dim: '#e0c1aa'
  on-tertiary-fixed: '#281809'
  on-tertiary-fixed-variant: '#584231'
  background: '#fff8f6'
  on-background: '#221a16'
  surface-variant: '#f0dfd8'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 56px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  section-gap: 120px
---

## Brand & Style
The design system focuses on a **Premium Minimalist** aesthetic with a warm, organic undertone. It is designed to evoke feelings of serenity, romance, and curated luxury, catering to a discerning audience looking for artisanal floral arrangements. 

The visual narrative relies on high-quality editorial photography, expansive whitespace, and a "soft-touch" interface that mimics the delicate nature of petals. Interactions should feel fluid and intentional, utilizing gentle transitions to reinforce the brand's sophisticated and welcoming persona.

## Colors
The palette is rooted in an earthy, floral-inspired spectrum. 
- **Primary (#F7C5B5):** A soft petal pink used for key call-to-actions and highlights.
- **Secondary (#9E3B3B):** A deep rose used for high-contrast elements and critical status indicators.
- **Background (#FAF4F0):** A warm off-white that prevents the "starkness" of pure white, providing a cozy, high-end paper feel.
- **Text (#5E524D):** A soft charcoal-brown that maintains readability while appearing softer and more organic than pure black.

## Typography
This design system employs a classic serif-and-sans pairing. **Playfair Display** provides the editorial "luxury" feel for headlines and product titles. **Inter** is utilized for all functional and body text to ensure maximum legibility and a contemporary edge. 

For display text, use tight tracking and line heights to create a structured, professional look. Body text should maintain generous line spacing (1.6x) to facilitate a relaxed reading experience.

## Layout & Spacing
The layout follows a **Fluid Grid** model with an emphasis on "negative space as a feature." 

- **Desktop:** 12-column grid with a 1280px max-width. Use wide 64px margins to frame the content like a magazine spread.
- **Mobile:** Single-column layout with 16px margins. 
- **Rhythm:** Use multiples of 8px for all internal spacing. Vertical section gaps should be generous (80px to 120px) to allow individual floral arrangements to "breathe" without visual competition.

## Elevation & Depth
Depth is achieved through **Soft Ambient Shadows** and tonal layering. 
- Avoid heavy black shadows; instead, use shadows tinted with the primary or neutral colors (e.g., a soft #5E524D shadow at 8% opacity).
- **Surface Tiering:** Use the secondary background color (#D2C9C4) at low opacities (10-20%) to create subtle "wells" or "recessed" areas for input fields and secondary containers.
- **Interactions:** When hovering over product cards, the elevation should increase subtly with a slightly larger shadow spread and a 1-2% scale increase.

## Shapes
The shape language is dominated by **Large Radii**. 
- Standard UI components (buttons, inputs) use a `0.5rem` (8px) radius.
- Featured elements (product cards, modal containers) use a `1rem` (16px) or `1.5rem` (24px) radius to emphasize the "soft and friendly" brand personality.
- Images should always feature rounded corners to harmonize with the soft-edge aesthetic of flower petals.

## Components
- **Buttons:** Primary buttons use a solid #F7C5B5 fill with #5E524D text. Secondary buttons use an outline style with #BFA28C. Use a "capsule" or high-radius shape for a modern look.
- **Product Cards:** Minimalist borders or no borders at all. Use a light background tint (#FAF4F0) and a soft shadow on hover. Typography inside cards should be strictly hierarchical (Serif for Title, Sans for Price).
- **Input Fields:** Soft-tinted backgrounds (#D2C9C4 at 15% opacity) with bottom-only borders or very subtle all-around borders. No harsh black outlines.
- **Chips/Filters:** Use the primary accent color (#F7C5B5) for selected states with high roundedness.
- **Transitions:** Use `cubic-bezier(0.4, 0, 0.2, 1)` for all hover and active states to ensure a "natural" feeling of movement.