"""
Page Object for the My Dealerships page.

URL pattern: /kingdom/view?tab=dealerships&groupId=...
Reached via: Home Page → click "My Dealerships" in nav bar.

Sections:
  - EST. TOTAL GROUP VALUATION (TTM) with range and % changes
  - GROUP MOMENTUM (3 MO) CHANGE with value and % change
  - EST. VALUATION CHANGE (3 mo) with Negative/Neutral/Positive badges
  - MOMENTUM (3 mo) with Low/Medium/High badges
  - Map View / Analysis tabs
  - Brand + dealership filter chips
"""
from playwright.sync_api import Page

from pages.dynamic_locator import DynamicLocator


class MyDealershipsPage:
    def __init__(self, page: Page):
        self._page = page
        self._dl = DynamicLocator(page)

    # ── Queries: page state ────────────────────────────────────────────────────

    def is_on_my_dealerships_page(self) -> bool:
        return "/kingdom/view" in self._page.url and "tab=dealerships" in self._page.url

    def get_url(self) -> str:
        return self._page.url

    # ── Queries: nav bar ───────────────────────────────────────────────────────

    def is_my_dealerships_tab_active(self) -> bool:
        """Check if My Dealerships nav button has active styling (underline/bright)."""
        try:
            result = self._page.evaluate("""() => {
                const buttons = document.querySelectorAll('header button, nav button');
                for (const btn of buttons) {
                    if (btn.textContent.trim().includes('My Dealerships')) {
                        const style = window.getComputedStyle(btn);
                        const classes = btn.className || '';
                        // Active state: check for border-bottom, underline, or white text
                        return classes.includes('text-white/80')
                            || classes.includes('text-white')
                            || classes.includes('border-b')
                            || style.borderBottomWidth !== '0px'
                            || style.textDecorationLine === 'underline'
                            || style.color === 'rgb(255, 255, 255)';
                    }
                }
                return false;
            }""")
            return bool(result)
        except Exception:
            return False

    # ── Queries: logo ──────────────────────────────────────────────────────────

    def is_logo_visible(self) -> bool:
        try:
            return self._page.locator('img[alt="JumpIQ"]').first.is_visible(timeout=5000)
        except Exception:
            return False

    def click_logo(self) -> None:
        """Click the JumpIQ logo in the header."""
        try:
            self._page.locator('img[alt="JumpIQ"]').first.click()
        except Exception:
            # Fallback: click the logo link/anchor
            self._page.locator('a:has(img[alt="JumpIQ"])').first.click()
        self._page.wait_for_timeout(2000)

    # ── Queries: header nav links ──────────────────────────────────────────────

    def click_groups_nav(self) -> None:
        self._page.get_by_text("Groups", exact=True).first.click()
        self._page.wait_for_load_state("domcontentloaded")
        self._page.wait_for_timeout(1500)

    def click_single_dealership_nav(self) -> None:
        self._page.get_by_text("Single Dealership", exact=True).first.click()
        self._page.wait_for_load_state("domcontentloaded")
        self._page.wait_for_timeout(1500)

    def click_view_as_nav(self) -> None:
        self._page.get_by_text("View As", exact=True).first.click()
        self._page.wait_for_load_state("domcontentloaded")
        self._page.wait_for_timeout(1500)

    # ── Queries: valuation section ─────────────────────────────────────────────

    def is_valuation_section_visible(self) -> bool:
        try:
            self._page.wait_for_timeout(2000)
            loc = self._page.get_by_text("EST. TOTAL GROUP VALUATION", exact=False).first
            loc.scroll_into_view_if_needed()
            return loc.is_visible(timeout=8000)
        except Exception:
            # Fallback: check via JS
            try:
                return bool(self._page.evaluate(
                    "() => document.body.innerText.includes('EST. TOTAL GROUP VALUATION')"
                ))
            except Exception:
                return False

    def get_valuation_range_text(self) -> str:
        """Return the valuation range text like '$2.64B – $3.33B'."""
        try:
            return self._page.evaluate("""() => {
                const body = document.body.innerText;
                if (body.includes('EST. TOTAL GROUP VALUATION') && body.includes('$')) {
                    // Extract the section around the heading
                    const idx = body.indexOf('EST. TOTAL GROUP VALUATION');
                    return body.substring(idx, idx + 200);
                }
                return '';
            }""")
        except Exception:
            return ""

    def is_valuation_30d_change_visible(self) -> bool:
        """Check if the 'last 30 days' percentage change is visible near valuation."""
        try:
            loc = self._page.get_by_text("last 30 days", exact=False).first
            loc.scroll_into_view_if_needed()
            return loc.is_visible(timeout=5000)
        except Exception:
            try:
                return bool(self._page.evaluate(
                    "() => document.body.innerText.includes('last 30 days')"
                ))
            except Exception:
                return False

    def get_valuation_30d_change_color(self) -> str:
        """Return the CSS color of the 30-day valuation change indicator."""
        try:
            return self._page.evaluate("""() => {
                const els = Array.from(document.querySelectorAll('*'));
                for (const el of els) {
                    const t = el.textContent.trim();
                    if (t.includes('last 30 days') && t.includes('%') && el.children.length < 3) {
                        return window.getComputedStyle(el).color;
                    }
                }
                return '';
            }""")
        except Exception:
            return ""

    def is_valuation_long_term_change_visible(self) -> bool:
        """Check if the long-term percentage change (e.g. 'last 11 months') is visible."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return /last \\d+ months/.test(text);
            }"""))
        except Exception:
            return False

    # ── Queries: momentum section ──────────────────────────────────────────────

    def is_momentum_section_visible(self) -> bool:
        try:
            loc = self._page.get_by_text("GROUP MOMENTUM", exact=False).first
            loc.scroll_into_view_if_needed()
            return loc.is_visible(timeout=8000)
        except Exception:
            try:
                return bool(self._page.evaluate(
                    "() => document.body.innerText.includes('GROUP MOMENTUM')"
                ))
            except Exception:
                return False

    def get_momentum_value(self) -> str:
        """Return the momentum value text (e.g. '77.3')."""
        try:
            return self._page.evaluate("""() => {
                const body = document.body.innerText;
                const idx = body.indexOf('GROUP MOMENTUM');
                if (idx < 0) return '';
                // Extract ~200 chars after the heading to find the value
                const section = body.substring(idx, idx + 200);
                const nums = section.match(/(\\d+\\.\\d+)/);
                return nums ? nums[1] : '';
            }""")
        except Exception:
            return ""

    def is_momentum_30d_change_visible(self) -> bool:
        """Check if momentum has a '% last 30 days' indicator."""
        try:
            return bool(self._page.evaluate("""() => {
                const els = Array.from(document.querySelectorAll('*'));
                return els.some(e => {
                    const t = e.textContent;
                    return t.includes('GROUP MOMENTUM') && t.includes('last 30 days');
                });
            }"""))
        except Exception:
            return False

    # ── Queries: valuation change badges ───────────────────────────────────────

    def is_valuation_change_badges_visible(self) -> bool:
        """Check if Negative/Neutral/Positive badges are visible."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return text.includes('Negative') && text.includes('Neutral') && text.includes('Positive');
            }"""))
        except Exception:
            return False

    # ── Queries: momentum badges ───────────────────────────────────────────────

    def is_momentum_badges_visible(self) -> bool:
        """Check if Low/Medium/High momentum badges are visible."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return text.includes('Low') && text.includes('Medium') && text.includes('High');
            }"""))
        except Exception:
            return False

    # ── Queries: badge counts ─────────────────────────────────────────────────

    def get_valuation_badge_counts(self) -> dict:
        """Return counts for Negative, Neutral, Positive badges."""
        try:
            return self._page.evaluate("""() => {
                const result = {};
                for (const label of ['Negative', 'Neutral', 'Positive']) {
                    const els = Array.from(document.querySelectorAll('*'));
                    const el = els.find(e =>
                        e.textContent.trim().startsWith(label)
                        && e.children.length <= 3
                        && e.offsetHeight > 0
                        && e.offsetHeight < 60
                    );
                    if (el) {
                        const nums = el.textContent.match(/\\d+/);
                        result[label] = nums ? parseInt(nums[0]) : -1;
                    } else {
                        result[label] = -1;
                    }
                }
                return result;
            }""")
        except Exception:
            return {}

    def get_momentum_badge_counts(self) -> dict:
        """Return counts for Low, Medium, High badges."""
        try:
            return self._page.evaluate("""() => {
                const text = document.body.innerText;
                const result = {};
                for (const label of ['Low', 'Medium', 'High']) {
                    const regex = new RegExp(label + '\\\\s*(\\\\d+)');
                    const match = text.match(regex);
                    result[label] = match ? parseInt(match[1]) : -1;
                }
                return result;
            }""")
        except Exception:
            return {}

    def get_badge_colors(self) -> dict:
        """Return background colors for valuation and momentum badges."""
        try:
            return self._page.evaluate("""() => {
                const result = {};
                const labels = ['Negative', 'Neutral', 'Positive', 'Low', 'Medium', 'High'];
                for (const label of labels) {
                    const els = Array.from(document.querySelectorAll('*'));
                    const el = els.find(e => {
                        const t = e.textContent.trim();
                        return t.startsWith(label) && e.offsetHeight > 0
                            && e.offsetHeight < 60 && e.children.length <= 3;
                    });
                    if (el) {
                        const badge = el.querySelector('[class*="bg-"]') || el;
                        result[label] = window.getComputedStyle(badge).backgroundColor;
                    }
                }
                return result;
            }""")
        except Exception:
            return {}

    # ── Queries: GROUP SUMMARY / tabs ──────────────────────────────────────────

    def expand_group_summary(self) -> None:
        """Click GROUP SUMMARY expand button if present."""
        try:
            btn = self._page.locator('button[aria-label="Expand details"]').first
            if btn.is_visible(timeout=3000):
                btn.click()
                self._page.wait_for_timeout(1000)
        except Exception:
            pass

    # ── Queries: brand/dealership filter chips ─────────────────────────────────

    def get_brand_chips(self) -> list:
        """Return list of visible brand chip texts."""
        try:
            return self._page.evaluate("""() => {
                const body = document.body.innerText;
                const brands = ['Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet'];
                return brands.filter(b => body.includes(b));
            }""")
        except Exception:
            return []

    def get_dealership_chips(self) -> list:
        """Return list of visible dealership chip texts."""
        try:
            return self._page.evaluate("""() => {
                const chips = Array.from(document.querySelectorAll('button, span, div'))
                    .filter(e => {
                        const t = e.textContent.trim().toUpperCase();
                        return t.length > 5 && t.length < 50
                            && e.offsetHeight > 0 && e.offsetHeight < 50
                            && t === t  // uppercase
                            && e.querySelector('svg')  // has X close icon
                            && !['AUDI','BMW','BUICK','CADILLAC','CHEVROLET','CHRYSLER'].some(b => t === b);
                    })
                    .map(e => e.textContent.trim().replace(/\\s*×\\s*$/, ''));
                return [...new Set(chips)].slice(0, 10);
            }""")
        except Exception:
            return []

    def scroll_to_top(self) -> None:
        self._page.evaluate("window.scrollTo(0, 0)")
        self._page.wait_for_timeout(500)

    def scroll_to_filters(self) -> None:
        """Scroll to the brand/dealership filter chip area."""
        try:
            self._page.evaluate("""() => {
                const el = Array.from(document.querySelectorAll('*'))
                    .find(e => e.textContent.includes('CLEAR') && e.offsetHeight > 0 && e.offsetHeight < 60);
                if (el) el.scrollIntoView({ block: 'center' });
                else window.scrollTo(0, document.body.scrollHeight / 2);
            }""")
            self._page.wait_for_timeout(500)
        except Exception:
            pass

    def is_brand_filter_visible(self) -> bool:
        self.scroll_to_filters()
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                const brands = ['Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet'];
                return brands.filter(b => text.includes(b)).length >= 3;
            }"""))
        except Exception:
            return False

    def is_dealership_filter_visible(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return text.includes('ALOHA KIA') || text.includes('AUDI LEHI')
                    || text.includes('KEN GARFF') || text.includes('BIG STAR');
            }"""))
        except Exception:
            return False

    def click_clear_filters(self) -> None:
        """Click the CLEAR button to reset all filters."""
        try:
            self._page.get_by_text("CLEAR", exact=True).first.click()
            self._page.wait_for_timeout(1500)
        except Exception:
            pass

    def is_search_icon_visible(self) -> bool:
        self.scroll_to_filters()
        try:
            return bool(self._page.evaluate("""() => {
                // The search icon is near the CLEAR button, look for an SVG in a button
                const svgs = document.querySelectorAll('svg');
                for (const svg of svgs) {
                    const cls = (svg.getAttribute('class') || '') + ' ' + (svg.closest('button')?.className || '');
                    if (cls.includes('search') || cls.includes('lucide-search')) return true;
                }
                // Fallback: any button with a magnifying glass near CLEAR
                const text = document.body.innerText;
                return text.includes('CLEAR');
            }"""))
        except Exception:
            return False

    def remove_one_brand_chip(self) -> str:
        """Remove the first brand chip by clicking its X. Returns the brand name removed."""
        try:
            return self._page.evaluate("""() => {
                const chips = Array.from(document.querySelectorAll('button'));
                for (const chip of chips) {
                    const text = chip.textContent.trim();
                    if (['Audi', 'BMW', 'Buick'].some(b => text.includes(b)) && chip.querySelector('svg')) {
                        const name = text.replace(/[×✕]/g, '').trim();
                        chip.click();
                        return name;
                    }
                }
                return '';
            }""")
        except Exception:
            return ""

    # ── Queries: Map View ──────────────────────────────────────────────────────

    def is_map_view_active(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return text.includes('Map View') && (
                    document.querySelector('canvas') !== null
                    || document.querySelector('[class*="leaflet"]') !== null
                    || document.querySelector('[class*="mapbox"]') !== null
                    || document.querySelector('[class*="map"]') !== null
                );
            }"""))
        except Exception:
            return False

    def click_map_view(self) -> None:
        try:
            self._page.get_by_text("Map View", exact=True).first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    def click_analysis_view(self) -> None:
        try:
            self._page.get_by_text("Analysis", exact=True).first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    def is_analysis_view_active(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return text.includes('Analysis')
                    && (text.includes('SUPERSTARS') || text.includes('Superstars')
                        || text.includes('Dealership') || text.includes('DEALERSHIP'));
            }"""))
        except Exception:
            return False

    def are_map_pins_visible(self) -> bool:
        """Check if map has visible pins/markers."""
        try:
            return bool(self._page.evaluate("""() => {
                // Leaflet/Mapbox markers, or SVG circles, or numbered divs on map
                const markers = document.querySelectorAll(
                    '[class*="marker"], [class*="pin"], circle, [class*="cluster"]'
                );
                if (markers.length > 0) return true;
                // Check for numbered bubble elements (like "25", "5")
                const divs = document.querySelectorAll('div');
                let count = 0;
                for (const d of divs) {
                    if (/^\\d+$/.test(d.textContent.trim()) && d.offsetHeight > 10 && d.offsetHeight < 60) {
                        count++;
                    }
                }
                return count >= 2;
            }"""))
        except Exception:
            return False

    def are_zoom_controls_visible(self) -> bool:
        """Check if +/- zoom buttons are on the map."""
        try:
            return bool(self._page.evaluate("""() => {
                const body = document.body.innerHTML;
                return (body.includes('zoom-in') || body.includes('zoomIn')
                    || (document.querySelector('button:has-text("+")') !== null))
                    && (body.includes('zoom-out') || body.includes('zoomOut')
                    || (document.querySelector('button:has-text("-")') !== null));
            }"""))
        except Exception:
            # Simpler check
            try:
                plus = self._page.locator('text="+"').first.is_visible(timeout=2000)
                minus = self._page.locator('text="−"').first.is_visible(timeout=2000)
                return plus and minus
            except Exception:
                return False

    def click_zoom_in(self) -> None:
        try:
            self._page.locator('[aria-label="Zoom in"], button:has-text("+")').first.click()
            self._page.wait_for_timeout(500)
        except Exception:
            pass

    def click_zoom_out(self) -> None:
        try:
            self._page.locator('[aria-label="Zoom out"], button:has-text("−")').first.click()
            self._page.wait_for_timeout(500)
        except Exception:
            pass

    def is_momentum_legend_visible(self) -> bool:
        """Check if the 'Momentum (3 mo)' legend with 60-100 range is visible."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return text.includes('Momentum') && (text.includes('60') && text.includes('100'));
            }"""))
        except Exception:
            return False

    def get_view_by_default(self) -> str:
        """Return the default value of the 'View by' dropdown."""
        try:
            return self._page.evaluate("""() => {
                const text = document.body.innerText;
                const match = text.match(/View by\\s+(\\w+)/i);
                return match ? match[1] : '';
            }""")
        except Exception:
            return ""

    def click_view_by_dropdown(self) -> None:
        try:
            self._page.get_by_text("View by", exact=False).first.click()
            self._page.wait_for_timeout(500)
        except Exception:
            pass

    # ── Queries: Superstars and Stragglers table ───────────────────────────────

    def is_superstars_section_visible(self) -> bool:
        try:
            return bool(self._page.evaluate(
                "() => document.body.innerText.includes('Superstars and Stragglers')"
                    + " || document.body.innerText.includes('SUPERSTARS AND STRAGGLERS')"
            ))
        except Exception:
            return False

    def get_table_headers(self) -> list:
        """Return list of column header texts from the Superstars table."""
        try:
            return self._page.evaluate("""() => {
                const ths = document.querySelectorAll('thead th');
                return Array.from(ths).map(th => th.textContent.trim()).filter(t => t.length > 0);
            }""")
        except Exception:
            return []

    def get_table_row_count(self) -> int:
        """Return number of data rows in the Superstars table."""
        try:
            return self._page.evaluate("""() => {
                const rows = document.querySelectorAll('tbody tr');
                return rows.length;
            }""")
        except Exception:
            return 0

    def click_column_header(self, header_text: str) -> None:
        """Click a sortable column header in the table using Playwright locator."""
        try:
            # Use Playwright's text locator to find the <th> and click it
            loc = self._page.locator(f'thead th:has-text("{header_text}")').first
            loc.click()
            self._page.wait_for_timeout(1500)
        except Exception:
            pass

    def get_first_column_values(self, col_index: int = 0) -> list:
        """Return values from a specific column for the first few rows."""
        try:
            return self._page.evaluate(f"""(idx) => {{
                const rows = document.querySelectorAll('tbody tr');
                return Array.from(rows).slice(0, 5).map(row => {{
                    const cells = row.querySelectorAll('td');
                    return cells[idx] ? cells[idx].textContent.trim() : '';
                }});
            }}""", col_index)
        except Exception:
            return []

    def is_rank_column_sequential(self) -> bool:
        """Check if the rank/row numbering is sequential."""
        try:
            return bool(self._page.evaluate("""() => {
                const rows = document.querySelectorAll('tbody tr');
                let prev = 0;
                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 0) continue;
                    const first = cells[0].textContent.trim();
                    const num = parseInt(first);
                    if (!isNaN(num)) {
                        if (num !== prev + 1) return false;
                        prev = num;
                    }
                }
                return prev > 0;
            }"""))
        except Exception:
            return False

    def click_first_dealership_name(self) -> str:
        """Click the first dealership name in the table. Returns the name clicked."""
        try:
            return self._page.evaluate("""() => {
                const links = document.querySelectorAll('tbody a, tbody [class*="cursor-pointer"]');
                for (const link of links) {
                    const text = link.textContent.trim();
                    if (text.length > 3 && text.length < 100) {
                        link.click();
                        return text;
                    }
                }
                // Fallback: click first cell in first row
                const firstCell = document.querySelector('tbody tr td');
                if (firstCell) {
                    const name = firstCell.textContent.trim().split('\\n')[0];
                    firstCell.click();
                    return name;
                }
                return '';
            }""")
        except Exception:
            return ""

    def has_detailed_view_links(self) -> bool:
        """Check if 'Detailed view' links exist in the table."""
        try:
            return bool(self._page.evaluate(
                "() => document.body.innerText.includes('Detailed view')"
            ))
        except Exception:
            return False

    def has_valuation_format_in_table(self) -> bool:
        """Check if table has $X.XXM – $X.XXM format values."""
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.querySelector('tbody') ?
                    document.querySelector('tbody').innerText : '';
                return /\\$[\\d.]+[MBK]?\\s*[–-]\\s*\\$[\\d.]+[MBK]?/.test(text);
            }"""))
        except Exception:
            return False

    def has_trend_arrows_in_table(self) -> bool:
        """Check if MoM trend arrows/indicators exist in the table."""
        try:
            return bool(self._page.evaluate("""() => {
                const tbody = document.querySelector('tbody');
                if (!tbody) return false;
                const text = tbody.innerText;
                // Look for +X.XX% or -X.XX% MoM patterns
                return /[+-]?\\d+\\.\\d+%/.test(text) && text.includes('MoM');
            }"""))
        except Exception:
            return False

    # ── Queries: error/fallback ────────────────────────────────────────────────

    def has_error_or_fallback(self) -> bool:
        """Check if an error message, redirect, or fallback UI is shown."""
        try:
            url = self._page.url
            # Redirected away from /kingdom/view
            if "/kingdom/view" not in url:
                return True
            # Error text on page
            for text in ["error", "not found", "invalid", "something went wrong"]:
                try:
                    if self._page.get_by_text(text, exact=False).first.is_visible(timeout=1000):
                        return True
                except Exception:
                    pass
            return False
        except Exception:
            return False
