"""
Page Object for the Recalibration tab within the Profile page.

URL: /profile (Recalibration tab)
Reached via: Profile → click "Recalibration" tab

Sections:
  Group dropdown: Select dealership group
  Dealership dropdown: Select dealership (populates after group selected)
  Ratio recalibration table:
    RATIO NAME | ORIGINAL VALUE | CURRENT VALUE | NEW VALUE (input + %)
    CALIBRATE button
  Calibration status table (appears after calibration):
    RATIO NAME | ORIGINAL VALUE | CALIBRATED VALUE | ORIGINAL VALUATION | DRAFT VALUATION | USER | DATE
    Success badge
    PUBLISH button
"""
from playwright.sync_api import Page

from pages.dynamic_locator import DynamicLocator


class RecalibrationPage:
    def __init__(self, page: Page):
        self._page = page
        self._dl = DynamicLocator(page)

    def _body_text(self) -> str:
        return self._dl.body_text()

    # ── Tab navigation ────────────────────────────────────────────────────────

    def click_recalibration_tab(self) -> None:
        self._dl.click_tab("Recalibration", wait_after=2000)

    def is_recalibration_tab_active(self) -> bool:
        tab = self._dl.find_tab("Recalibration")
        if tab:
            return tab.get_attribute("data-state") == "active"
        return False

    def is_recalibration_tab_visible(self) -> bool:
        return self._dl.is_visible([
            ("css", 'button[role="tab"]:has-text("Recalibration")'),
            ("role", "tab", "Recalibration"),
        ], timeout=5000)

    # ── Group dropdown ────────────────────────────────────────────────────────

    def is_group_dropdown_visible(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const labels = document.querySelectorAll('label, p, span, div');
                for (const el of labels) {
                    if (el.textContent.trim() === 'Group' && el.offsetHeight > 0)
                        return true;
                }
                return false;
            }"""))
        except Exception:
            return False

    def get_selected_group(self) -> str:
        try:
            return self._page.locator('button#recal-group').text_content().strip()
        except Exception:
            return ""

    def click_group_dropdown(self) -> None:
        try:
            self._page.locator('button#recal-group[role="combobox"]').click()
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def select_group(self, group_name: str) -> None:
        """Open group dropdown, search, and click the matching item."""
        self.click_group_dropdown()
        self._page.wait_for_timeout(500)
        try:
            self._page.locator('input[placeholder*="Search group"]').fill(group_name)
            self._page.wait_for_timeout(1500)
            self._page.locator('[data-radix-popper-content-wrapper] div[data-index]').filter(
                has_text=group_name
            ).first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    def get_group_dropdown_options(self) -> list:
        """Return list of visible group names from the open dropdown."""
        self.click_group_dropdown()
        self._page.wait_for_timeout(1000)
        try:
            return self._page.evaluate("""() => {
                const popper = document.querySelector('[data-radix-popper-content-wrapper]');
                if (!popper) return [];
                const divs = popper.querySelectorAll('div[data-index]');
                const names = [];
                for (const d of divs) {
                    const text = d.textContent.trim();
                    if (d.offsetHeight > 0 && text && text.length > 2)
                        names.push(text);
                }
                return names;
            }""")
        except Exception:
            return []

    def close_dropdown(self) -> None:
        try:
            self._page.keyboard.press("Escape")
            self._page.wait_for_timeout(500)
        except Exception:
            pass

    # ── Dealership dropdown ───────────────────────────────────────────────────

    def is_dealership_dropdown_visible(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const labels = document.querySelectorAll('label, p, span, div');
                for (const el of labels) {
                    if (el.textContent.trim() === 'Dealership' && el.offsetHeight > 0)
                        return true;
                }
                return false;
            }"""))
        except Exception:
            return False

    def get_selected_dealership(self) -> str:
        try:
            return self._page.locator('button#recal-dealership').text_content().strip()
        except Exception:
            return ""

    def click_dealership_dropdown(self) -> None:
        try:
            self._page.locator('button#recal-dealership[role="combobox"]').click()
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def select_dealership(self, dealer_name: str) -> None:
        """Open dealership dropdown, search, and click the matching item."""
        self.click_dealership_dropdown()
        self._page.wait_for_timeout(500)
        try:
            self._page.locator('input[placeholder*="Search dealer"]').fill(dealer_name)
            self._page.wait_for_timeout(1500)
            self._page.locator('[data-radix-popper-content-wrapper] div[data-index]').filter(
                has_text=dealer_name
            ).first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    def get_dealership_dropdown_options(self) -> list:
        """Return list of visible dealership names from the open dropdown."""
        self.click_dealership_dropdown()
        self._page.wait_for_timeout(1000)
        try:
            return self._page.evaluate("""() => {
                const popper = document.querySelector('[data-radix-popper-content-wrapper]');
                if (!popper) return [];
                const divs = popper.querySelectorAll('div[data-index]');
                const names = [];
                for (const d of divs) {
                    const text = d.textContent.trim();
                    if (d.offsetHeight > 0 && text && text.length > 2)
                        names.push(text);
                }
                return names;
            }""")
        except Exception:
            return []

    # ── Ratio recalibration table ─────────────────────────────────────────────

    def is_ratio_recalibration_visible(self) -> bool:
        return "Ratio recalibration" in self._body_text()

    def get_ratio_name(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const text = document.body.innerText;
                if (text.includes('Net profit to Revenue Ratio') || text.includes('Net Profit to Revenue Ratio'))
                    return 'Net profit to Revenue Ratio';
                return '';
            }""")
        except Exception:
            return ""

    def get_original_value(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const cells = document.querySelectorAll('td, div[class*="cell"]');
                for (let i = 0; i < cells.length; i++) {
                    const text = cells[i].textContent.trim();
                    if (text.includes('Net profit') || text.includes('Net Profit')) {
                        // Next cell should be original value
                        if (i + 1 < cells.length) return cells[i + 1].textContent.trim();
                    }
                }
                // Fallback: look for percentage after ORIGINAL VALUE header
                const text = document.body.innerText;
                const match = text.match(/ORIGINAL VALUE[\\s\\S]*?(\\d+\\.?\\d*%)/);
                return match ? match[1] : '';
            }""")
        except Exception:
            return ""

    def get_current_value(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const cells = document.querySelectorAll('td, div[class*="cell"]');
                for (let i = 0; i < cells.length; i++) {
                    if (cells[i].textContent.includes('Net profit')) {
                        if (i + 2 < cells.length) return cells[i + 2].textContent.trim();
                    }
                }
                return '';
            }""")
        except Exception:
            return ""

    def is_original_value_percentage(self) -> bool:
        val = self.get_original_value()
        return "%" in val

    def get_ratio_table_headers(self) -> list:
        try:
            return self._page.evaluate("""() => {
                const headers = [];
                const ths = document.querySelectorAll('th');
                for (const th of ths) {
                    const t = th.textContent.trim();
                    if (t && ['RATIO NAME', 'ORIGINAL VALUE', 'CURRENT VALUE', 'NEW VALUE'].some(
                        h => t.toUpperCase().includes(h)
                    )) headers.push(t);
                }
                if (headers.length > 0) return headers;
                // Fallback: text-based
                const text = document.body.innerText;
                const expected = ['RATIO NAME', 'ORIGINAL VALUE', 'CURRENT VALUE', 'NEW VALUE'];
                return expected.filter(h => text.includes(h));
            }""")
        except Exception:
            return []

    # ── New value input ───────────────────────────────────────────────────────

    def is_new_value_input_visible(self) -> bool:
        try:
            return self._page.locator('input[type="number"]').first.is_visible(timeout=3000)
        except Exception:
            return False

    def fill_new_value(self, value: str) -> None:
        try:
            self._page.locator('input[type="number"]').first.fill(value)
            self._page.wait_for_timeout(500)
        except Exception:
            pass

    def get_new_value_input_value(self) -> str:
        try:
            return self._page.locator('input[type="number"]').first.input_value()
        except Exception:
            return ""

    def clear_new_value(self) -> None:
        self.fill_new_value("")

    # ── Calibrate button ──────────────────────────────────────────────────────

    def is_calibrate_button_visible(self) -> bool:
        return self._dl.is_visible([
            ("role", "button", "CALIBRATE"),
            ("text", "CALIBRATE"),
            ("css", 'button:has-text("CALIBRATE")'),
        ])

    def is_calibrate_button_enabled(self) -> bool:
        btn = self._dl.find_button("CALIBRATE")
        if not btn:
            return False
        disabled = btn.get_attribute("disabled")
        aria_disabled = btn.get_attribute("aria-disabled")
        has_disabled_class = "disabled" in (btn.get_attribute("class") or "").lower()
        return disabled is None and aria_disabled != "true" and not has_disabled_class

    def click_calibrate(self) -> None:
        self._dl.click_button("CALIBRATE", wait_after=5000)

    # ── Calibration status section ────────────────────────────────────────────

    def is_calibration_status_visible(self) -> bool:
        return "Calibration status" in self._body_text()

    def is_success_badge_visible(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText;
                return text.includes('Success');
            }"""))
        except Exception:
            return False

    def get_status_table_headers(self) -> list:
        try:
            return self._page.evaluate("""() => {
                const text = document.body.innerText;
                const expected = ['RATIO NAME', 'ORIGINAL VALUE', 'CALIBRATED VALUE',
                                  'ORIGINAL VALUATION', 'DRAFT VALUATION', 'USER', 'DATE'];
                return expected.filter(h => text.includes(h));
            }""")
        except Exception:
            return []

    def _get_status_row_fields(self) -> list:
        """Parse the calibration status row into fields.

        Expected columns: RATIO NAME, ORIGINAL VALUE, CALIBRATED VALUE,
                         ORIGINAL VALUATION, DRAFT VALUATION, USER, DATE
        """
        # Scroll to calibration status and wait for render
        try:
            self._page.evaluate("""() => {
                const el = Array.from(document.querySelectorAll('h3'))
                    .find(e => e.textContent.includes('Calibration status'));
                if (el) el.scrollIntoView({ block: 'center' });
                else window.scrollTo(0, document.body.scrollHeight);
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass
        try:
            return self._page.evaluate(r"""() => {
                const text = document.body.innerText;
                const idx = text.indexOf('Calibration status');
                if (idx === -1) return [];
                const section = text.substring(idx);
                // Find the data row containing "Net profit"
                const lines = section.split('\n');
                for (const line of lines) {
                    if (line.includes('Net profit') || line.includes('Net Profit')) {
                        // Try tab split first
                        let fields = line.split('\t').map(f => f.trim());
                        if (fields.length >= 4) return fields;
                        // Fallback: the row might be a single line with mixed separators
                        // Try splitting by known patterns
                        fields = line.split(/\t+/).map(f => f.trim());
                        if (fields.length >= 4) return fields;
                    }
                }
                // Fallback: collect all values from the status section using regex
                // Pattern: ratio name, pct, pct, $val, $val, username
                const pcts = section.match(/(\d+\.?\d*%)/g) || [];
                const dollars = section.match(/\$[\d,.]+[BMK]?/g) || [];
                const hasNetProfit = section.includes('Net profit') || section.includes('Net Profit');
                if (hasNetProfit && pcts.length >= 2 && dollars.length >= 2) {
                    // Find username - word after last dollar value
                    const afterDollars = section.substring(section.lastIndexOf(dollars[1]) + dollars[1].length);
                    const userMatch = afterDollars.match(/([a-zA-Z]\w+)/);
                    const user = userMatch ? userMatch[1] : '';
                    return ['Net profit to Revenue Ratio', pcts[0], pcts[1], dollars[0], dollars[1], user];
                }
                return [];
            }""")
        except Exception:
            return []

    def get_status_ratio_name(self) -> str:
        fields = self._get_status_row_fields()
        return fields[0] if len(fields) > 0 else ""

    def get_status_original_value(self) -> str:
        fields = self._get_status_row_fields()
        return fields[1] if len(fields) > 1 else ""

    def get_status_calibrated_value(self) -> str:
        fields = self._get_status_row_fields()
        return fields[2] if len(fields) > 2 else ""

    def get_status_original_valuation(self) -> str:
        fields = self._get_status_row_fields()
        return fields[3] if len(fields) > 3 else ""

    def get_status_draft_valuation(self) -> str:
        fields = self._get_status_row_fields()
        return fields[4] if len(fields) > 4 else ""

    def get_status_user(self) -> str:
        fields = self._get_status_row_fields()
        return fields[5] if len(fields) > 5 else ""

    def get_status_row_count(self) -> int:
        try:
            return self._page.evaluate(r"""() => {
                const text = document.body.innerText;
                const idx = text.indexOf('Calibration status');
                if (idx === -1) return 0;
                const section = text.substring(idx);
                const dollars = section.match(/\$[\d,.]+[BMK]?/g);
                return dollars ? Math.floor(dollars.length / 2) : 0;
            }""")
        except Exception:
            return 0

    def has_currency_formatted_valuations(self) -> bool:
        orig = self.get_status_original_valuation()
        draft = self.get_status_draft_valuation()
        return "$" in orig and "$" in draft

    # ── Publish button ────────────────────────────────────────────────────────

    def is_publish_button_visible(self) -> bool:
        return self._dl.is_visible([
            ("role", "button", "PUBLISH"),
            ("text", "PUBLISH"),
            ("css", 'button:has-text("PUBLISH")'),
        ])

    def click_publish(self) -> None:
        self._dl.click_button("PUBLISH", wait_after=5000)

    # ── Validation / error messages ───────────────────────────────────────────

    def has_validation_error(self) -> bool:
        try:
            return bool(self._page.evaluate("""() => {
                const text = document.body.innerText.toLowerCase();
                return text.includes('error') || text.includes('invalid')
                    || text.includes('required') || text.includes('please enter');
            }"""))
        except Exception:
            return False

    def get_validation_message(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const msgs = document.querySelectorAll(
                    '[class*="error"], [class*="alert"], [class*="warning"], [class*="toast"], [role="alert"]'
                );
                for (const m of msgs) {
                    if (m.offsetHeight > 0 && m.textContent.trim())
                        return m.textContent.trim();
                }
                return '';
            }""")
        except Exception:
            return ""

    # ── Full calibration flow helpers ─────────────────────────────────────────

    def perform_calibration(self, value: str) -> None:
        """Enter a value and click CALIBRATE."""
        self.fill_new_value(value)
        self.click_calibrate()
        # Scroll to status section to ensure it's rendered
        try:
            self._page.evaluate("""() => {
                window.scrollTo(0, document.body.scrollHeight);
            }""")
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def full_setup_and_calibrate(self, group: str, dealer: str, value: str) -> None:
        """Select group, dealership, enter value, and calibrate."""
        self.select_group(group)
        self.select_dealership(dealer)
        self.fill_new_value(value)
        self.click_calibrate()

    def set_viewport(self, width: int, height: int) -> None:
        self._page.set_viewport_size({"width": width, "height": height})
        self._page.wait_for_timeout(1000)
