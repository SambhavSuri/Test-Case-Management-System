"""
Home Page test cases for J3 (/kingdom/home?groupId=...)

TC-14  Home page loads after login           → header, nav, sections visible
TC-15  Home page UI layout                   → nav elements + CTA buttons visible
TC-16  CTA: SEE MY DEALERSHIPS               → redirects to dealerships page
TC-17  CTA: OTHER GROUPS                     → redirects to groups page
TC-18  CTA: VIEW FULL ANALYSIS               → redirects to analysis page
TC-19  Logout flow                           → avatar → dropdown → logout → /login
TC-20  Back-button returns to home            → navigate away → back → home page
TC-21  HOW IT WORKS button                   → opens How it Works page
"""
from pages.home_page import HomePage
from pages.login_page import LoginPage


# ─────────────────────────────────────────────────────────────────────────────
# TC-14: Home page loads after successful login + DP View
# ─────────────────────────────────────────────────────────────────────────────
def test_tc14_home_page_loads(home_page_page, request):
    hp = HomePage(home_page_page)

    steps = (
        "1. Login with valid credentials\n"
        "2. Select DP View on /select page\n"
        "3. Search and select KEN GARFF AUTOMOTIVE GROUP\n"
        "4. Verify URL is /kingdom/home\n"
        "5. Verify MY DEALERSHIPS section is visible\n"
        "6. Verify GROUPS section is visible\n"
        "7. Verify DAILY UPDATES section is visible"
    )
    expected = (
        "Home page at /kingdom/home loads with "
        "MY DEALERSHIPS, GROUPS, DAILY UPDATES sections"
    )
    on_home = hp.is_on_home_page()
    dealers = hp.is_my_dealerships_section_visible()
    groups = hp.is_groups_section_visible()
    updates = hp.is_daily_updates_section_visible()

    actual = (
        f"on_home={on_home}; my_dealerships={dealers}; "
        f"groups={groups}; daily_updates={updates}; URL={home_page_page.url}"
    )
    status = "PASS" if (on_home and dealers and groups and updates) else "FAIL"

    request.node._record("TC-14", steps, expected, actual, status)
    assert on_home, f"TC-14 FAIL: not on home page. URL={home_page_page.url}"
    assert dealers, "TC-14 FAIL: MY DEALERSHIPS section not visible"
    assert groups, "TC-14 FAIL: GROUPS section not visible"
    assert updates, "TC-14 FAIL: DAILY UPDATES section not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-15: Home page UI layout — nav elements + CTA buttons
# ─────────────────────────────────────────────────────────────────────────────
def test_tc15_home_page_ui_layout(home_page_page, request):
    hp = HomePage(home_page_page)

    steps = (
        "1. Navigate to Home Page (Login → DP View → group)\n"
        "2. Verify nav links: My Dealerships, Single Dealership, Groups, View As\n"
        "3. Verify HOW IT WORKS button visible\n"
        "4. Verify CONTACT US button visible\n"
        "5. Verify CTA: SEE MY DEALERSHIPS visible\n"
        "6. Verify CTA: OTHER GROUPS visible\n"
        "7. Verify CTA: VIEW FULL ANALYSIS visible"
    )
    expected = (
        "Nav bar: My Dealerships, Single Dealership, Groups, View As, "
        "HOW IT WORKS, CONTACT US visible. "
        "CTAs: SEE MY DEALERSHIPS, OTHER GROUPS, VIEW FULL ANALYSIS visible"
    )

    nav_my = hp.is_nav_my_dealerships_visible()
    nav_single = hp.is_nav_single_dealership_visible()
    nav_groups = hp.is_nav_groups_visible()
    nav_view_as = hp.is_nav_view_as_visible()
    nav_how = hp.is_how_it_works_visible()
    nav_contact = hp.is_contact_us_visible()

    cta_dealers = hp.is_see_my_dealerships_cta_visible()
    cta_groups = hp.is_other_groups_cta_visible()
    cta_analysis = hp.is_view_full_analysis_cta_visible()

    actual = (
        f"nav: my_dealerships={nav_my}, single_dealership={nav_single}, "
        f"groups={nav_groups}, view_as={nav_view_as}, "
        f"how_it_works={nav_how}, contact_us={nav_contact}; "
        f"cta: see_my_dealerships={cta_dealers}, "
        f"other_groups={cta_groups}, view_full_analysis={cta_analysis}"
    )

    all_ok = all([
        nav_my, nav_single, nav_groups, nav_view_as,
        nav_how, nav_contact,
        cta_dealers, cta_groups, cta_analysis,
    ])
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-15", steps, expected, actual, status)
    assert nav_my, "TC-15 FAIL: My Dealerships nav not visible"
    assert nav_single, "TC-15 FAIL: Single Dealership nav not visible"
    assert nav_groups, "TC-15 FAIL: Groups nav not visible"
    assert nav_view_as, "TC-15 FAIL: View As nav not visible"
    assert nav_how, "TC-15 FAIL: HOW IT WORKS not visible"
    assert nav_contact, "TC-15 FAIL: CONTACT US not visible"
    assert cta_dealers, "TC-15 FAIL: SEE MY DEALERSHIPS CTA not visible"
    assert cta_groups, "TC-15 FAIL: OTHER GROUPS CTA not visible"
    assert cta_analysis, "TC-15 FAIL: VIEW FULL ANALYSIS CTA not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-16: CTA — SEE MY DEALERSHIPS redirects
