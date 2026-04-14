# Design System Documentation: The Ethereal Architect

## 1. Overview & Creative North Star: "The Digital Curator"
This design system moves away from the heavy, grounded weight of traditional enterprise software toward a philosophy of **The Digital Curator**. We are transitioning from the "Sovereign Architect"—which felt like heavy stone and dark wood—to a lighter, more airy "Glass Pavilion" aesthetic. 

The goal is to convey professional authority not through bulk, but through precision, intentional whitespace, and sophisticated tonal layering. We reject the "template" look of rigid grids and 1px borders. Instead, we embrace **intentional asymmetry** and **overlapping planes** to create a UI that feels like a high-end editorial spread.

### The Creative North Star:
*   **Precision over Bulk:** Use thin strokes and generous tracking.
*   **Atmosphere over Structure:** Define regions with light and color shifts rather than lines.
*   **Architectural Depth:** Treat the screen as a 3D space with varying levels of translucency and "glass" surfaces.

---

## 2. Colors & Surface Philosophy
The palette has been purged of muddy earth tones in favor of a vibrant, high-performance range of indigos, teals, and ambers.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. Boundaries must be defined solely through background color shifts. Use `surface-container-low` for secondary regions and `surface-container-lowest` for primary focal points.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, fine papers. 
*   **Background (`#f5f7f9`):** The base canvas.
*   **Surface Container Low (`#eef1f3`):** Large structural sidebars or secondary content areas.
*   **Surface Container Lowest (`#ffffff`):** The "Top Layer." Use this for cards and primary interaction zones to make them pop against the slightly darker background.

### The "Glass & Gradient" Rule
To elevate CTAs, move beyond flat fills. Use subtle linear gradients transitioning from `primary` (#005bb0) to `primary_container` (#62a1fe) at a 135-degree angle. For floating navigation or modal overlays, apply a **Glassmorphism** effect:
*   **Fill:** `surface` at 70% opacity.
*   **Blur:** 20px Backdrop Blur.
*   **Edge:** A 1px "Ghost Border" (see Elevation & Depth).

---

## 3. Typography: The Editorial Voice
We utilize a dual-typeface system to balance technical precision with high-end character.

*   **Display & Headlines (Manrope):** This geometric sans-serif provides the "Architect" feel. Use `display-lg` (3.5rem) with tighter letter-spacing (-0.02em) for hero moments. The generous x-height of Manrope ensures authority even in "airy" layouts.
*   **Body & UI Labels (Inter):** The industry standard for legibility. Use `body-md` (0.875rem) for the majority of data-dense enterprise views. 
*   **The Hierarchy Rule:** Never use two bold weights next to each other. Pair a `headline-sm` (Manrope Bold) with a `label-md` (Inter Medium, All Caps, 0.05em tracking) to create a sophisticated, high-contrast editorial look.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "software-standard." We use **Ambient Light** and **Tonal Stacking**.

*   **The Layering Principle:** Place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#eef1f3) background. The 4% luminance shift is enough to define the edge without a line.
*   **Ambient Shadows:** If a card must float, use a multi-layered shadow:
    *   `box-shadow: 0 4px 20px rgba(44, 47, 49, 0.04), 0 2px 4px rgba(44, 47, 49, 0.02);`
    *   The shadow color is derived from `on_surface` (#2c2f31), never pure black.
*   **The "Ghost Border" Fallback:** For high-accessibility needs, use the `outline_variant` (#abadaf) at **15% opacity**. This creates a hint of a boundary that disappears into the aesthetic rather than cutting it.

---

## 5. Components
### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`). `0.375rem` (md) radius. No border.
*   **Secondary:** Ghost style. No fill, `outline_variant` at 20% opacity. Text in `primary`.
*   **Tertiary:** No container. Underline on hover only.

### Cards & Lists
*   **The Divider Ban:** Dividers are forbidden. Separate list items using 12px of vertical whitespace or a subtle hover state shift to `surface_container_high`.
*   **Data Cards:** Use `surface_container_lowest` with a `0.75rem` (xl) corner radius.

### Input Fields
*   **Resting State:** `surface_container` fill, no border. 
*   **Focus State:** 2px solid `primary_container`. The background remains `surface_container_lowest` to "light up" the field.

### Signature Component: The "Architectural Breadcrumb"
Instead of standard text links, use `label-sm` in all caps with `primary_dim` colors, separated by a 24px horizontal line in `outline_variant` (10% opacity). This emphasizes the "curated" horizontal flow.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical margins. If the left margin is 80px, try a right margin of 120px for a sophisticated, off-center balance.
*   **Do** lean into the "Teal" (`secondary`) for success states and data visualization; it feels more modern than a standard "forest green."
*   **Do** use `tertiary` (Amber) sparingly. It is a "Gold Leaf" accent meant to draw the eye to critical warnings or premium features.

### Don’t:
*   **Don’t** use dark grey or "muddy" backgrounds. If the UI feels heavy, move the background toward `surface_container_lowest`.
*   **Don’t** use 100% opaque borders. They act as "visual speed bumps" and ruin the airy feel.
*   **Don’t** use standard "Material Design" blue. Always use our specific `primary` (#005bb0) which has a deeper, more professional indigo undertone.

---

## 7. Token Reference (Condensed)
*   **Primary Action:** `#005bb0`
*   **Success/Secondary:** `#006666` (Vibrant Teal)
*   **Warning/Tertiary:** `#7b5400` (Amber)
*   **Surface Max:** `#ffffff` (Card tops)
*   **Surface Base:** `#f5f7f9` (App background)
*   **Radius:** `md (0.375rem)` for interactions; `xl (0.75rem)` for containers.