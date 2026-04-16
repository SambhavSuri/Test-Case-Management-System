from playwright.sync_api import Page

from pages.dynamic_locator import DynamicLocator

_USERNAME_SELECTORS = [
    'input[name="username"]',
    'input[name="email"]',
    'input[type="email"]',
    '#username',
    '#email',
]

_PASSWORD_SELECTORS = [
    'input[name="password"]',
    'input[type="password"]',
    '#password',
]

_SUBMIT_SELECTORS = [
    'button[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Login")',
    'button:has-text("Log in")',
    'input[type="submit"]',
]

_ERROR_SELECTORS = [
    '[class*="error"]',
    '[class*="Error"]',
    '[role="alert"]',
    '[class*="invalid"]',
    'p:has-text("Invalid")',
    'p:has-text("incorrect")',
    'span:has-text("Invalid")',
    'div:has-text("Invalid credentials")',
]


class LoginPage:
    def __init__(self, page: Page, url: str):
        self._page = page
        self._url = url
        self._dl = DynamicLocator(page)

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _find(self, selectors: list[str]):
        """Return the first matching locator that is visible."""
        for sel in selectors:
            loc = self._page.locator(sel).first
            try:
                if loc.is_visible(timeout=2000):
                    return loc
            except Exception:
                pass
        return None

    # ── Actions ────────────────────────────────────────────────────────────────

    def navigate(self) -> None:
        """Go to the login URL and wait for the form to render."""
        self._page.goto(self._url, wait_until="domcontentloaded")
        combined = ", ".join(_USERNAME_SELECTORS)
        try:
            self._page.wait_for_selector(combined, timeout=15000)
        except Exception:
            pass

    def fill_username(self, value: str) -> None:
        loc = self._find(_USERNAME_SELECTORS)
        if loc:
            loc.fill(value)

    def fill_password(self, value: str) -> None:
        loc = self._find(_PASSWORD_SELECTORS)
        if loc:
            loc.fill(value)

    def click_checkbox(self) -> bool:
        """Click the remember-me / terms checkbox if present. Returns True if clicked."""
        for sel in ['button[role="checkbox"]', 'input[type="checkbox"]']:
            loc = self._page.locator(sel).first
            try:
                if loc.is_visible(timeout=2000):
                    loc.click()
                    self._page.wait_for_timeout(400)
                    return True
            except Exception:
                pass
        return False

    def click_submit(self) -> None:
        loc = self._find(_SUBMIT_SELECTORS)
        if not loc:
            # Fallback: press Enter on password field
            pwd = self._find(_PASSWORD_SELECTORS)
            if pwd:
                pwd.press("Enter")
            return

        # React SPA disables the submit button until form is valid.
        # Wait up to 8s for it to become enabled; if it stays disabled,
        # the form is intentionally blocking submission — return without clicking.
        try:
            self._page.wait_for_function(
                """() => {
                    const btn = document.querySelector('button[type="submit"]');
                    return btn && !btn.disabled;
                }""",
                timeout=8000,
            )
        except Exception:
            return  # Button stayed disabled — form validation is blocking

        current_url = self._page.url
        loc.click()

        # React SPA navigates via pushState — no full page reload.
        # Wait for URL to change away from current page (up to 10s).
        try:
            self._page.wait_for_function(
                f"() => window.location.href !== '{current_url}'",
                timeout=10000,
            )
        except Exception:
            pass  # URL unchanged — login likely failed (wrong creds, error shown)

    def login(self, username: str, password: str,
              click_checkbox: bool = True) -> None:
        """Full login flow: fill fields, optionally click checkbox, submit."""
        self.fill_username(username)
        self.fill_password(password)
        if click_checkbox:
            self.click_checkbox()
        self.click_submit()

    # ── Queries ────────────────────────────────────────────────────────────────

    def is_on_login_page(self) -> bool:
        return "/login" in self._page.url

    def get_error_message(self) -> str:
        """Return visible error text, or empty string if none found."""
        for sel in _ERROR_SELECTORS:
            try:
                loc = self._page.locator(sel).first
                if loc.is_visible(timeout=2000):
                    text = loc.inner_text().strip()
                    if text:
                        return text
            except Exception:
                pass
        return ""

    def is_submit_enabled(self) -> bool:
        """Return True if the submit button exists and is NOT disabled."""
        try:
            result = self._page.evaluate(
                """() => {
                    const btn = document.querySelector('button[type="submit"]');
                    return btn ? !btn.disabled : false;
                }"""
            )
            return bool(result)
        except Exception:
            return False

    def username_field_visible(self) -> bool:
        return self._find(_USERNAME_SELECTORS) is not None

    def password_field_visible(self) -> bool:
        return self._find(_PASSWORD_SELECTORS) is not None

    def submit_button_visible(self) -> bool:
        return self._find(_SUBMIT_SELECTORS) is not None

    def checkbox_visible(self) -> bool:
        for sel in ['button[role="checkbox"]', 'input[type="checkbox"]']:
            try:
                if self._page.locator(sel).first.is_visible(timeout=2000):
                    return True
            except Exception:
                pass
        return False

    # ── New queries for extended login page tests ──────────────────────────────

    def get_heading_text(self) -> str:
        """Return the <h3> heading text (e.g. 'Sign In')."""
        try:
            return self._page.locator("h3").first.inner_text(timeout=5000).strip()
        except Exception:
            return ""

    def get_subheading_text(self) -> str:
        """Return the sub-heading <p> text below the heading."""
        try:
            loc = self._page.locator("h3 + p").first
            return loc.inner_text(timeout=5000).strip()
        except Exception:
            return ""

    def get_username_placeholder(self) -> str:
        loc = self._find(_USERNAME_SELECTORS)
        if loc:
            return loc.get_attribute("placeholder") or ""
        return ""

    def get_password_placeholder(self) -> str:
        loc = self._find(_PASSWORD_SELECTORS)
        if loc:
            return loc.get_attribute("placeholder") or ""
        return ""

    def is_forgot_password_visible(self) -> bool:
        try:
            return self._page.get_by_text("Forgot password?", exact=False).first.is_visible(timeout=3000)
        except Exception:
            return False

    def is_terms_text_visible(self) -> bool:
        try:
            return self._page.get_by_text("I agree to JumpIQ", exact=False).first.is_visible(timeout=3000)
        except Exception:
            return False

    def get_password_input_type(self) -> str:
        """Return the current type attribute of the password input ('password' or 'text')."""
        try:
            return self._page.evaluate("""() => {
                // The password input uses id="password" (no name attribute).
                // After eye toggle the id stays but type changes.
                const el = document.querySelector('#password')
                    || document.querySelector('input[type="password"]');
                return el ? el.type : '';
            }""")
        except Exception:
            return ""

    def click_password_eye_icon(self) -> bool:
        """Click the eye/visibility toggle icon inside the password field. Returns True if clicked."""
        try:
            clicked = self._page.evaluate("""() => {
                // The password input uses id="password" (stable across type toggles).
                const pwd = document.querySelector('#password')
                    || document.querySelector('input[type="password"]');
                if (!pwd) return false;

                // Walk up 4 levels to find a non-submit button (the eye toggle).
                let container = pwd.parentElement;
                for (let i = 0; i < 4 && container; i++) {
                    const btns = container.querySelectorAll('button');
                    for (const btn of btns) {
                        if (btn.type === 'submit') continue;
                        if (btn.textContent.trim().toUpperCase() === 'SIGN IN') continue;
                        btn.click();
                        return true;
                    }
                    container = container.parentElement;
                }
                return false;
            }""")
            if clicked:
                self._page.wait_for_timeout(300)
            return clicked
        except Exception:
            return False

    def set_viewport(self, width: int, height: int) -> None:
        self._page.set_viewport_size({"width": width, "height": height})
        self._page.wait_for_timeout(500)
