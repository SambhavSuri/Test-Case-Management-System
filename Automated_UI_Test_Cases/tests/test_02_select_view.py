"""
Select View page test cases for J3 (https://dev.valueup.jumpiq.com/select)

TC-09  View cards visible after login       → DP View + GM View cards present
TC-10  GM View → group selection             → dealer modal appears
TC-11  GM View → group → dealer → dashboard  → lands on dealer dashboard
TC-12  Unauthorized access without login     → redirected to /login
TC-13  Browser back after logout             → stays on /login
"""
import pytest

from pages.login_page import LoginPage
from pages.select_view_page import SelectViewPage

GROUP_NAME = "KEN GARFF AUTOMOTIVE GROUP"
DEALER_NAME = "KEN GARFF CHEVROLET"


# ─────────────────────────────────────────────────────────────────────────────
# TC-09: Both view cards visible after login
# ─────────────────────────────────────────────────────────────────────────────
def test_tc09_view_cards_visible(logged_in_page, request):
    svp = SelectViewPage(logged_in_page)

    steps = (
        "1. Login with valid credentials\n"
        "2. Verify URL is /select\n"
        "3. Verify DP View card is visible\n"
        "4. Verify GM View card is visible"
    )
    expected = "DP View and GM View cards visible on /select page"
    on_select = svp.is_on_select_page()
    dp_ok = svp.is_dp_view_visible()
    gm_ok = svp.is_gm_view_visible()
    actual = (
        f"on_select={on_select}; "
        f"dp_view_visible={dp_ok}; gm_view_visible={gm_ok}"
    )
    status = "PASS" if (on_select and dp_ok and gm_ok) else "FAIL"

    request.node._record("TC-09", steps, expected, actual, status)
    assert on_select, f"TC-09 FAIL: not on /select. URL={logged_in_page.url}"
    assert dp_ok, "TC-09 FAIL: DP View card not visible"
    assert gm_ok, "TC-09 FAIL: GM View card not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-10: GM View → group search → dealer modal appears
# ─────────────────────────────────────────────────────────────────────────────
def test_tc10_gm_view_group_selection(logged_in_page, request):
    svp = SelectViewPage(logged_in_page)

    svp.click_gm_view()
    search_visible = svp.is_search_input_visible()

    svp.search_and_select_group(GROUP_NAME)
    modal_visible = svp.is_dealer_modal_visible()

    steps = (
        "1. Login with valid credentials\n"
        "2. On /select page, click GM View card\n"
        "3. Verify group search input appears\n"
        f"4. Search for '{GROUP_NAME}' and click the group card\n"
        "5. Verify dealer selection modal appears"
    )
    expected = (
        "GM View clickable; group search appears; "
        "after selecting group, dealer selection appears"
    )
    actual = (
        f"search_visible={search_visible}; "
        f"dealer_modal_visible={modal_visible}; "
        f"URL={logged_in_page.url}"
    )
    status = "PASS" if (search_visible and modal_visible) else "FAIL"

    request.node._record("TC-10", steps, expected, actual, status)
    assert search_visible, "TC-10 FAIL: group search input not visible after GM View click"
    assert modal_visible, "TC-10 FAIL: dealer selection not visible after group click"


# ─────────────────────────────────────────────────────────────────────────────
# TC-11: Full GM View flow → dealer dashboard loads
# ─────────────────────────────────────────────────────────────────────────────
def test_tc11_gm_view_full_flow_to_dashboard(logged_in_page, request):
    svp = SelectViewPage(logged_in_page)

    svp.click_gm_view()
    svp.search_and_select_group(GROUP_NAME)
    svp.search_and_select_dealer(DEALER_NAME)

    on_dashboard = svp.is_on_dashboard()

    steps = (
        "1. Login with valid credentials\n"
        "2. On /select page, click GM View card\n"
        f"3. Search for '{GROUP_NAME}' and click the group card\n"
        f"4. In dealer modal, search for '{DEALER_NAME}' and click it\n"
        "5. Verify URL navigates to dealer dashboard"
    )
    expected = (
        "After GM View → group → dealer selection, "
        "user lands on dealer dashboard (URL away from /select and /login)"
    )
    actual = f"on_dashboard={on_dashboard}; URL={logged_in_page.url}"
    status = "PASS" if on_dashboard else "FAIL"

    request.node._record("TC-11", steps, expected, actual, status)
    assert on_dashboard, f"TC-11 FAIL: not on dashboard. URL={logged_in_page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-12: Unauthorized access — /select without login redirects to /login
# ─────────────────────────────────────────────────────────────────────────────
def test_tc12_unauthorized_access_redirects(browser, credentials, request):
    # Use a fresh context with no cookies/storage — truly unauthenticated
    context = browser.new_context()
    p = context.new_page()

    select_url = credentials["url"].replace("/login", "/select")
    p.goto(select_url, wait_until="domcontentloaded")

    # React SPA may serve the shell first, then client-side redirect to /login.
    try:
        p.wait_for_function(
            "() => window.location.href.includes('/login')",
            timeout=10000,
        )
    except Exception:
        pass

    steps = (
        "1. Open a new browser with no session/cookies\n"
        "2. Navigate directly to /select URL\n"
        "3. Wait for React SPA to redirect\n"
        "4. Verify URL contains /login"
    )
    expected = "Accessing /select without login redirects to /login"
    redirected = "/login" in p.url
    actual = f"redirected_to_login={redirected}; URL={p.url}"
    status = "PASS" if redirected else "FAIL"

    request.node._record("TC-12", steps, expected, actual, status)
    context.close()
    assert redirected, f"TC-12 FAIL: was not redirected to login. URL={p.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-13: Browser back after logout stays on /login
# ─────────────────────────────────────────────────────────────────────────────
def test_tc13_back_after_logout_stays_on_login(page, credentials, request):
    # Step 1: Login
    lp = LoginPage(page, credentials["url"])
    lp.navigate()
    lp.login(credentials["username"], credentials["password"])

    # Verify we left /login
    assert not lp.is_on_login_page(), "Pre-condition failed: login did not navigate away"

    # Step 2: Clear session (cookies + localStorage) to simulate logout
    page.context.clear_cookies()
    page.evaluate("window.localStorage.clear(); window.sessionStorage.clear()")

    # Step 3: Navigate to login
    page.goto(credentials["url"], wait_until="domcontentloaded")
    page.wait_for_timeout(1000)

    # Step 4: Press browser back
    page.go_back()
    page.wait_for_timeout(2000)

    try:
        page.wait_for_function(
            "() => window.location.href.includes('/login')",
            timeout=5000,
        )
    except Exception:
        pass

    steps = (
        "1. Login with valid credentials\n"
        "2. Clear cookies and session storage (simulate logout)\n"
        "3. Navigate to login page\n"
        "4. Press browser back button\n"
        "5. Verify URL still contains /login"
    )
    expected = "After logout, browser back button keeps user on /login"
    on_login = "/login" in page.url
    actual = f"on_login={on_login}; URL={page.url}"
    status = "PASS" if on_login else "FAIL"

    request.node._record("TC-13", steps, expected, actual, status)
    assert on_login, f"TC-13 FAIL: browser back escaped login. URL={page.url}"
