# Design System Strategy: The Sovereign Architect

## 1. Overview & Creative North Star
The "Sovereign Architect" is the creative North Star for this design system. In the world of Enterprise Test Case Management (TCMS), we reject the chaotic, cluttered spreadsheets of the past. Instead, we embrace **Architectural Clarity**. 

This system treats data as a high-end editorial layout. We move beyond "standard UI" by leveraging intentional white space, tonal depth, and a "layered-glass" philosophy. The goal is to make the QA engineer feel like an orchestrator of quality, providing a high-trust environment where the interface recedes to let the data lead, but asserts its premium nature through sophisticated transitions and impeccable typography.

---

## 2. Colors & The Surface Philosophy
The palette is rooted in a deep indigo (`primary`) to evoke institutional reliability, supported by a functional spectrum of emerald (`secondary`) and coral (`tertiary`).

### The "No-Line" Rule
To achieve a high-end feel, **this design system prohibits 1px solid borders for sectioning.** Structural separation must be achieved through:
- **Background Shifts:** Placing a `surface-container-low` section against a `surface` background.
- **Nesting Tiers:** Using the `surface-container` tokens (Lowest to Highest) to create organic depth.

### Surface Hierarchy & Nesting
Treat the UI as physical layers. An application shell might use `surface-container-lowest`, while a side panel uses `surface-container-low`. Inner content cards should utilize `surface-container-high` to "lift" the data toward the user.

### The "Glass & Gradient" Rule
- **Floating Elements:** Modals and dropdowns must use semi-transparent `surface` colors with a 12px-20px backdrop-blur to create a "frosted glass" effect.
- **Signature Textures:** Main CTAs should not be flat. Use a subtle linear gradient from `primary` (#0c277c) to `primary_container` (#2a4093) at a 135-degree angle to add "soul" and dimension.

---

## 3. Typography: Editorial Authority
We use **Inter** not just for readability, but as a tool for hierarchy. By utilizing a wide scale, we create an "Editorial" feel that guides the eye.

- **Display & Headlines:** Use `display-md` for high-level dashboard metrics. The contrast between large display type and small, precise labels creates a professional, data-rich atmosphere.
- **Body & Labels:** `body-md` is our workhorse for test case descriptions. Use `label-sm` for metadata (e.g., "Last Run," "Priority") to maintain high data density without visual noise.
- **Tonal Contrast:** Never use pure black for text. Use `on_surface_variant` (#444651) for secondary information to reduce cognitive load.

---

## 4. Elevation & Depth: Tonal Layering
Traditional box-shadows are often "muddy." This system uses **Ambient Light Simulation**.

- **The Layering Principle:** Place `surface_container_highest` cards on a `surface_dim` background to create a "natural lift" without a single shadow.
- **Ambient Shadows:** When a shadow is required (e.g., a floating Action Button), use a blur of 16px-24px with the color `on_surface` at 5% opacity. This mimics natural light rather than a digital drop shadow.
- **The "Ghost Border" Fallback:** If a container requires a boundary (e.g., in Dark Mode), use `outline_variant` at 15% opacity. Never use 100% opacity borders.
- **Glassmorphism:** Apply a `surface_tint` at 4% opacity over glass elements to give them a subtle indigo hue, tying the elevation back to the brand identity.

---

## 5. Components

### Buttons
- **Primary:** Gradient-filled (`primary` to `primary_container`), `lg` (8px) rounded corners. Text is `on_primary`.
- **Secondary:** Surface-filled (`surface_container_high`) with `on_surface` text. No border.
- **States:** Hover states should involve a brightness increase of 5%, rather than a color change, to maintain tonal integrity.

### Input Fields
- **Treatment:** Use `surface_container_lowest` as the fill. 
- **Focus:** No heavy borders. On focus, apply a 2px "Ghost Border" of `primary` at 40% opacity and a subtle `primary_fixed` outer glow.

### Cards & Lists (Data Density)
- **Rule:** **Forbid the use of divider lines.** 
- **Separation:** Use `8px` or `16px` vertical breathing room. In tables, use alternating row tints (`surface` and `surface_container_low`) to separate data.
- **Chips:** Status chips (Pass/Fail) use `secondary_container` (Emerald) and `tertiary_container` (Coral). Text should be the "on-container" variant for maximum legibility.

### TCMS Specific Components
- **The Execution Ribbon:** A slim, glassmorphic bar at the bottom of the screen for "Run" controls, using backdrop-blur to stay integrated with the test steps behind it.
- **Step Trays:** Nested containers using `surface_container_highest` to group test steps, providing a clear visual "bucket" for complex logic.

---

## 6. Do's and Don'ts

### Do:
- **Do** prioritize "Negative Space" over "Lines." Use the spacing scale to let the UI breathe.
- **Do** use `8px` (`lg`) rounding for all containers to soften the "Enterprise" feel.
- **Do** ensure that in Dark Mode, the `surface_dim` and `surface_container` tokens provide enough contrast for the "No-Line" rule to function.

### Don't:
- **Don't** use 100% black (#000000) or 100% white (#ffffff) for backgrounds; use the specific `surface` tokens to maintain the indigo-tinted "High-Trust" aesthetic.
- **Don't** use high-contrast borders. If a boundary is invisible, use a subtle background shift first.
- **Don't** clutter the screen with icons. Use typography and color (`secondary`/`tertiary`) to signal status first.