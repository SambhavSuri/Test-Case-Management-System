"""
Page Object for the Kingdom Home Page.

URL pattern: /kingdom/home?groupId=...
Reached via: Login → /select → DP View → search group → click group card.

Sections: MY DEALERSHIPS, GROUPS, DAILY UPDATES
CTAs: SEE MY DEALERSHIPS, OTHER GROUPS, VIEW FULL ANALYSIS
Nav: My Dealerships, Single Dealership, Groups, View As, HOW IT WORKS, CONTACT US, user avatar
User dropdown: Profile, Admin Panel, Logout
"""
from playwright.sync_api import Page

from pages.dynamic_locator import DynamicLocator


class HomePage:
    def __init__(self, page: Page):
        self._page = page
        self._dl = DynamicLocator(page)

    # ── Queries: page state ────────────────────────────────────────────────────

    def is_on_home_page(self) -> bool:
        return "/kingdom/home" in self._page.url

    # ── Queries: sections visible ──────────────────────────────────────────────

    def is_my_dealerships_section_visible(self) -> bool:
        try:
            return self._page.locator('text="MY DEALERSHIPS"').first.is_visible(timeout=8000)
        except Exception:
            return False

    def is_groups_section_visible(self) -> bool:
        try:
            return self._page.locator('text="GROUPS"').first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_daily_updates_section_visible(self) -> bool:
        try:
            return self._page.locator('text="DAILY UPDATES"').first.is_visible(timeout=5000)
        except Exception:
            return False

    # ── Queries: nav bar elements ──────────────────────────────────────────────

    def is_nav_my_dealerships_visible(self) -> bool:
        try:
            return self._page.locator('text="My Dealerships"').first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_nav_single_dealership_visible(self) -> bool:
        try:
            return self._page.locator('text="Single Dealership"').first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_nav_groups_visible(self) -> bool:
        try:
            return self._page.locator('text="Groups"').first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_nav_view_as_visible(self) -> bool:
        try:
            return self._page.locator('text="View As"').first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_search_dealerships_visible(self) -> bool:
        try:
            loc = self._page.locator('input[placeholder*="Search Dealerships"], input[placeholder*="earch"]').first
            return loc.is_visible(timeout=5000)
        except Exception:
            return False

    def is_how_it_works_visible(self) -> bool:
        try:
            loc = self._page.get_by_text("HOW IT WORKS", exact=False).first
            return loc.is_visible(timeout=5000)
        except Exception:
            try:
                loc = self._page.get_by_text("How it Works", exact=False).first
                return loc.is_visible(timeout=3000)
            except Exception:
                return False

    def is_contact_us_visible(self) -> bool:
        try:
            loc = self._page.get_by_text("CONTACT US", exact=False).first
            return loc.is_visible(timeout=5000)
        except Exception:
            try:
                loc = self._page.get_by_text("Contact Us", exact=False).first
                return loc.is_visible(timeout=3000)
            except Exception:
                return False

    # ── Queries: CTA buttons ───────────────────────────────────────────────────

    def is_see_my_dealerships_cta_visible(self) -> bool:
        try:
            return self._page.locator('text="SEE MY DEALERSHIPS"').first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_other_groups_cta_visible(self) -> bool:
        try:
            return self._page.locator('text="OTHER GROUPS"').first.is_visible(timeout=5000)
        except Exception:
            return False

    def is_view_full_analysis_cta_visible(self) -> bool:
        try:
            return self._page.locator('text="VIEW FULL ANALYSIS"').first.is_visible(timeout=5000)
        except Exception:
            return False

    # ── Actions: CTA clicks ────────────────────────────────────────────────────

    def click_see_my_dealerships(self) -> None:
        self._page.locator('text="SEE MY DEALERSHIPS"').first.click()
        self._page.wait_for_load_state("domcontentloaded")
        self._page.wait_for_timeout(1500)

    def click_other_groups(self) -> None:
        self._page.locator('text="OTHER GROUPS"').first.click()
        self._page.wait_for_load_state("domcontentloaded")
        self._page.wait_for_timeout(1500)

    def click_view_full_analysis(self) -> None:
        loc = self._page.locator('text="VIEW FULL ANALYSIS"').first
        loc.scroll_into_view_if_needed()
        loc.click()
        self._page.wait_for_load_state("domcontentloaded")
        self._page.wait_for_timeout(1500)

    def click_how_it_works(self) -> None:
        try:
            self._page.get_by_text("HOW IT WORKS", exact=False).first.click()
        except Exception:
            self._page.get_by_text("How it Works", exact=False).first.click()
        self._page.wait_for_load_state("domcontentloaded")
        self._page.wait_for_timeout(1500)

    # ── Actions: user dropdown / logout ────────────────────────────────────────

    def open_user_dropdown(self) -> None:
        """Click the user avatar button (top-right) to open the dropdown."""
        # The avatar button contains the user's initials (e.g. "BM")
        # It's a <button> in the top-right nav area
        try:
            self._page.locator('button:has-text("BM")').first.click()
            self._page.wait_for_timeout(500)
        except Exception:
            # Fallback: click the last button in the top nav area
            self._page.locator('header button >> nth=-1').click()
            self._page.wait_for_timeout(500)

    def is_dropdown_open(self) -> bool:
        """Check if the user dropdown is showing Profile, Logout etc."""
        try:
            return self._page.locator('[role="menuitem"]:has-text("Logout")').first.is_visible(timeout=3000)
        except Exception:
            return False

    def is_profile_option_visible(self) -> bool:
        try:
            return self._page.locator('[role="menuitem"]:has-text("Profile")').first.is_visible(timeout=3000)
        except Exception:
            return False

    def click_logout(self) -> None:
        """Click Logout from the user dropdown."""
        self._page.locator('[role="menuitem"]:has-text("Logout")').first.click()
        self._page.wait_for_timeout(2000)

    def click_profile(self) -> None:
        """Click Profile from the user dropdown."""
        self._page.locator('[role="menuitem"]:has-text("Profile")').first.click()
        self._page.wait_for_load_state("domcontentloaded")
        self._page.wait_for_timeout(1500)