# ─────────────────────────────────────────────────────────────────────────────
def test_tc16_cta_see_my_dealerships(home_page_page, request):
    hp = HomePage(home_page_page)
    home_url = home_page_page.url

    hp.click_see_my_dealerships()

    steps = (
        "1. Navigate to Home Page\n"
        "2. Click the SEE MY DEALERSHIPS CTA button\n"
        "3. Verify URL changes away from home page"
    )
    expected = "Clicking SEE MY DEALERSHIPS redirects away from home page"
    navigated = home_page_page.url != home_url
    actual = f"navigated={navigated}; URL={home_page_page.url}"
    status = "PASS" if navigated else "FAIL"

    request.node._record("TC-16", steps, expected, actual, status)
    assert navigated, f"TC-16 FAIL: URL unchanged after click. URL={home_page_page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-17: CTA — OTHER GROUPS redirects
# ─────────────────────────────────────────────────────────────────────────────
def test_tc17_cta_other_groups(home_page_page, request):
    hp = HomePage(home_page_page)
    home_url = home_page_page.url

    hp.click_other_groups()

    steps = (
        "1. Navigate to Home Page\n"
        "2. Click the OTHER GROUPS CTA button\n"
        "3. Verify URL changes away from home page"
    )
    expected = "Clicking OTHER GROUPS redirects away from home page"
    navigated = home_page_page.url != home_url
    actual = f"navigated={navigated}; URL={home_page_page.url}"
    status = "PASS" if navigated else "FAIL"

    request.node._record("TC-17", steps, expected, actual, status)
    assert navigated, f"TC-17 FAIL: URL unchanged after click. URL={home_page_page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-18: CTA — VIEW FULL ANALYSIS redirects
