"""
Page Object for the /select page (View Mode selection).

After login, the user lands here and sees two cards: "DP View" and "GM View".
Selecting GM View → group search → group card click → dealer modal → dealer click → dashboard.

Selectors derived from J3_Scraping/src/navigator.py and scrape_dealer_dashboard.py.
"""
from playwright.sync_api import Page

from pages.dynamic_locator import DynamicLocator

_SEARCH_INPUT_SELECTORS = [
    'input[type="search"]',
    'input[placeholder*="earch"]',
    'input[placeholder*="ilter"]',
    'input[placeholder*="ind"]',
    'input[aria-label*="earch"]',
    'input[role="searchbox"]',
    'input[name="search"]',
]

_SKELETON_SELECTORS = [
    '[class*="skeleton"]',
    '[class*="Skeleton"]',
    '[class*="shimmer"]',
    '[class*="loading"]',
    '[class*="placeholder"]',
    '[role="progressbar"]',
    '.animate-pulse',
]


class SelectViewPage:
    def __init__(self, page: Page):
        self._page = page
        self._dl = DynamicLocator(page)

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _wait_for_content(self) -> None:
        """Wait for skeleton/loading indicators to disappear."""
        for sel in _SKELETON_SELECTORS:
            try:
                el = self._page.query_selector(sel)
                if el:
                    self._page.wait_for_selector(sel, state="hidden", timeout=2000)
            except Exception:
                pass
        self._page.wait_for_timeout(300)

    def _find_search_input(self):
        """Return the first visible search input locator, or None."""
        for sel in _SEARCH_INPUT_SELECTORS:
            try:
                loc = self._page.locator(sel).first
                if loc.is_visible(timeout=2000):
                    return loc
            except Exception:
                pass
        return None

    # ── Queries ────────────────────────────────────────────────────────────────

    def is_on_select_page(self) -> bool:
        return "/select" in self._page.url

    def is_gm_view_visible(self) -> bool:
        try:
            return self._page.locator('text="GM View"').first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_dp_view_visible(self) -> bool:
        try:
            return self._page.locator('text="DP View"').first.is_visible(timeout=5000)
        except Exception:
            return False

    # ── Actions ────────────────────────────────────────────────────────────────

    def click_gm_view(self) -> None:
        """Click 'GM View' card and wait for search input to appear."""
        self._page.wait_for_selector('text="GM View"', timeout=15000)
        self._page.click('text="GM View"')
        self._page.wait_for_load_state("domcontentloaded")
        self._wait_for_content()
        try:
            combined = ", ".join(_SEARCH_INPUT_SELECTORS[:2])
            self._page.wait_for_selector(combined, timeout=10000)
        except Exception:
            pass

    def click_dp_view(self) -> None:
        """Click 'DP View' card and wait for search input to appear."""
        self._page.wait_for_selector('text="DP View"', timeout=15000)
        self._page.click('text="DP View"')
        self._page.wait_for_load_state("domcontentloaded")
        self._wait_for_content()
        try:
            combined = ", ".join(_SEARCH_INPUT_SELECTORS[:2])
            self._page.wait_for_selector(combined, timeout=10000)
        except Exception:
            pass

    def is_search_input_visible(self) -> bool:
        """Check if the group search input appeared after selecting a view."""
        return self._find_search_input() is not None

    def search_and_select_group(self, group_name: str) -> None:
        """Type a group name in the search input, then click the matching card.

        Translated from navigator.py → search_dealer_group().
        """
        search = self._find_search_input()
        if not search:
            raise RuntimeError("Group search input not found.")

        search.click()
        search.fill("")
        self._page.wait_for_timeout(300)
        search.type(group_name, delay=20)
        self._page.wait_for_timeout(800)

        # Strategy 1: JS locates the card and returns centre coords for a real
        # mouse click (React needs real pointer events for navigation).
        coords = self._page.evaluate("""(groupName) => {
            const searchEl = document.querySelector(
                'input[placeholder*="earch"], input[type="search"], input[role="searchbox"]'
            );
            if (!searchEl) return null;
            const inputBottom = searchEl.getBoundingClientRect().bottom;

            const candidates = [];
            for (const el of document.querySelectorAll('div,li,a,button,article,section')) {
                const rect = el.getBoundingClientRect();
                if (rect.top < inputBottom + 2) continue;
                if (rect.height < 40 || rect.height > 150) continue;
                if (rect.width < 150) continue;
                if (!el.textContent.trim().includes(groupName)) continue;
                candidates.push({
                    top: rect.top,
                    area: rect.width * rect.height,
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                });
            }
            if (candidates.length === 0) return null;
            candidates.sort((a, b) => a.top !== b.top ? a.top - b.top : b.area - a.area);
            return { x: candidates[0].x, y: candidates[0].y };
        }""", group_name)

        if coords:
            self._page.mouse.click(coords["x"], coords["y"])
        else:
            # Strategy 2: bounding-box fallback — click below the search bar
            box = search.bounding_box()
            if box:
                self._page.mouse.click(
                    box["x"] + box["width"] / 2,
                    box["y"] + box["height"] + 50,
                )
            else:
                raise RuntimeError(f"Could not click group card for '{group_name}'.")

        self._page.wait_for_load_state("domcontentloaded")
        self._page.wait_for_timeout(1500)
        self._wait_for_content()

    def is_dealer_modal_visible(self) -> bool:
        """Check if the 'Select Dealership' modal appeared after group selection."""
        try:
            return self._page.locator('text="Select Dealership"').first.is_visible(timeout=8000)
        except Exception:
            return False

    def search_and_select_dealer(self, dealer_name: str) -> None:
        """Inside the 'Select Dealership' modal, search and click a dealer.

        Translated from scrape_dealer_dashboard.py → _click_dealer_card().
        """
        # Wait for modal list to render
        self._page.wait_for_timeout(2000)
        self._wait_for_content()

        search = self._find_search_input()
        if search:
            search.click()
            search.fill("")
            self._page.wait_for_timeout(300)
            search.type(dealer_name, delay=20)
            self._page.wait_for_timeout(2000)

        clicked = False

        # Strategy 1: role="option" or li containing dealer name
        for selector in [
            f'[role="option"]:has-text("{dealer_name}")',
            f'li:has-text("{dealer_name}")',
        ]:
            if clicked:
                break
            try:
                option = self._page.locator(selector).first
                if option.is_visible(timeout=3000):
                    option.click(timeout=8000)
                    clicked = True
            except Exception:
                pass

        # Strategy 2: JS coordinate click (handles React cards)
        if not clicked:
            coords = self._page.evaluate("""(dealerName) => {
                const searchEl = document.querySelector(
                    'input[placeholder*="earch"], input[type="search"], input[role="searchbox"]'
                );
                const inputBottom = searchEl ? searchEl.getBoundingClientRect().bottom : 100;
                const upperName = dealerName.toUpperCase();
                const sigWords = upperName.split(/\\s+/).filter(w => w.length > 2);

                let best = null, bestScore = -1;
                for (const el of document.querySelectorAll('div,li,a,button,span,p')) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top < inputBottom) continue;
                    if (rect.height < 15 || rect.height > 300) continue;
                    if (rect.width < 80) continue;
                    const text = el.textContent.trim().toUpperCase();
                    const firstLine = text.split('\\n')[0].trim();

                    let score = -1;
                    if (text === upperName || text.startsWith(upperName)
                            || firstLine === upperName || firstLine.startsWith(upperName)) {
                        score = 1000;
                    }
                    if (score < 0 && sigWords.length > 0) {
                        const matched = sigWords.filter(w => text.includes(w)).length;
                        if (matched > 0) score = matched;
                    }
                    if (score < 0) continue;

                    const area = rect.width * rect.height;
                    if (score > bestScore || (score === bestScore && (!best || area < best.area))) {
                        bestScore = score;
                        best = { area, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                    }
                }
                return best ? { x: best.x, y: best.y } : null;
            }""", dealer_name)

            if coords:
                self._page.mouse.click(coords["x"], coords["y"])
                clicked = True

        if not clicked:
            raise RuntimeError(f"Could not click dealer card for '{dealer_name}'.")

        self._page.wait_for_load_state("domcontentloaded")
        self._page.wait_for_timeout(1500)
        self._wait_for_content()

    def is_on_dashboard(self) -> bool:
        """Check if we navigated away from /select to a dashboard page."""
        return "/select" not in self._page.url and "/login" not in self._page.url
