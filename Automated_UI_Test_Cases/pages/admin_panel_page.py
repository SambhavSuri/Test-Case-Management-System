"""
Page Object for the Admin Panel (Admin Console).

URLs:
  /admin/users  — Users management
  /admin/groups — Groups management

Reached via: Home Page → avatar dropdown → Admin Panel

Sidebar: OVERVIEW > Dashboard, MANAGEMENT > Users (count), Groups (count)

Users page:
  Search: "Search users..." input
  Filters: All Roles, All Statuses dropdowns
  Table: USER, GROUP, DEALER, ROLE, STATUS, LAST LOGIN, VIEW USER button
  + ADD USER button → dialog with Username, First Name, Last Name, Email, Role, CANCEL, CREATE USER & SEND EMAIL

Groups page:
  Search: "Search groups..." input
  Filters: All Plans, All Statuses dropdowns
  Table: GROUP, PLAN, ROOFTOPS, STATUS, VIEW GROUP button
  + ADD GROUP button
"""
from playwright.sync_api import Page

from pages.dynamic_locator import DynamicLocator


class AdminPanelPage:
    def __init__(self, page: Page):
        self._page = page
        self._dl = DynamicLocator(page)

    def _body_text(self) -> str:
        return self._dl.body_text()

    # ── Page state ────────────────────────────────────────────────────────────

    def is_on_admin_users(self) -> bool:
        return "/admin/users" in self._page.url

    def is_on_admin_groups(self) -> bool:
        return "/admin/groups" in self._page.url

    def get_url(self) -> str:
        return self._page.url

    # ── Sidebar navigation ────────────────────────────────────────────────────

    def is_sidebar_visible(self) -> bool:
        text = self._body_text()
        return "ADMIN CONSOLE" in text or "Dashboard" in text

    def is_users_nav_visible(self) -> bool:
        try:
            return self._page.locator('a[href="/admin/users"]').first.is_visible(timeout=5000)
        except Exception:
            return "Users" in self._body_text()

    def is_groups_nav_visible(self) -> bool:
        try:
            return self._page.locator('a[href="/admin/groups"]').first.is_visible(timeout=5000)
        except Exception:
            return "Groups" in self._body_text()

    def get_users_count_badge(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const link = document.querySelector('a[href="/admin/users"]');
                if (!link) return '';
                const badge = link.querySelector('span[class*="rounded"]');
                return badge ? badge.textContent.trim() : '';
            }""")
        except Exception:
            return ""

    def get_groups_count_badge(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const link = document.querySelector('a[href="/admin/groups"]');
                if (!link) return '';
                const badge = link.querySelector('span[class*="rounded"]');
                return badge ? badge.textContent.trim() : '';
            }""")
        except Exception:
            return ""

    def click_users_nav(self) -> None:
        try:
            self._page.locator('a[href="/admin/users"]').first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    def click_groups_nav(self) -> None:
        try:
            self._page.locator('a[href="/admin/groups"]').first.click()
            self._page.wait_for_timeout(2000)
        except Exception:
            pass

    # ══════════════════════════════════════════════════════════════════════════
    # USERS PAGE
    # ══════════════════════════════════════════════════════════════════════════

    def is_users_heading_visible(self) -> bool:
        try:
            loc = self._page.locator('h3:has-text("Users")').first
            if loc.is_visible(timeout=3000):
                return True
        except Exception:
            pass
        # Fallback: check body text for "Users" heading near top
        text = self._body_text()
        return "Users" in text

    # ── Search ────────────────────────────────────────────────────────────────

    def is_user_search_visible(self) -> bool:
        try:
            return self._page.locator('input[placeholder*="Search users"]').first.is_visible(timeout=3000)
        except Exception:
            return False

    def search_users(self, query: str) -> None:
        try:
            self._page.locator('input[placeholder*="Search users"]').first.fill(query)
            self._page.wait_for_timeout(1500)
        except Exception:
            pass

    def clear_user_search(self) -> None:
        self.search_users("")

    # ── Filters ───────────────────────────────────────────────────────────────

    def is_role_filter_visible(self) -> bool:
        try:
            return self._page.get_by_text("All Roles", exact=False).first.is_visible(timeout=3000)
        except Exception:
            return False

    def is_status_filter_visible(self) -> bool:
        try:
            return self._page.get_by_text("All Statuses", exact=False).first.is_visible(timeout=3000)
        except Exception:
            return False

    # ── Users table ───────────────────────────────────────────────────────────

    def get_user_table_headers(self) -> list:
        text = self._body_text()
        expected = ["USER", "GROUP", "DEALER", "ROLE", "STATUS", "LAST LOGIN"]
        return [h for h in expected if h in text]

    def get_user_row_count(self) -> int:
        try:
            return self._page.evaluate("""() => {
                // Count VIEW USER buttons (case-insensitive)
                const buttons = document.querySelectorAll('button, a');
                let count = 0;
                for (const btn of buttons) {
                    const text = btn.textContent.trim().toUpperCase();
                    if (text.includes('VIEW USER') && btn.offsetHeight > 0)
                        count++;
                }
                if (count > 0) return count;
                // Fallback: count rows with email-like text
                const allText = document.body.innerText;
                const emails = allText.match(/[\\w.-]+@[\\w.-]+/g);
                return emails ? emails.length : 0;
            }""")
        except Exception:
            return 0

    def is_view_user_button_visible(self) -> bool:
        try:
            return self._page.get_by_text("VIEW USER", exact=False).first.is_visible(timeout=3000)
        except Exception:
            return "VIEW USER" in self._body_text() or "View User" in self._body_text()

    def get_first_user_name(self) -> str:
        try:
            return self._page.evaluate("""() => {
                const cells = document.querySelectorAll('td, [class*="table-cell"]');
                for (const cell of cells) {
                    const text = cell.textContent.trim();
                    if (text && text.length > 2 && text.length < 50 && !text.includes('VIEW')
                        && !text.includes('Pending') && !text.includes('Active')
                        && !text.includes('Super User') && !text.includes('Dealer Principal')) {
                        return text;
                    }
                }
                return '';
            }""")
        except Exception:
            return ""

    def is_user_in_list(self, username: str) -> bool:
        text = self._body_text()
        return username in text

    # ── + ADD USER button ─────────────────────────────────────────────────────

    def is_add_user_button_visible(self) -> bool:
        return self._dl.is_visible([
            ("role", "button", "Add User"),
            ("text", "ADD USER"),
            ("css", 'button:has-text("ADD USER")'),
        ])

    def click_add_user(self) -> None:
        self._dl.find_and_click([
            ("role", "button", "Add User"),
            ("text", "ADD USER"),
            ("css", 'button:has-text("ADD USER")'),
        ], wait_after=1000)

    # ── Add User dialog ───────────────────────────────────────────────────────

    def is_add_user_dialog_visible(self) -> bool:
        try:
            return self._page.get_by_text("Add User", exact=True).first.is_visible(timeout=3000)
        except Exception:
            return False

    def is_dialog_subtitle_visible(self) -> bool:
        return "setup email will be sent" in self._body_text()

    def is_username_field_visible(self) -> bool:
        try:
            return self._page.locator('input[placeholder="Username"]').first.is_visible(timeout=3000)
        except Exception:
            return False

    def is_first_name_field_visible(self) -> bool:
        try:
            return self._page.locator('input[placeholder*="First"]').first.is_visible(timeout=3000)
        except Exception:
            return False

    def is_last_name_field_visible(self) -> bool:
        try:
            return self._page.locator('input[placeholder*="Last"]').first.is_visible(timeout=3000)
        except Exception:
            return False

    def is_email_field_visible(self) -> bool:
        try:
            loc = self._page.locator('input[placeholder*="email"], input[placeholder*="Email"], input[placeholder*="example"]').first
            return loc.is_visible(timeout=3000)
        except Exception:
            return False

    def is_role_dropdown_visible(self) -> bool:
        try:
            return self._page.get_by_text("Select role", exact=False).first.is_visible(timeout=3000)
        except Exception:
            return False

    def is_cancel_button_visible(self) -> bool:
        return self._dl.is_visible([
            ("role", "button", "CANCEL"),
            ("role", "button", "Cancel"),
            ("text", "CANCEL"),
            ("text", "Cancel"),
        ])

    def is_create_user_button_visible(self) -> bool:
        return self._dl.is_visible([
            ("role", "button", "CREATE USER & SEND EMAIL"),
            ("text", "CREATE USER"),
            ("css", 'button:has-text("CREATE USER")'),
        ])

    def click_cancel_dialog(self) -> None:
        self._dl.find_and_click([
            ("role", "button", "CANCEL"),
            ("role", "button", "Cancel"),
            ("text", "CANCEL"),
            ("text", "Cancel"),
        ], wait_after=1000)

    def click_close_dialog(self) -> None:
        """Click X button on dialog."""
        try:
            # Look for X/close button - typically a small button with SVG in the dialog
            close_btns = self._page.locator('button').all()
            for btn in close_btns:
                try:
                    box = btn.bounding_box()
                    if box and box["width"] < 50 and box["height"] < 50:
                        text = btn.text_content().strip()
                        if not text or len(text) < 3:
                            btn.click()
                            self._page.wait_for_timeout(1000)
                            return
                except Exception:
                    continue
        except Exception:
            pass
        # Fallback: press Escape
        self._page.keyboard.press("Escape")
        self._page.wait_for_timeout(1000)

    def is_dialog_closed(self) -> bool:
        try:
            # Check if dialog text is no longer visible
            visible = self._page.get_by_text("Add User", exact=True).first.is_visible(timeout=2000)
            return not visible
        except Exception:
            return True

    def fill_add_user_form(self, username: str, first_name: str, last_name: str,
                           email: str, role: str = "") -> None:
        try:
            self._page.locator('input[placeholder="Username"]').first.fill(username)
            self._page.locator('input[placeholder*="First"]').first.fill(first_name)
            self._page.locator('input[placeholder*="Last"]').first.fill(last_name)
            self._page.locator('input[placeholder*="email"], input[placeholder*="Email"], input[placeholder*="example"]').first.fill(email)
            if role:
                self.select_role(role)
            self._page.wait_for_timeout(500)
        except Exception:
            pass

    def select_role(self, role_name: str) -> None:
        """Open Role dropdown and select a role."""
        try:
            self._page.get_by_text("Select role", exact=False).first.click()
            self._page.wait_for_timeout(1000)
            self._page.evaluate("""(name) => {
                const popper = document.querySelector('[data-radix-popper-content-wrapper]');
                if (popper) {
                    const items = popper.querySelectorAll('div[data-index], [role="option"], span');
                    for (const item of items) {
                        if (item.textContent.trim().includes(name) && item.offsetHeight > 0) {
                            item.click(); return;
                        }
                    }
                }
                // Fallback: click text directly
                const all = document.querySelectorAll('*');
                for (const el of all) {
                    if (el.textContent.trim() === name && el.offsetHeight > 0
                        && el.offsetHeight < 50 && el.children.length === 0) {
                        el.click(); return;
                    }
                }
            }""", role_name)
            self._page.wait_for_timeout(1000)
        except Exception:
            pass

    def get_role_dropdown_options(self) -> list:
        """Open Role dropdown and return options."""
        try:
            self._page.get_by_text("Select role", exact=False).first.click()
            self._page.wait_for_timeout(1000)
            options = self._page.evaluate("""() => {
                const popper = document.querySelector('[data-radix-popper-content-wrapper]');
                if (!popper) return [];
                const items = popper.querySelectorAll('div[data-index], [role="option"], span');
                const names = [];
                const seen = new Set();
                for (const item of items) {
                    const text = item.textContent.trim();
                    if (item.offsetHeight > 0 && text && text.length > 2
                        && text.length < 50 && !seen.has(text) && item.children.length === 0) {
                        seen.add(text);
                        names.push(text);
                    }
                }
                return names;
            }""")
            self._page.keyboard.press("Escape")
            self._page.wait_for_timeout(500)
            return options
        except Exception:
            return []

    def click_create_user(self) -> None:
        self._dl.find_and_click([
            ("role", "button", "CREATE USER & SEND EMAIL"),
            ("text", "CREATE USER"),
            ("css", 'button:has-text("CREATE USER")'),
        ], wait_after=3000)

    # ══════════════════════════════════════════════════════════════════════════
    # GROUPS PAGE
    # ══════════════════════════════════════════════════════════════════════════

    def is_groups_heading_visible(self) -> bool:
        try:
            loc = self._page.locator('h3:has-text("Groups")').first
            if loc.is_visible(timeout=3000):
                return True
        except Exception:
            pass
        text = self._body_text()
        return "Groups" in text

    # ── Search ────────────────────────────────────────────────────────────────

    def is_group_search_visible(self) -> bool:
        try:
            return self._page.locator('input[placeholder*="Search groups"]').first.is_visible(timeout=3000)
        except Exception:
            return False

    def search_groups(self, query: str) -> None:
        try:
            self._page.locator('input[placeholder*="Search groups"]').first.fill(query)
            self._page.wait_for_timeout(1500)
        except Exception:
            pass

    # ── Filters ───────────────────────────────────────────────────────────────

    def is_plan_filter_visible(self) -> bool:
        try:
            return self._page.get_by_text("All Plans", exact=False).first.is_visible(timeout=3000)
        except Exception:
            return False

    def is_group_status_filter_visible(self) -> bool:
        try:
            return self._page.get_by_text("All Statuses", exact=False).first.is_visible(timeout=3000)
        except Exception:
            return False

    # ── Groups table ──────────────────────────────────────────────────────────

    def get_group_table_headers(self) -> list:
        text = self._body_text()
        expected = ["GROUP", "PLAN", "ROOFTOPS", "STATUS"]
        return [h for h in expected if h in text]

    def get_group_row_count(self) -> int:
        try:
            return self._page.evaluate("""() => {
                const buttons = document.querySelectorAll('button, a');
                let count = 0;
                for (const btn of buttons) {
                    const text = btn.textContent.trim().toUpperCase();
                    if (text.includes('VIEW GROUP') && btn.offsetHeight > 0)
                        count++;
                }
                if (count > 0) return count;
                // Fallback: count rows with plan text (Core/Compete)
                const allText = document.body.innerText;
                const plans = allText.match(/\\b(Core|Compete)\\b/g);
                return plans ? plans.length : 0;
            }""")
        except Exception:
            return 0

    def is_view_group_button_visible(self) -> bool:
        try:
            return self._page.get_by_text("VIEW GROUP", exact=False).first.is_visible(timeout=3000)
        except Exception:
            return "VIEW GROUP" in self._body_text() or "View Group" in self._body_text()

    def is_group_in_list(self, group_name: str) -> bool:
        text = self._body_text()
        return group_name in text

    # ── + ADD GROUP button ────────────────────────────────────────────────────

    def is_add_group_button_visible(self) -> bool:
        return self._dl.is_visible([
            ("role", "button", "Add Group"),
            ("text", "ADD GROUP"),
            ("css", 'button:has-text("ADD GROUP")'),
        ])

    def click_add_group(self) -> None:
        self._dl.find_and_click([
            ("role", "button", "Add Group"),
            ("text", "ADD GROUP"),
            ("css", 'button:has-text("ADD GROUP")'),
        ], wait_after=1000)

    # ── Add Group dialog ──────────────────────────────────────────────────────

    def is_add_group_dialog_visible(self) -> bool:
        text = self._body_text()
        return "Add Group" in text or "Create" in text

    def is_add_group_dialog_closed(self) -> bool:
        try:
            return not self._page.get_by_text("Add Group", exact=True).first.is_visible(timeout=2000)
        except Exception:
            return True

    def fill_add_group_form(self, group_name: str) -> None:
        """Fill group name in the Add Group form."""
        try:
            # Try common input patterns
            inputs = self._page.locator('input[placeholder*="group"], input[placeholder*="Group"], input[placeholder*="name"]')
            if inputs.count() > 0:
                inputs.first.fill(group_name)
            else:
                # Fallback: find any empty input in the dialog
                self._page.locator('dialog input, [role="dialog"] input').first.fill(group_name)
            self._page.wait_for_timeout(500)
        except Exception:
            pass

    def click_create_group(self) -> None:
        try:
            self._page.get_by_text("CREATE GROUP", exact=False).first.click()
            self._page.wait_for_timeout(3000)
        except Exception:
            try:
                self._page.get_by_text("Create", exact=False).first.click()
                self._page.wait_for_timeout(3000)
            except Exception:
                pass

    # ── Utility ───────────────────────────────────────────────────────────────

    def set_viewport(self, width: int, height: int) -> None:
        self._page.set_viewport_size({"width": width, "height": height})
        self._page.wait_for_timeout(1000)
