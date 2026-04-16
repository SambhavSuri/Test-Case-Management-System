"""
Page Object for the Profile page.

URL: /profile
Tabs: Profile, Change Password, User Management, Recalibration (button[role="tab"])
Reached via: Home Page → user avatar dropdown → Profile

Profile tab: Bruce Molloy, @bruce, Account Information (Username, Email, User ID)
User Management tab: Select Group dropdown, ADD NEW USER button, User List, search bar
Add New User dialog: role="dialog", fields: Username, Email, First Name, Last Name, Role, Group Name
                     buttons: CANCEL, ADD USER
"""
from playwright.sync_api import Page

from pages.dynamic_locator import DynamicLocator


class ProfilePage:
    def __init__(self, page: Page):
        self._page = page
        self._dl = DynamicLocator(page)

    # ── Queries: page state ────────────────────────────────────────────────────

    def is_on_profile_page(self) -> bool:
        return "/profile" in self._page.url

    # ── Queries: tabs ──────────────────────────────────────────────────────────

    def is_profile_tab_visible(self) -> bool:
        try:
            return self._page.locator('button[role="tab"]:has-text("Profile")').first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_change_password_tab_visible(self) -> bool:
        try:
            return self._page.locator('button[role="tab"]:has-text("Change Password")').first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_user_management_tab_visible(self) -> bool:
        try:
            return self._page.locator('button[role="tab"]:has-text("User Management")').first.is_visible(timeout=5000)
        except Exception:
            return False

    # ── Queries: profile tab content ───────────────────────────────────────────

    def is_account_info_visible(self) -> bool:
        try:
            return self._page.get_by_text("Account Information", exact=False).first.is_visible(timeout=5000)
        except Exception:
            return False

    def get_displayed_username(self) -> str:
        try:
            # Username is shown after the "Username" label
            loc = self._page.get_by_text("Username", exact=True).first
            if loc.is_visible(timeout=3000):
                # The value is in a sibling/next element
                parent = loc.locator("xpath=..")
                return parent.inner_text(timeout=3000).replace("Username", "").strip()
        except Exception:
            pass
        return ""

    # ── Actions: tab navigation ────────────────────────────────────────────────

    def click_profile_tab(self) -> None:
        self._page.locator('button[role="tab"]:has-text("Profile")').first.click()
        self._page.wait_for_timeout(1000)

    def click_user_management_tab(self) -> None:
        self._page.locator('button[role="tab"]:has-text("User Management")').first.click()
        self._page.wait_for_timeout(1000)

    # ── Queries: User Management tab ───────────────────────────────────────────

    def is_user_management_heading_visible(self) -> bool:
        try:
            return self._page.get_by_text("User Management", exact=False).first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_add_new_user_button_visible(self) -> bool:
        try:
            return self._page.get_by_text("Add New User", exact=False).first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_select_group_dropdown_visible(self) -> bool:
        try:
            return self._page.get_by_text("Select a group", exact=False).first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_user_list_visible(self) -> bool:
        try:
            return self._page.get_by_text("User List", exact=False).first.is_visible(timeout=5000)
        except Exception:
            return False

    # ── Actions: User Management ───────────────────────────────────────────────

    def click_add_new_user(self) -> None:
        self._page.get_by_text("Add New User", exact=False).first.click()
        self._page.wait_for_timeout(1000)

    # ── Queries: Add New User dialog ───────────────────────────────────────────

    def is_add_user_dialog_visible(self) -> bool:
        try:
            return self._page.locator('[role="dialog"]').first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_add_user_dialog_title_correct(self) -> bool:
        try:
            return self._page.get_by_text("Add New User", exact=True).first.is_visible(timeout=3000)
        except Exception:
            return False

    def is_cancel_button_visible(self) -> bool:
        try:
            dialog = self._page.locator('[role="dialog"]').first
            return dialog.get_by_text("Cancel", exact=False).first.is_visible(timeout=3000)
        except Exception:
            return False

    def click_cancel_on_dialog(self) -> None:
        dialog = self._page.locator('[role="dialog"]').first
        dialog.get_by_text("Cancel", exact=False).first.click()
        self._page.wait_for_timeout(500)

    def click_close_dialog(self) -> None:
        """Click the X button on the dialog."""
        try:
            self._page.locator('[role="dialog"] button:has(svg)').first.click()
            self._page.wait_for_timeout(500)
        except Exception:
            pass

    def is_dialog_closed(self) -> bool:
        try:
            return not self._page.locator('[role="dialog"]').first.is_visible(timeout=2000)
        except Exception:
            return True