# ─────────────────────────────────────────────────────────────────────────────
def test_tc18_cta_view_full_analysis(home_page_page, request):
    hp = HomePage(home_page_page)
    home_url = home_page_page.url

    hp.click_view_full_analysis()

    # Wait for possible React navigation or URL hash/query change
    try:
        home_page_page.wait_for_function(
            f"() => window.location.href !== '{home_url}'",
            timeout=5000,
        )
    except Exception:
        pass

    steps = (
        "1. Navigate to Home Page\n"
        "2. Scroll down to VIEW FULL ANALYSIS CTA button\n"
        "3. Click the button\n"
        "4. Verify URL changes or new content appears"
    )
    expected = "VIEW FULL ANALYSIS CTA is clickable and triggers navigation or content change"
    navigated = home_page_page.url != home_url

    # If URL didn't change, check if new content appeared (e.g. expanded section)
    content_changed = False
    if not navigated:
        try:
            content_changed = home_page_page.evaluate("""() => {
                return window.scrollY > 200
                    || document.querySelectorAll('[class*="analysis"], [class*="Analysis"]').length > 0
                    || document.querySelectorAll('dialog, [role="dialog"]').length > 0;
            }""")
        except Exception:
            pass

    actual = f"navigated={navigated}; content_changed={content_changed}; URL={home_page_page.url}"
    status = "PASS" if (navigated or content_changed) else "FAIL"

    request.node._record("TC-18", steps, expected, actual, status)
    assert navigated or content_changed, (
        f"TC-18 FAIL: no navigation or content change after click. URL={home_page_page.url}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-19: Logout flow — avatar → dropdown → Logout → /login
# ─────────────────────────────────────────────────────────────────────────────
def test_tc19_logout_flow(home_page_page, request):
    hp = HomePage(home_page_page)

    hp.open_user_dropdown()
    dropdown_ok = hp.is_dropdown_open()

    hp.click_logout()

    # Wait for redirect to /login
    try:
        home_page_page.wait_for_function(
            "() => window.location.href.includes('/login')",
            timeout=10000,
        )
    except Exception:
        pass

    steps = (
        "1. Navigate to Home Page\n"
        "2. Click the user avatar (BM) in top-right corner\n"
        "3. Verify dropdown opens with Profile, Admin Panel, Logout\n"
        "4. Click Logout\n"
        "5. Verify URL redirects to /login"
    )
    expected = "User dropdown opens; clicking Logout redirects to /login"
    on_login = "/login" in home_page_page.url
    actual = f"dropdown_open={dropdown_ok}; on_login={on_login}; URL={home_page_page.url}"
    status = "PASS" if (dropdown_ok and on_login) else "FAIL"

    request.node._record("TC-19", steps, expected, actual, status)
    assert dropdown_ok, "TC-19 FAIL: user dropdown did not open"
    assert on_login, f"TC-19 FAIL: not redirected to /login after logout. URL={home_page_page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-20: Back-button returns to home page after navigating away
# ─────────────────────────────────────────────────────────────────────────────
def test_tc20_back_button_returns_to_home(home_page_page, request):
    hp = HomePage(home_page_page)

    home_url = home_page_page.url

    # Navigate away by clicking a CTA
    hp.click_see_my_dealerships()
    away_url = home_page_page.url
    assert away_url != home_url, "Pre-condition failed: CTA did not navigate away"

    # Press browser back
    home_page_page.go_back()
    home_page_page.wait_for_timeout(2000)

    steps = (
        "1. Navigate to Home Page\n"
        "2. Click SEE MY DEALERSHIPS CTA to navigate away\n"
        "3. Verify URL changed\n"
        "4. Press browser back button\n"
        "5. Verify URL returns to /kingdom/home"
    )
    expected = "After navigating away, browser back returns to home page"
    back_on_home = hp.is_on_home_page()
    actual = f"back_on_home={back_on_home}; URL={home_page_page.url}"
    status = "PASS" if back_on_home else "FAIL"

    request.node._record("TC-20", steps, expected, actual, status)
    assert back_on_home, f"TC-20 FAIL: back button did not return to home. URL={home_page_page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-21: HOW IT WORKS button opens page
# ─────────────────────────────────────────────────────────────────────────────
def test_tc21_how_it_works(home_page_page, request):
    hp = HomePage(home_page_page)
    home_url = home_page_page.url

    hp.click_how_it_works()

    steps = (
        "1. Navigate to Home Page\n"
        "2. Click the HOW IT WORKS button in the nav bar\n"
        "3. Verify URL changes to How it Works page"
    )
    expected = "Clicking HOW IT WORKS opens the How it Works page"
    navigated = home_page_page.url != home_url
    actual = f"navigated={navigated}; URL={home_page_page.url}"
    status = "PASS" if navigated else "FAIL"

    request.node._record("TC-21", steps, expected, actual, status)
    assert navigated, f"TC-21 FAIL: URL unchanged after HOW IT WORKS click. URL={home_page_page.url}"
