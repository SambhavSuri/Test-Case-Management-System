"""
Page Object for the Dealer Groups page.

URL: /kingdom/view?tab=groups&groupId=...
Reached via: Home → click "Groups" nav or "OTHER GROUPS" CTA

Sections:
  Header: Group name + "Competitive performance across dealership groups"
  Summary: EST. TOTAL GROUP VALUATION (TTM), EST. JUMPIQ BLUE SKY VALUATION (TTM), EST. REAL ESTATE VALUATION
  Filter bar: Brand dropdown, Groups dropdown, Search icon
  Left chart: Valuation / Momentum line chart (3M / 6M / 12M)
  Right chart: Momentum vs Environment scatter (quadrants, trend vectors)
  Trending Analysis carousel: AI insight cards with left/right arrows
  Positioning analysis carousel: AI positioning cards
  Leaderboard table: GROUP NAME, PERFORMANCE, MOMENTUM, USED, NEW, USED TO NEW, EST. REVENUE, EST. TOTAL VALUATION
"""
from playwright.sync_api import Page

from pages.dynamic_locator import DynamicLocator


class DealerGroupsPage:
    def __init__(self, page: Page):
        self._page = page
        self._dl = DynamicLocator(page)

    def _body_text(self) -> str:
        return self._dl.body_text()

    # ── Page state ────────────────────────────────────────────────────────────

    def is_on_groups_page(self) -> bool:
        return "tab=groups" in self._page.url

    def get_url(self) -> str:
        return self._page.url

    # ── Header / Group name ───────────────────────────────────────────────────

    def is_group_name_heading_visible(self, group_name: str = "KEN GARFF AUTOMOTIVE GROUP") -> bool:
        return group_name in self._body_text()

    def is_subtitle_visible(self) -> bool:
        return "Competitive performance across dealership groups" in self._body_text()

    # ── Summary valuation ─────────────────────────────────────────────────────

    def is_total_group_valuation_visible(self) -> bool:
        return "EST. TOTAL GROUP VALUATION" in self._body_text()

    def get_total_group_valuation_text(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const els = Array.from(document.querySelectorAll('p, span, div'));
                for (const el of els) {
                    if (el.textContent.includes('EST. TOTAL GROUP VALUATION')) {
                        const parent = el.closest('div[class*="flex"]') || el.parentElement;
                        return parent ? parent.innerText : el.innerText;
                    }
                }
                return '';
            }""")
        except Exception:
            return ""

    def is_blue_sky_valuation_visible(self) -> bool:
        return "EST. JUMPIQ BLUE SKY VALUATION" in self._body_text()

    def get_blue_sky_valuation_text(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const els = Array.from(document.querySelectorAll('p, span, div'));
                for (const el of els) {
                    if (el.textContent.includes('BLUE SKY VALUATION')) {
                        const parent = el.closest('div[class*="flex"]') || el.parentElement;
                        return parent ? parent.innerText : el.innerText;
                    }
                }
                return '';
            }""")
        except Exception:
            return ""

    def is_real_estate_valuation_visible(self) -> bool:
        return "EST. REAL ESTATE VALUATION" in self._body_text()

    def get_real_estate_valuation_text(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const els = Array.from(document.querySelectorAll('p, span, div'));
                for (const el of els) {
                    if (el.textContent.includes('REAL ESTATE VALUATION')) {
                        const parent = el.closest('div[class*="flex"]') || el.parentElement;
                        return parent ? parent.innerText : el.innerText;
                    }
                }
                return '';
            }""")
        except Exception:
            return ""

    def are_all_valuations_visible(self) -> bool:
        return (self.is_total_group_valuation_visible()
                and self.is_blue_sky_valuation_visible()
                and self.is_real_estate_valuation_visible())

    def has_currency_formatted_values(self) -> bool:
        """Check that valuation values contain dollar signs and range format."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                const dollarPattern = /\\$[\\d,.]+[BMK]?\\s*[–-]\\s*\\$[\\d,.]+[BMK]?/g;
                const matches = text.match(dollarPattern);
                return matches && matches.length >= 3;
            }"""))
        except Exception:
            return False

    def has_change_percentage(self) -> bool:
        """Check if any valuation shows a change percentage (e.g. -0.49%)."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return /[+-]?\\d+\\.\\d+%/.test(text);
            }"""))
        except Exception:
            return False

    # ── Filter bar (Brand / Groups dropdowns) ─────────────────────────────────

    def is_brand_filter_visible(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const buttons = document.querySelectorAll('button[role="combobox"]');
                for (const btn of buttons) {
                    if (btn.textContent.includes('Brand') && btn.offsetHeight > 0)
                        return true;
                }
                return false;
            }"""))
        except Exception:
            return False

    def is_groups_filter_visible(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const buttons = document.querySelectorAll('button[role="combobox"]');
                for (const btn of buttons) {
                    if (btn.textContent.includes('Groups') && btn.offsetHeight > 0)
                        return true;
                }
                return false;
            }"""))
        except Exception:
            return False

    def is_search_icon_visible(self) -> bool:
        """Check for the search/magnifying-glass icon button next to filters."""
        try:
            return bool(self._page.evaluate("""() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.querySelector('svg') && btn.offsetWidth < 60) {
                        const rect = btn.getBoundingClientRect();
                        // Search icon is near the filter bar (top area)
                        if (rect.top < 400) return true;
                    }
                }
                return false;
            }"""))
        except Exception:
            return False

    def click_brand_filter(self) -> None:
        try:
            self._page.evaluate("""() => {
                const buttons = document.querySelectorAll('button[role="combobox"]');
                for (const btn of buttons) {
                    if (btn.textContent.includes('Brand') && btn.offsetHeight > 0) {
                        btn.click(); return;
                    }
                }
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def click_groups_filter(self) -> None:
        try:
            self._page.evaluate("""() => {
                const buttons = document.querySelectorAll('button[role="combobox"]');
                for (const btn of buttons) {
                    if (btn.textContent.includes('Groups') && btn.offsetHeight > 0) {
                        btn.click(); return;
                    }
                }
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def click_search_icon(self) -> None:
        """Click the search icon button in the filter bar."""
        try:
            self._page.evaluate("""() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.querySelector('svg') && btn.offsetWidth < 60) {
                        const rect = btn.getBoundingClientRect();
                        if (rect.top < 400) { btn.click(); return; }
                    }
                }
            }""")
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    def is_filter_dropdown_open(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const openCombos = document.querySelectorAll('button[role="combobox"][aria-expanded="true"]');
                return openCombos.length > 0;
            }"""))
        except Exception:
            return False

    def select_filter_option(self, option_text: str) -> None:
        """Select an option from an open filter dropdown."""
        try:
            self._page.get_by_text(option_text, exact=False).first.click()
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def get_applied_filter_chips(self) -> list:
        """Return text of any applied filter chips/badges."""
        try:
            return self._page.evaluate("""() => {
                const chips = document.querySelectorAll('[class*="badge"], [class*="chip"], [class*="tag"]');
                const result = [];
                for (const c of chips) {
                    if (c.offsetHeight > 0 && c.textContent.trim())
                        result.push(c.textContent.trim());
                }
                return result;
            }""")
        except Exception:
            return []

    def remove_filter_chip(self, chip_text: str) -> None:
        """Remove a filter chip by clicking its X button."""
        try:
            self._page.evaluate("""(text) => {
                const chips = document.querySelectorAll('[class*="badge"], [class*="chip"], [class*="tag"]');
                for (const c of chips) {
                    if (c.textContent.includes(text)) {
                        const xBtn = c.querySelector('button, svg, [class*="close"]');
                        if (xBtn) { xBtn.click(); return; }
                        c.click();
                        return;
                    }
                }
            }""", chip_text)
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    # ── Time range (3M / 6M / 12M) ───────────────────────────────────────────

    def is_time_range_visible(self) -> bool:
        text = self._body_text()
        return "3M" in text and "6M" in text and "12M" in text

    def get_active_time_range(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const btns = document.querySelectorAll('button');
                const candidates = [];
                for (const btn of btns) {
                    const t = btn.textContent.trim();
                    if (['3M','6M','12M'].includes(t) && btn.offsetHeight > 0) {
                        const cls = btn.className || '';
                        const ds = btn.getAttribute('data-state') || '';
                        const style = window.getComputedStyle(btn);
                        const bg = style.backgroundColor;
                        candidates.push({text: t, cls, ds, bg, fw: style.fontWeight});
                    }
                }
                // 1. data-state="active" or "on"
                for (const c of candidates) {
                    if (c.ds === 'active' || c.ds === 'on') return c.text;
                }
                // 2. Compare backgrounds — the active button has a distinct bg
                if (candidates.length >= 2) {
                    const bgCounts = {};
                    for (const c of candidates) {
                        bgCounts[c.bg] = (bgCounts[c.bg] || 0) + 1;
                    }
                    // The active one has a unique/minority background color
                    for (const c of candidates) {
                        if (bgCounts[c.bg] === 1) return c.text;
                    }
                }
                // 3. Fallback: check for bg-surface / bg-background class
                for (const c of candidates) {
                    if (c.cls.includes('bg-surface') || c.cls.includes('bg-background'))
                        return c.text;
                }
                return '';
            }""")
        except Exception:
            return ""

    def click_time_range(self, label: str) -> None:
        try:
            self._page.get_by_text(label, exact=True).first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    # ── Metric selector (Valuation / Momentum) ───────────────────────────────

    def get_active_metric(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    const t = btn.textContent.trim();
                    if (['Valuation','Momentum'].includes(t) && btn.offsetHeight > 0) {
                        const cls = btn.className || '';
                        if (cls.includes('bg-surface') || cls.includes('font-bold')
                            || cls.includes('bg-background'))
                            return t;
                    }
                }
                return '';
            }""")
        except Exception:
            return ""

    def click_metric(self, label: str) -> None:
        try:
            loc = self._page.locator(f'button:has-text("{label}"):visible').all()
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

    # ── Trend line chart (left panel) ─────────────────────────────────────────

    def is_trend_chart_visible(self) -> bool:
        text = self._body_text()
        return "Time Period" in text or "EST. Valuation" in text

    def has_y_axis_label(self) -> bool:
        text = self._body_text()
        return "EST. Valuation" in text or "Momentum Score" in text

    def has_x_axis_label(self) -> bool:
        return "Time Period" in self._body_text()

    def has_dealership_lines(self) -> bool:
        """Check if multiple group names appear as chart legend entries."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                const groups = text.match(/ASBURY|PENSKE|HENDRICK|SONIC|MORGAN|HUDSON|KEN GARFF|AMSI/gi);
                return groups && groups.length >= 3;
            }"""))
        except Exception:
            return False

    def get_chart_legend_names(self) -> list:
        """Return list of group names from the chart legend."""
        try:
            return self._page.evaluate(r"""() => {
                const text = document.body.innerText;
                const pattern = /([A-Z][A-Z\s]+(?:AUTOM|AUTO|AUT|GROUP|INC)?\.{0,3})/g;
                const matches = [...text.matchAll(pattern)];
                const names = [];
                for (const m of matches) {
                    const name = m[1].trim();
                    if (name.length > 3 && name.length < 40) names.push(name);
                }
                return [...new Set(names)].slice(0, 20);
            }""")
        except Exception:
            return []

    def hover_chart_data_point(self) -> str:
        """Hover on the trend chart to get tooltip content."""
        try:
            return self._page.evaluate("""() => {
                const chart = document.querySelector('[class*="recharts-wrapper"], canvas, svg');
                if (!chart) return '';
                const rect = chart.getBoundingClientRect();
                const evt = new MouseEvent('mousemove', {
                    clientX: rect.left + rect.width * 0.8,
                    clientY: rect.top + rect.height * 0.5,
                    bubbles: true
                });
                chart.dispatchEvent(evt);
                return '';
            }""")
        except Exception:
            return ""

    # ── Scatter chart (Momentum vs Environment) ──────────────────────────────

    def is_scatter_chart_visible(self) -> bool:
        return "Momentum vs Environment" in self._body_text()

    def has_quadrant_labels(self) -> bool:
        text = self._body_text()
        labels = ["Overachievers", "Champions", "Stragglers", "Opportunities"]
        found = sum(1 for l in labels if l in text)
        return found >= 3

    def has_scatter_axes(self) -> bool:
        text = self._body_text()
        return "Environment" in text and "Momentum Score" in text

    def is_positioning_subtitle_visible(self) -> bool:
        return "Positioning analysis and recommendations" in self._body_text()

    # ── Trend Vectors toggle ──────────────────────────────────────────────────

    def is_trend_vectors_toggle_visible(self) -> bool:
        return "Trend Vectors" in self._body_text()

    def is_trend_vectors_enabled(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
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
                        el.click(); return;
                    }
                }
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def is_reset_zoom_visible(self) -> bool:
        return "RESET ZOOM" in self._body_text()

    # ── Trending Analysis carousel ────────────────────────────────────────────

    def scroll_to_insights(self) -> None:
        try:
            self._page.evaluate("""() => {
                const el = Array.from(document.querySelectorAll('p, h3, div'))
                    .find(e => e.textContent.includes('Trending Analysis'));
                if (el) el.scrollIntoView({ block: 'center' });
                else window.scrollTo(0, document.body.scrollHeight * 0.6);
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def is_trending_analysis_visible(self) -> bool:
        self.scroll_to_insights()
        return "Trending Analysis" in self._body_text()

    def is_positioning_analysis_visible(self) -> bool:
        return "Positioning analysis and recommendations" in self._body_text()

    def is_powered_by_jumpiq_ai_visible(self) -> bool:
        return "Powered by JumpIQ AI" in self._body_text()

    def get_trending_analysis_text(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const carousel = document.querySelector('[aria-label="Trending Analysis carousel"]');
                return carousel ? carousel.innerText.substring(0, 500) : '';
            }""")
        except Exception:
            return ""

    def has_insight_nav_arrows(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const carousel = document.querySelector('[aria-label="Trending Analysis carousel"]');
                if (!carousel) return false;
                const buttons = carousel.querySelectorAll('button');
                const smallBtns = Array.from(buttons).filter(b => b.offsetWidth < 60);
                return smallBtns.length >= 2;
            }"""))
        except Exception:
            return False

    def click_insight_right_arrow(self) -> None:
        try:
            self._page.evaluate("""() => {
                const carousel = document.querySelector('[aria-label="Trending Analysis carousel"]');
                if (!carousel) return;
                const buttons = Array.from(carousel.querySelectorAll('button'));
                const rightBtn = buttons.filter(b => b.offsetWidth < 60).pop();
                if (rightBtn) rightBtn.click();
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def click_insight_left_arrow(self) -> None:
        try:
            self._page.evaluate("""() => {
                const carousel = document.querySelector('[aria-label="Trending Analysis carousel"]');
                if (!carousel) return;
                const buttons = Array.from(carousel.querySelectorAll('button'));
                const leftBtn = buttons.filter(b => b.offsetWidth < 60)[0];
                if (leftBtn) leftBtn.click();
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def has_pagination_dots(self) -> bool:
        """Check for pagination dots (• • •) in the carousel."""
        try:
            return bool(self._page.evaluate("""() => {
                const dots = document.querySelectorAll('[class*="dot"], [class*="indicator"]');
                if (dots.length >= 2) return true;
                // Fallback: look for small round elements near carousel
                const carousel = document.querySelector('[aria-label="Trending Analysis carousel"]');
                if (!carousel) return false;
                const parent = carousel.parentElement;
                if (!parent) return false;
                const circles = parent.querySelectorAll('button, span');
                const dotLike = Array.from(circles).filter(e =>
                    e.offsetWidth < 20 && e.offsetWidth > 4
                    && e.offsetHeight < 20 && e.offsetHeight > 4
                );
                return dotLike.length >= 2;
            }"""))
        except Exception:
            return False

    # ── Leaderboard ───────────────────────────────────────────────────────────

    def scroll_to_leaderboard(self) -> None:
        try:
            self._page.evaluate("""() => {
                const el = Array.from(document.querySelectorAll('h3'))
                    .find(e => e.textContent.includes('Leaderboard'));
                if (el) el.scrollIntoView({ block: 'start' });
                else window.scrollTo(0, document.body.scrollHeight * 0.8);
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def is_leaderboard_visible(self) -> bool:
        self.scroll_to_leaderboard()
        text = self._body_text()
        return "LEADERBOARD" in text or "Leaderboard" in text

    def get_leaderboard_headers(self) -> list:
        """Return the column header texts from the leaderboard table."""
        try:
            return self._page.evaluate("""() => {
                const headers = [];
                // Look for header cells with sort icons
                const cells = document.querySelectorAll('[class*="leaderboard"] th, [class*="rounded-xl"] th');
                if (cells.length > 0) {
                    for (const c of cells) headers.push(c.textContent.trim());
                    return headers;
                }
                // Fallback: look for GROUP NAME + PERFORMANCE + MOMENTUM pattern
                const allText = document.body.innerText;
                const headerTexts = ['GROUP NAME', 'PERFORMANCE', 'MOMENTUM', 'USED', 'NEW',
                                     'USED TO NEW', 'EST. REVENUE', 'EST. TOTAL VALUATION'];
                for (const h of headerTexts) {
                    if (allText.includes(h)) headers.push(h);
                }
                return headers;
            }""")
        except Exception:
            return []

    def get_leaderboard_row_count(self) -> int:
        """Return the number of data rows in the leaderboard."""
        try:
            return self._page.evaluate("""() => {
                // Look for rows that contain group data (have valuation ranges like $X.XXB)
                const rows = document.querySelectorAll('tr, [class*="table-row"]');
                let count = 0;
                for (const row of rows) {
                    if (row.textContent.match(/\\$[\\d,.]+[BMK]/)) count++;
                }
                if (count > 0) return count;
                // Fallback: count group names in leaderboard area
                const text = document.body.innerText;
                const lb = text.indexOf('LEADERBOARD') !== -1 ? text.indexOf('LEADERBOARD') : text.indexOf('Leaderboard');
                if (lb === -1) return 0;
                const section = text.substring(lb);
                const groups = section.match(/\\$[\\d,.]+[BMK]?\\s*[–-]\\s*\\$[\\d,.]+[BMK]?/g);
                return groups ? groups.length : 0;
            }""")
        except Exception:
            return 0

    def is_your_group_highlighted(self) -> bool:
        """Check if the user's group row has a [YOU] badge or highlight."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return text.includes('YOU') && text.includes('KEN GARFF');
            }"""))
        except Exception:
            return False

    def get_your_group_row_data(self) -> dict:
        """Extract data from the user's group row (KEN GARFF)."""
        try:
            return self._page.evaluate("""() => {
                const text = document.body.innerText;
                const lb = text.indexOf('KEN GARFF AUTOMOTIVE GROUP');
                if (lb === -1) return {};
                const line = text.substring(lb, lb + 300);
                return {
                    found: true,
                    text: line.replace(/\\n/g, ' | ').substring(0, 200)
                };
            }""")
        except Exception:
            return {}

    def hover_leaderboard_row(self, row_index: int = 1) -> str:
        """Hover over a leaderboard row and return any hover card content."""
        try:
            self.scroll_to_leaderboard()
            self._page.wait_for_timeout(500)
            return self._page.evaluate("""(idx) => {
                const rows = document.querySelectorAll('tr, [class*="table-row"]');
                const dataRows = Array.from(rows).filter(r => r.textContent.match(/\\$[\\d,.]+/));
                if (idx < dataRows.length) {
                    const row = dataRows[idx];
                    const rect = row.getBoundingClientRect();
                    const evt = new MouseEvent('mouseenter', {
                        clientX: rect.left + rect.width / 2,
                        clientY: rect.top + rect.height / 2,
                        bubbles: true
                    });
                    row.dispatchEvent(evt);
                }
                return '';
            }""", row_index)
        except Exception:
            return ""

    def is_hover_card_visible(self) -> bool:
        """Check if a hover/tooltip card appeared after hovering a row."""
        try:
            return bool(self._page.evaluate("""() => {
                const tooltips = document.querySelectorAll(
                    '[class*="tooltip"], [class*="popover"], [role="tooltip"], [class*="hover-card"]'
                );
                for (const t of tooltips) {
                    if (t.offsetHeight > 0 && t.textContent.length > 10) return true;
                }
                return false;
            }"""))
        except Exception:
            return False

    def click_view_more(self) -> None:
        """Click the 'View More' button below the leaderboard."""
        try:
            self.scroll_to_leaderboard()
            self._page.wait_for_timeout(500)
            self._page.evaluate("""() => {
                // Scroll to bottom of leaderboard
                const lb = Array.from(document.querySelectorAll('h3'))
                    .find(e => e.textContent.includes('Leaderboard'));
                if (lb) {
                    const card = lb.closest('div[class*="card"]') || lb.parentElement.parentElement;
                    if (card) card.scrollTop = card.scrollHeight;
                }
                window.scrollTo(0, document.body.scrollHeight);
            }""")
            self._page.wait_for_timeout(1000)
            # Click the button
            try:
                self._page.get_by_text("View More", exact=False).first.click()
            except Exception:
                try:
                    self._page.get_by_text("VIEW MORE", exact=False).first.click()
                except Exception:
                    self._page.get_by_text("Show More", exact=False).first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    def click_column_header(self, header_text: str) -> None:
        """Click a leaderboard column header to sort."""
        try:
            self.scroll_to_leaderboard()
            self._page.get_by_text(header_text, exact=False).first.click()
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    # ── Navigation helpers ────────────────────────────────────────────────────

    def click_groups_nav(self) -> None:
        try:
            self._page.get_by_text("Groups", exact=True).first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    def click_logo(self) -> None:
        try:
            self._page.locator('a[href*="/kingdom/home"], img[alt*="Jump"]').first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    def set_viewport(self, width: int, height: int) -> None:
        self._page.set_viewport_size({"width": width, "height": height})
        self._page.wait_for_timeout(1000)
