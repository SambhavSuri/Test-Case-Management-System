"""
DynamicLocator — multi-strategy element finder for Playwright POM methods.

Provides resilient element location by trying multiple strategies in order
(data-testid, role+name, text, CSS selector, placeholder, label).
Returns the first visible match, making tests more robust against UI changes.

Usage in a POM:
    from pages.dynamic_locator import DynamicLocator

    class MyPage:
        def __init__(self, page: Page):
            self._page = page
            self._dl = DynamicLocator(page)

        def click_submit(self):
            self._dl.find_and_click([
                ("testid", "submit-btn"),
                ("role", "button", "Submit"),
                ("text", "Submit"),
                ("css", 'button[type="submit"]'),
            ])
"""
import logging
from typing import Optional

from playwright.sync_api import Locator, Page

logger = logging.getLogger("ui_tests.dynamic_locator")


class DynamicLocator:
    """Multi-strategy element finder wrapping a Playwright Page."""

    DEFAULT_TIMEOUT = 3000  # ms per strategy attempt

    def __init__(self, page: Page, timeout: int = DEFAULT_TIMEOUT):
        self._page = page
        self._timeout = timeout

    # ── Core: find ────────────────────────────────────────────────────────────

    def find(
        self,
        strategies: list,
        *,
        timeout: int = None,
        required: bool = False,
    ) -> Optional[Locator]:
        """Try strategies in order; return first visible Locator, or None.

        Each strategy is a tuple:
            ("css", "button.primary")
            ("text", "Sign In")                 # exact=False
            ("text_exact", "SUBMIT")            # exact=True
            ("role", "button", "Submit")        # role + accessible name
            ("testid", "login-btn")             # data-testid
            ("label", "Email address")          # get_by_label
            ("placeholder", "Enter email")      # get_by_placeholder

        If all explicit strategies fail, auto-healing kicks in:
        it extracts hints (text, role) from the failed strategies and
        tries fuzzy/relaxed matching before giving up.
        """
        t = timeout if timeout is not None else self._timeout
        for strategy in strategies:
            try:
                loc = self._resolve(strategy)
                if loc and loc.first.is_visible(timeout=t):
                    logger.debug("find: matched strategy %s", strategy)
                    return loc.first
            except Exception:
                continue

        # ── Auto-healing: all explicit strategies failed ─────────────────────
        healed = self._auto_heal(strategies, timeout=t)
        if healed:
            return healed

        if required:
            raise RuntimeError(
                f"DynamicLocator.find: no strategy matched from {strategies}"
            )
        return None

    # ── Core: action helpers ──────────────────────────────────────────────────

    def find_and_click(
        self, strategies: list, *, timeout: int = None, wait_after: int = 500
    ) -> bool:
        """Find element, click it. Returns True if clicked."""
        loc = self.find(strategies, timeout=timeout)
        if loc:
            loc.click()
            if wait_after:
                self._page.wait_for_timeout(wait_after)
            return True
        return False

    def find_and_fill(
        self, strategies: list, value: str, *, timeout: int = None
    ) -> bool:
        """Find input element, fill it. Returns True if filled."""
        loc = self.find(strategies, timeout=timeout)
        if loc:
            loc.fill(value)
            return True
        return False

    def find_text(self, strategies: list, *, timeout: int = None) -> str:
        """Find element, return its inner_text(). Returns '' if not found."""
        loc = self.find(strategies, timeout=timeout)
        if loc:
            try:
                return loc.inner_text().strip()
            except Exception:
                return ""
        return ""

    def find_input_value(self, strategies: list, *, timeout: int = None) -> str:
        """Find input, return its value. Returns '' if not found."""
        loc = self.find(strategies, timeout=timeout)
        if loc:
            try:
                return loc.input_value()
            except Exception:
                return ""
        return ""

    def find_attribute(
        self, strategies: list, attr: str, *, timeout: int = None
    ) -> str:
        """Find element, return attribute value. Returns '' if not found."""
        loc = self.find(strategies, timeout=timeout)
        if loc:
            return loc.get_attribute(attr) or ""
        return ""

    def is_visible(self, strategies: list, *, timeout: int = None) -> bool:
        """Return True if any strategy finds a visible element."""
        return self.find(strategies, timeout=timeout) is not None

    # ── Convenience: common UI patterns ───────────────────────────────────────

    def find_button(self, name: str, *, timeout: int = None) -> Optional[Locator]:
        """Find a button by multiple strategies: role, text, css."""
        return self.find([
            ("role", "button", name),
            ("text", name),
            ("css", f'button:has-text("{name}")'),
        ], timeout=timeout)

    def click_button(self, name: str, *, timeout: int = None, wait_after: int = 500) -> bool:
        """Find and click a button by name."""
        return self.find_and_click([
            ("role", "button", name),
            ("text", name),
            ("css", f'button:has-text("{name}")'),
        ], timeout=timeout, wait_after=wait_after)

    def find_tab(self, name: str, *, timeout: int = None) -> Optional[Locator]:
        """Find a tab button (Radix UI pattern)."""
        return self.find([
            ("css", f'button[role="tab"]:has-text("{name}")'),
            ("role", "tab", name),
            ("text", name),
        ], timeout=timeout)

    def click_tab(self, name: str, *, timeout: int = None, wait_after: int = 1000) -> bool:
        """Find and click a tab by name."""
        return self.find_and_click([
            ("css", f'button[role="tab"]:has-text("{name}")'),
            ("role", "tab", name),
        ], timeout=timeout, wait_after=wait_after)

    def find_input_near_label(
        self, label: str, *, timeout: int = None
    ) -> Optional[Locator]:
        """Find an input associated with a label."""
        return self.find([
            ("label", label),
            ("placeholder", label),
            ("css", f'input[placeholder*="{label}"]'),
        ], timeout=timeout)

    # ── Body text helpers (replaces _body_text() in 5 POMs) ──────────────────

    def body_text(self) -> str:
        """Return full body innerText."""
        try:
            return self._page.evaluate("() => document.body.innerText")
        except Exception:
            return ""

    def body_contains(self, text: str) -> bool:
        """Check if body innerText contains the given text."""
        try:
            return bool(self._page.evaluate(
                "(t) => document.body.innerText.includes(t)", text
            ))
        except Exception:
            return False

    def extract_section_text(self, heading: str, char_limit: int = 300) -> str:
        """Extract text from a section identified by its heading."""
        try:
            return self._page.evaluate("""(args) => {
                const [heading, limit] = args;
                const text = document.body.innerText;
                const idx = text.indexOf(heading);
                if (idx < 0) return '';
                return text.substring(idx, idx + limit);
            }""", [heading, char_limit])
        except Exception:
            return ""

    # ── Radix UI helpers ─────────────────────────────────────────────────────

    def find_in_radix_popper(self) -> list:
        """Extract visible option texts from an open Radix popper dropdown."""
        try:
            return self._page.evaluate("""() => {
                const popper = document.querySelector('[data-radix-popper-content-wrapper]');
                if (!popper) return [];
                const divs = popper.querySelectorAll('div[data-index], [role="option"], span');
                const names = [];
                const seen = new Set();
                for (const d of divs) {
                    const text = d.textContent.trim();
                    if (d.offsetHeight > 0 && text && text.length > 2
                        && text.length < 80 && !seen.has(text) && d.children.length === 0) {
                        seen.add(text);
                        names.push(text);
                    }
                }
                return names;
            }""")
        except Exception:
            return []

    def select_radix_popper_option(self, option_text: str) -> bool:
        """Click an option in an open Radix popper dropdown."""
        try:
            return bool(self._page.evaluate("""(name) => {
                const popper = document.querySelector('[data-radix-popper-content-wrapper]');
                if (!popper) return false;
                const items = popper.querySelectorAll('div[data-index], [role="option"], span');
                for (const item of items) {
                    if (item.textContent.trim().includes(name) && item.offsetHeight > 0) {
                        item.click();
                        return true;
                    }
                }
                return false;
            }""", option_text))
        except Exception:
            return False

    # ── Auto-healing ────────────────────────────────────────────────────────

    def _auto_heal(self, failed_strategies: list, *, timeout: int = None) -> Optional[Locator]:
        """Try to find the element using relaxed/fuzzy matching.

        Extracts hints from the failed strategies and tries:
        1. Case-insensitive partial text match
        2. Role without name constraint (find any button/tab/etc.)
        3. Nearby element with similar attributes
        """
        t = timeout or 1500  # shorter timeout for healing attempts

        # Extract hints from failed strategies
        texts = []
        roles = []
        for s in failed_strategies:
            kind = s[0]
            if kind in ("text", "text_exact") and len(s) > 1:
                texts.append(s[1])
            elif kind == "role" and len(s) > 2:
                roles.append((s[1], s[2]))  # (role, name)
            elif kind == "role" and len(s) > 1:
                roles.append((s[1], None))

        # Heal 1: Case-insensitive partial text match
        for text in texts:
            try:
                # Try lowercase version
                loc = self._page.get_by_text(text, exact=False)
                if loc.first.is_visible(timeout=t):
                    logger.warning("AUTO-HEAL: fuzzy text match for '%s'", text)
                    return loc.first
            except Exception:
                pass
            try:
                # Try title case / alternate casing
                for variant in (text.lower(), text.upper(), text.title()):
                    if variant == text:
                        continue
                    loc = self._page.get_by_text(variant, exact=False)
                    if loc.first.is_visible(timeout=t):
                        logger.warning(
                            "AUTO-HEAL: case variant '%s' matched (original: '%s')",
                            variant, text,
                        )
                        return loc.first
            except Exception:
                pass

        # Heal 2: Role without name constraint (find any visible element of that role)
        for role, name in roles:
            if not name:
                continue
            try:
                # Try role with partial name (first word only)
                first_word = name.split()[0] if name else ""
                if first_word and first_word != name:
                    loc = self._page.get_by_role(role, name=first_word)
                    if loc.first.is_visible(timeout=t):
                        logger.warning(
                            "AUTO-HEAL: partial role name '%s' matched (original: '%s')",
                            first_word, name,
                        )
                        return loc.first
            except Exception:
                pass
            try:
                # Try role with no name at all — pick first visible
                loc = self._page.get_by_role(role)
                if loc.first.is_visible(timeout=t):
                    # Verify it's plausible (text contains at least one word from original name)
                    actual_text = ""
                    try:
                        actual_text = loc.first.inner_text().strip()
                    except Exception:
                        pass
                    if name and actual_text:
                        name_words = set(name.lower().split())
                        actual_words = set(actual_text.lower().split())
                        if name_words & actual_words:  # at least one word overlaps
                            logger.warning(
                                "AUTO-HEAL: role '%s' without name, matched text '%s' (original: '%s')",
                                role, actual_text, name,
                            )
                            return loc.first
            except Exception:
                pass

        # Heal 3: CSS selector with relaxed attribute matching
        for s in failed_strategies:
            if s[0] == "css" and "has-text" in s[1]:
                try:
                    # Extract the text from css selector like button:has-text("CALIBRATE")
                    import re
                    match = re.search(r'has-text\("([^"]+)"\)', s[1])
                    if match:
                        inner_text = match.group(1)
                        # Try just finding any element with that text
                        loc = self._page.locator(f'*:has-text("{inner_text}")').last
                        if loc.is_visible(timeout=t):
                            logger.warning(
                                "AUTO-HEAL: relaxed CSS text match for '%s'",
                                inner_text,
                            )
                            return loc
                except Exception:
                    pass

        return None  # truly not found

    # ── Internal ──────────────────────────────────────────────────────────────

    def _resolve(self, strategy: tuple) -> Optional[Locator]:
        """Convert a strategy tuple to a Playwright Locator."""
        kind = strategy[0]
        if kind == "css":
            return self._page.locator(strategy[1])
        elif kind == "text":
            return self._page.get_by_text(strategy[1], exact=False)
        elif kind == "text_exact":
            return self._page.get_by_text(strategy[1], exact=True)
        elif kind == "role":
            role = strategy[1]
            name = strategy[2] if len(strategy) > 2 else None
            if name:
                return self._page.get_by_role(role, name=name)
            return self._page.get_by_role(role)
        elif kind == "testid":
            return self._page.get_by_test_id(strategy[1])
        elif kind == "label":
            return self._page.get_by_label(strategy[1])
        elif kind == "placeholder":
            return self._page.get_by_placeholder(strategy[1])
        else:
            logger.warning("Unknown strategy kind: %s", kind)
            return None
