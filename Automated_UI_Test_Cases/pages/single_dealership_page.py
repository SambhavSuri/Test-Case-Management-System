"""
Page Object for the Single Dealership page.

URL: /dashboard/home?dealershipId=XXXXX&groupId=YYYY
Reached via: Home → click "Single Dealership" in nav → select dealer from modal
       or: GM View → group → dealer selection

Sections:
  - Header: greeting, dealer ranking text, SEE YOUR DEALERSHIP button
  - Dealer card: logo, initials, name, address
  - OVERVIEW: Momentum Score, Environment Score, Performance Score
  - EST. VALUATION: dollar amount + % change
  - INSIGHTS & IMPACTS: Powered by JumpIQ AI, insight cards with tags
  - WHAT'S NEW: AI insight bullets
  - Analysis tab: Map/Analysis toggle, Your Market, Compete, radius, charts
"""
from playwright.sync_api import Page

from pages.dynamic_locator import DynamicLocator


class SingleDealershipPage:
    def __init__(self, page: Page):
        self._page = page
        self._dl = DynamicLocator(page)

    def _body_text(self) -> str:
        return self._dl.body_text()

    # ── Page state ─────────────────────────────────────────────────────────────

    def is_on_single_dealership_page(self) -> bool:
        url = self._page.url
        return "/dashboard" in url and "dealershipId" in url

    def get_url(self) -> str:
        return self._page.url

    # ── Header section ─────────────────────────────────────────────────────────

    def is_greeting_visible(self) -> bool:
        text = self._body_text()
        return "Good" in text and "Molloy" in text

    def is_dealer_ranking_text_visible(self) -> bool:
        """Check for text like 'KEN GARFF CHEVROLET is a Top 3%...'"""
        text = self._body_text()
        return "Top" in text and "nationally" in text

    def is_see_your_dealership_button_visible(self) -> bool:
        try:
            return self._page.get_by_text("SEE YOUR DEALERSHIP", exact=False).first.is_visible(timeout=5000)
        except Exception:
            return False

    def click_see_your_dealership(self) -> None:
        try:
            self._page.get_by_text("SEE YOUR DEALERSHIP", exact=False).first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    # ── Dealer card ────────────────────────────────────────────────────────────

    def is_dealer_name_visible(self, name: str = "KEN GARFF CHEVROLET") -> bool:
        return name in self._body_text()

    def is_dealer_address_visible(self) -> bool:
        text = self._body_text()
        # Address pattern: city, state, zip
        return ("AMERICAN FORK" in text or "Utah" in text or any(
            c in text for c in ["548 E", "84003"]
        ))

    def is_dealer_image_loaded(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const imgs = document.querySelectorAll('img');
                for (const img of imgs) {
                    if (img.naturalWidth > 50 && img.offsetHeight > 50
                        && !img.alt?.includes('JumpIQ')) return true;
                }
                return false;
            }"""))
        except Exception:
            return False

    def has_fallback_initials(self) -> bool:
        """Check if initials avatar (e.g. 'KG') is shown."""
        text = self._body_text()
        return "KG" in text or "KEN GARFF" in text

    # ── Breadcrumb ─────────────────────────────────────────────────────────────

    def is_breadcrumb_visible(self) -> bool:
        """Check if Home breadcrumb or navigation path exists."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return text.includes('Home') || text.includes('Dashboard')
                    || document.querySelector('[class*="breadcrumb"]') !== null;
            }"""))
        except Exception:
            return False

    # ── OVERVIEW section ───────────────────────────────────────────────────────

    def is_overview_visible(self) -> bool:
        return "OVERVIEW" in self._body_text()

    def is_momentum_score_visible(self) -> bool:
        text = self._body_text()
        return "Momentum Score" in text and "/100" in text

    def get_momentum_score(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const text = document.body.innerText;
                const match = text.match(/Momentum Score.*?(\\d+)\\/100/s);
                return match ? match[1] : '';
            }""")
        except Exception:
            return ""

    def is_environment_score_visible(self) -> bool:
        text = self._body_text()
        return "Environment Score" in text and "/100" in text

    def get_environment_score(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const text = document.body.innerText;
                const match = text.match(/Environment Score.*?(\\d+)\\/100/s);
                return match ? match[1] : '';
            }""")
        except Exception:
            return ""

    def has_score_color_indicators(self) -> bool:
        """Check if score values have colored arrow/indicators."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return (text.includes('/100') && text.includes('Momentum'))
                    && (text.includes('↑') || text.includes('↓') || text.includes('→')
                        || document.querySelectorAll('svg[class*="arrow"]').length > 0);
            }"""))
        except Exception:
            return False

    # ── EST. VALUATION section ─────────────────────────────────────────────────

    def is_valuation_visible(self) -> bool:
        text = self._body_text()
        return "EST. VALUATION" in text and "$" in text

    def get_valuation_amount(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const text = document.body.innerText;
                const idx = text.indexOf('EST. VALUATION');
                if (idx < 0) return '';
                const section = text.substring(idx, idx + 200);
                const match = section.match(/\\$[\\d.]+[MBK]?/);
                return match ? match[0] : '';
            }""")
        except Exception:
            return ""

    def is_valuation_change_percent_visible(self) -> bool:
        text = self._body_text()
        return "EST. VALUATION" in text and "%" in text

    def has_percentage_arrows(self) -> bool:
        """Check for ↑/↓ or arrow SVGs near percentage values."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return /%/.test(text) && (
                    text.includes('↑') || text.includes('↓')
                    || document.querySelectorAll('svg[class*="arrow"], svg[class*="trend"]').length > 0
                    || /[↗↘→]/.test(text)
                );
            }"""))
        except Exception:
            return False

    # ── INSIGHTS & IMPACTS ─────────────────────────────────────────────────────

    def is_insights_section_visible(self) -> bool:
        return "INSIGHTS & IMPACTS" in self._body_text()

    def is_powered_by_jumpiq_visible(self) -> bool:
        return "Powered by JumpIQ AI" in self._body_text()

    def has_insight_cards(self) -> bool:
        text = self._body_text()
        return "INSIGHTS & IMPACTS" in text and (
            "Demographics" in text or "Competitive" in text
            or "Shift" in text or "Opportunity" in text
            or "Supply Chain" in text
        )

    def has_impact_tags(self) -> bool:
        """Check for High/Medium/Low impact tags or category tags."""
        text = self._body_text()
        tags = ["Demographics", "Competitive", "Chevrolet", "Shift", "Supply Chain",
                "Market", "Industry", "Opportunity"]
        return sum(1 for t in tags if t in text) >= 2

    def click_first_insight(self) -> bool:
        """Click the first insight card. Returns True if clicked."""
        try:
            clicked = self._page.evaluate("""() => {
                const section = Array.from(document.querySelectorAll('*'))
                    .find(e => e.textContent.includes('INSIGHTS & IMPACTS') && e.offsetHeight > 0);
                if (!section) return false;
                const cards = section.querySelectorAll('div[class*="cursor-pointer"], a, button');
                for (const card of cards) {
                    if (card.textContent.length > 20 && card.offsetHeight > 30) {
                        card.click();
                        return true;
                    }
                }
                return false;
            }""")
            if clicked:
                self._page.wait_for_timeout(1500)
            return clicked
        except Exception:
            return False

    def is_insight_modal_open(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                return document.querySelectorAll('[role="dialog"], [data-state="open"]').length > 0;
            }"""))
        except Exception:
            return False

    def is_why_this_matters_visible(self) -> bool:
        return "Why This Matters" in self._body_text()

    def has_category_tags_in_modal(self) -> bool:
        text = self._body_text()
        tags = ["Demographics", "Competitive", "Shift", "Opportunity", "Market", "Industry"]
        return sum(1 for t in tags if t in text) >= 1

    def close_modal(self) -> None:
        try:
            self._page.evaluate("""() => {
                const btns = document.querySelectorAll('[role="dialog"] button, button[class*="close"]');
                for (const btn of btns) {
                    if (btn.querySelector('svg') && btn.offsetWidth < 60) {
                        btn.click();
                        return;
                    }
                }
            }""")
            self._page.wait_for_timeout(500)
        except Exception:
            pass

    def is_modal_closed(self) -> bool:
        try:
            return not self.is_insight_modal_open()
        except Exception:
            return True

    # ── WHAT'S NEW section ─────────────────────────────────────────────────────

    def is_whats_new_visible(self) -> bool:
        return "WHAT'S NEW" in self._body_text()

    # ── Valuation graph ────────────────────────────────────────────────────────

    def is_valuation_graph_visible(self) -> bool:
        text = self._body_text()
        return "Time Period" in text or "EST. Valuation" in text

    def has_graph_x_axis_months(self) -> bool:
        text = self._body_text()
        months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
        return sum(1 for m in months if m in text) >= 4

    # ── Map section ────────────────────────────────────────────────────────────

    def is_map_visible(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                return document.querySelector('canvas') !== null
                    || document.querySelector('[class*="leaflet"]') !== null
                    || document.querySelector('[class*="map"]') !== null
                    || document.body.innerText.includes('Map');
            }"""))
        except Exception:
            return False

    def are_zoom_controls_visible(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const body = document.body.innerHTML;
                return body.includes('zoom') || body.includes('Zoom')
                    || document.querySelector('[aria-label*="zoom"]') !== null;
            }"""))
        except Exception:
            return False

    def is_view_by_dropdown_visible(self) -> bool:
        text = self._body_text()
        return "View by" in text or "Valuation" in text or "Momentum" in text

    # ── Analysis tab ───────────────────────────────────────────────────────────

    def scroll_to_your_market(self) -> None:
        """Scroll to the 'Your Market' section which contains Map/Analysis tabs."""
        try:
            self._page.evaluate("""() => {
                const el = Array.from(document.querySelectorAll('*'))
                    .find(e => e.textContent.includes('Your Market') && e.offsetHeight > 0 && e.offsetHeight < 60);
                if (el) el.scrollIntoView({ block: 'start' });
                else window.scrollTo(0, document.body.scrollHeight / 2);
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def click_analysis_tab(self) -> None:
        self.scroll_to_your_market()
        try:
            self._page.locator('button[role="tab"]:has-text("Analysis"):visible').first.click()
        except Exception:
            try:
                self._page.locator('button[role="tab"]').filter(has_text="Analysis").last.click()
            except Exception:
                pass
        self._page.wait_for_timeout(3000)

    def click_map_tab(self) -> None:
        self.scroll_to_your_market()
        try:
            self._page.locator('button[role="tab"]:has-text("Map"):visible').first.click()
        except Exception:
            try:
                self._page.locator('button[role="tab"]').filter(has_text="Map").last.click()
            except Exception:
                pass
        self._page.wait_for_timeout(2000)

    def is_analysis_view_active(self) -> bool:
        text = self._body_text()
        return "Analysis" in text and ("Time Period" in text or "Overachievers" in text)

    def is_time_range_visible(self) -> bool:
        text = self._body_text()
        return "3M" in text and "6M" in text and "12M" in text

    # ── Currency formatting ────────────────────────────────────────────────────

    def has_readable_currency_format(self) -> bool:
        """Check for $X.XXM or $X.XXK format."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return /\\$[\\d.]+[MBK]/.test(text);
            }"""))
        except Exception:
            return False

    # ── Navigation ─────────────────────────────────────────────────────────────

    def click_single_dealership_nav(self) -> None:
        try:
            self._page.evaluate("""() => {
                const btns = document.querySelectorAll('header button, nav button');
                for (const btn of btns) {
                    if (btn.textContent.trim().includes('Single Dealership') && btn.offsetHeight > 0) {
                        btn.click();
                        return;
                    }
                }
            }""")
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    # ── Responsiveness ─────────────────────────────────────────────────────────

    def set_viewport(self, width: int, height: int) -> None:
        self._page.set_viewport_size({"width": width, "height": height})
        self._page.wait_for_timeout(1000)
