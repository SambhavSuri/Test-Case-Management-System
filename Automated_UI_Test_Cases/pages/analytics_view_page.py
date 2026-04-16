"""
Page Object for the Analytics View within My Dealerships page.

URL: /kingdom/view?tab=dealerships&groupId=...  (same URL, different view)
Reached via: My Dealerships → click "Analysis" tab

Left panel: Trend line chart
  - Time range: 3M, 6M, 12M
  - Metric: Valuation, Momentum
  - Y-axis: EST. Valuation ($M) or Momentum Score
  - X-axis: Time Period → (months)
  - Multiple colored dealership lines

Right panel: Scatter chart
  - Title: Momentum vs Environment
  - Subtitle: Quadrant performance analysis
  - Quadrants: Overachievers, Champions, Stragglers, Opportunities
  - Y-axis: Momentum Score (3 mo)
  - X-axis: Environment →
  - Trend Vectors toggle (checkbox, enabled by default)
  - RESET ZOOM button
  - Legend color bar: 60-100
"""
from playwright.sync_api import Page

from pages.dynamic_locator import DynamicLocator


class AnalyticsViewPage:
    def __init__(self, page: Page):
        self._page = page
        self._dl = DynamicLocator(page)

    def _body_text(self) -> str:
        return self._dl.body_text()

    # ── Navigation ─────────────────────────────────────────────────────────────

    def click_analysis_tab(self) -> None:
        try:
            self._page.locator('button[role="tab"]:has-text("Analysis"):visible').first.click()
        except Exception:
            try:
                self._page.locator('button[role="tab"]').filter(has_text="Analysis").last.click()
            except Exception:
                pass
        self._page.wait_for_timeout(3000)

    def click_map_view_tab(self) -> None:
        try:
            self._page.locator('button[role="tab"]:has-text("Map View"):visible').first.click()
        except Exception:
            try:
                self._page.locator('button[role="tab"]').filter(has_text="Map View").last.click()
            except Exception:
                pass
        self._page.wait_for_timeout(2000)

    def is_analysis_view_active(self) -> bool:
        text = self._body_text()
        return "Valuation" in text and "Momentum vs Environment" in text

    # ── Time range (3M / 6M / 12M) ────────────────────────────────────────────

    def get_active_time_range(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const btns = document.querySelectorAll('button');
                // Find the visible time range buttons (desktop version)
                const timeButtons = [];
                for (const btn of btns) {
                    const t = btn.textContent.trim();
                    if (['3M','6M','12M'].includes(t) && btn.offsetHeight > 0) {
                        timeButtons.push({text: t, btn: btn});
                    }
                }
                // Among the visible ones, find the active one (has different bg or font-bold)
                for (const {text, btn} of timeButtons) {
                    const cls = btn.className || '';
                    const ds = btn.getAttribute('data-state') || '';
                    const style = window.getComputedStyle(btn);
                    if (ds === 'active' || cls.includes('bg-surface')
                        || cls.includes('font-bold') || cls.includes('bg-background')
                        || style.fontWeight === '700' || style.fontWeight === 'bold')
                        return text;
                }
                return '';
            }""")
        except Exception:
            return ""

    def click_time_range(self, label: str) -> None:
        """Click 3M, 6M, or 12M button."""
        try:
            self._page.get_by_text(label, exact=True).first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    def is_time_range_visible(self) -> bool:
        text = self._body_text()
        return "3M" in text and "6M" in text and "12M" in text

    # ── Metric selector (Valuation / Momentum) ────────────────────────────────

    def get_active_metric(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    const t = btn.textContent.trim();
                    if (['Valuation','Momentum'].includes(t)) {
                        const cls = btn.className || '';
                        const ds = btn.getAttribute('data-state') || '';
                        if (ds === 'active' || cls.includes('bg-surface')
                            || cls.includes('font-bold') || cls.includes('bg-background'))
                            return t;
                    }
                }
                return '';
            }""")
        except Exception:
            return ""

    def click_metric(self, label: str) -> None:
        """Click Valuation or Momentum metric tab (the small tabs below time range)."""
        try:
            # These are small tab buttons with exact text, visible on page
            loc = self._page.locator(f'button:has-text("{label}"):visible').all()
            # Find the one that is a small metric tab (not the nav bar Momentum badge)
            for l in loc:
                try:
                    box = l.bounding_box()
                    if box and box["height"] < 50 and box["width"] < 200:
                        l.click()
                        break
                except Exception:
                    continue
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    # ── Trend line chart (left panel) ──────────────────────────────────────────

    def is_trend_chart_visible(self) -> bool:
        text = self._body_text()
        return "Time Period" in text or "EST. Valuation" in text or "Momentum Score" in text

    def has_y_axis_label(self) -> bool:
        text = self._body_text()
        return "EST. Valuation" in text or "Momentum Score" in text

    def has_x_axis_label(self) -> bool:
        return "Time Period" in self._body_text()

    def has_dealership_lines(self) -> bool:
        """Check if multiple dealership names appear as chart legend entries."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                const dealers = text.match(/KEN GARFF|CULVER|BIG STAR|ALOHA/gi);
                return dealers && dealers.length >= 2;
            }"""))
        except Exception:
            return False

    def get_chart_content_text(self) -> str:
        """Get text around the chart area for comparison after switching."""
        try:
            return self._page.evaluate("""() => {
                const grid = document.querySelector('[class*="grid-cols"]');
                return grid ? grid.innerText.substring(0, 500) : document.body.innerText.substring(0, 500);
            }""")
        except Exception:
            return ""

    # ── Scatter chart (right panel) ────────────────────────────────────────────

    def is_scatter_chart_visible(self) -> bool:
        text = self._body_text()
        return "Momentum vs Environment" in text

    def has_quadrant_labels(self) -> bool:
        text = self._body_text()
        labels = ["Overachievers", "Champions", "Stragglers", "Opportunities"]
        found = sum(1 for l in labels if l in text)
        return found >= 3

    def has_scatter_axes(self) -> bool:
        text = self._body_text()
        return "Environment" in text and "Momentum Score" in text

    def is_trend_vectors_toggle_visible(self) -> bool:
        return "Trend Vectors" in self._body_text()

    def is_trend_vectors_enabled(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                if (!text.includes('Trend Vectors')) return false;
                // Check checkbox state
                const checkboxes = document.querySelectorAll('input[type="checkbox"], button[role="checkbox"]');
                for (const cb of checkboxes) {
                    const parent = cb.closest('div') || cb.parentElement;
                    if (parent && parent.textContent.includes('Trend Vectors')) {
                        return cb.checked || cb.getAttribute('data-state') === 'checked'
                            || cb.getAttribute('aria-checked') === 'true';
                    }
                }
                return false;
            }"""))
        except Exception:
            return False

    def toggle_trend_vectors(self) -> None:
        try:
            self._page.evaluate("""() => {
                const els = document.querySelectorAll('input[type="checkbox"], button[role="checkbox"]');
                for (const el of els) {
                    const parent = el.closest('div') || el.parentElement;
                    if (parent && parent.textContent.includes('Trend Vectors')) {
                        el.click();
                        return;
                    }
                }
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def is_reset_zoom_visible(self) -> bool:
        return "RESET ZOOM" in self._body_text()

    # ── Group name ─────────────────────────────────────────────────────────────

    def is_group_name_visible(self, group_name: str = "KEN GARFF") -> bool:
        return group_name in self._body_text()

    # ── Summary metrics persistence ────────────────────────────────────────────

    def get_summary_metrics_text(self) -> str:
        """Grab the summary metrics section text (valuation, momentum, badges)."""
        try:
            return self._page.evaluate("""() => {
                const text = document.body.innerText;
                const start = text.indexOf('EST. TOTAL GROUP');
                const end = text.indexOf('Geographic performance');
                if (start >= 0 && end > start) return text.substring(start, end);
                if (start >= 0) return text.substring(start, start + 400);
                return '';
            }""")
        except Exception:
            return ""

    # ── View By dropdown ───────────────────────────────────────────────────────

    def is_view_by_visible(self) -> bool:
        return "View by" in self._body_text()

    def get_view_by_value(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const match = document.body.innerText.match(/View by\\s+(\\w+)/i);
                return match ? match[1] : '';
            }""")
        except Exception:
            return ""

    def click_view_by_and_select(self, option: str) -> None:
        """Open View By dropdown and select an option."""
        try:
            self._page.get_by_text("View by", exact=False).first.click()
            self._page.wait_for_timeout(500)
            self._page.get_by_text(option, exact=False).first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    # ── Trending Analysis / AI Insights ──────────────────────────────────────────

    def scroll_to_trending_analysis(self) -> None:
        """Scroll down to the Trending Analysis section."""
        try:
            self._page.evaluate("""() => {
                const el = Array.from(document.querySelectorAll('p'))
                    .find(e => e.textContent.includes('Trending Analysis'));
                if (el) el.scrollIntoView({ block: 'center' });
                else window.scrollTo(0, document.body.scrollHeight);
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def is_trending_analysis_visible(self) -> bool:
        self.scroll_to_trending_analysis()
        return "Trending Analysis" in self._body_text()

    def is_positioning_analysis_visible(self) -> bool:
        return "Positioning analysis and recommendations" in self._body_text()

    def is_powered_by_jumpiq_ai_visible(self) -> bool:
        return "Powered by JumpIQ AI" in self._body_text()

    def get_trending_analysis_text(self) -> str:
        """Return the text content of the Trending Analysis carousel."""
        try:
            return self._page.evaluate("""() => {
                const carousel = document.querySelector('[aria-label="Trending Analysis carousel"]');
                return carousel ? carousel.innerText.substring(0, 500) : '';
            }""")
        except Exception:
            return ""

    def has_insight_nav_arrows(self) -> bool:
        """Check if left/right navigation arrows exist in the carousel."""
        try:
            return bool(self._page.evaluate("""() => {
                const carousel = document.querySelector('[aria-label="Trending Analysis carousel"]');
                if (!carousel) return false;
                const buttons = carousel.querySelectorAll('button');
                // Look for < and > arrow buttons
                let hasLeft = false, hasRight = false;
                for (const btn of buttons) {
                    const svg = btn.querySelector('svg');
                    if (svg) {
                        const cls = svg.getAttribute('class') || '';
                        if (cls.includes('chevron-left') || cls.includes('arrow-left')) hasLeft = true;
                        if (cls.includes('chevron-right') || cls.includes('arrow-right')) hasRight = true;
                    }
                }
                // Fallback: any 2+ buttons in carousel that are small (nav arrows)
                if (!hasLeft && !hasRight) {
                    const smallBtns = Array.from(buttons).filter(b => b.offsetWidth < 60);
                    return smallBtns.length >= 2;
                }
                return hasLeft && hasRight;
            }"""))
        except Exception:
            return False

    def click_right_arrow(self) -> None:
        """Click the right navigation arrow on the Trending Analysis carousel."""
        try:
            self._page.evaluate("""() => {
                const carousel = document.querySelector('[aria-label="Trending Analysis carousel"]');
                if (!carousel) return;
                const buttons = Array.from(carousel.querySelectorAll('button'));
                // The right arrow is typically the last small button
                const rightBtn = buttons.filter(b => b.offsetWidth < 60).pop();
                if (rightBtn) rightBtn.click();
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def click_left_arrow(self) -> None:
        """Click the left navigation arrow on the Trending Analysis carousel."""
        try:
            self._page.evaluate("""() => {
                const carousel = document.querySelector('[aria-label="Trending Analysis carousel"]');
                if (!carousel) return;
                const buttons = Array.from(carousel.querySelectorAll('button'));
                // The left arrow is typically the first small button
                const leftBtn = buttons.filter(b => b.offsetWidth < 60)[0];
                if (leftBtn) leftBtn.click();
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    # ── Responsiveness ─────────────────────────────────────────────────────────

    def set_viewport(self, width: int, height: int) -> None:
        self._page.set_viewport_size({"width": width, "height": height})
        self._page.wait_for_timeout(1000)
