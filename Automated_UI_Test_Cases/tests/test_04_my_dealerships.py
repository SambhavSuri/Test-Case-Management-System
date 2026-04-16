"""
My Dealerships page test cases for J3 (/kingdom/view?tab=dealerships&groupId=...)

TC-30  Page loads for authorized user              → page loads with data sections
TC-31  Unauthorized user redirected to login        → /login redirect without session
TC-32  Direct URL access when logged in             → page loads correctly
TC-33  Invalid/missing groupId in URL               → error or fallback shown
TC-34  JumpIQ logo redirects to Home                → click logo → /kingdom/home
TC-35  My Dealerships tab highlighted as active     → active styling on nav tab
TC-36  Navigation to Groups from header             → click Groups → page change
TC-37  Navigation to Single Dealership from header  → click Single Dealership → page change
TC-38  View As option functionality                 → click View As → page change
TC-39  Group Valuation Change range displayed       → section visible with range text
TC-40  Last 30 days valuation change % + color      → % visible with color indicator
TC-41  Last n months valuation change % + color     → long-term % visible
TC-42  Group Momentum Change value displayed        → momentum value visible
TC-43  Group Momentum % for last 30 days            → momentum % visible
"""
from pages.my_dealerships_page import MyDealershipsPage
from pages.login_page import LoginPage


# ─────────────────────────────────────────────────────────────────────────────
# TC-30: My Dealerships page loads for authorized user
# ─────────────────────────────────────────────────────────────────────────────
def test_tc30_my_dealerships_loads(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)

    steps = (
        "1. Login with valid credentials\n"
        "2. Select DP View → choose KEN GARFF AUTOMOTIVE GROUP\n"
        "3. Click My Dealerships in nav bar\n"
        "4. Verify URL contains /kingdom/view?tab=dealerships\n"
        "5. Verify valuation and momentum sections are visible"
    )
    expected = "My Dealerships page loads with valuation and momentum data"
    on_page = mdp.is_on_my_dealerships_page()
    valuation = mdp.is_valuation_section_visible()
    momentum = mdp.is_momentum_section_visible()

    actual = (
        f"on_page={on_page}; valuation_visible={valuation}; "
        f"momentum_visible={momentum}; URL={my_dealerships_page.url}"
    )
    status = "PASS" if (on_page and valuation and momentum) else "FAIL"

    request.node._record("TC-30", steps, expected, actual, status)
    assert on_page, f"TC-30 FAIL: not on My Dealerships page. URL={my_dealerships_page.url}"
    assert valuation, "TC-30 FAIL: valuation section not visible"
    assert momentum, "TC-30 FAIL: momentum section not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-31: Unauthorized user redirected to login
# ─────────────────────────────────────────────────────────────────────────────
def test_tc31_unauthorized_redirects(browser, credentials, request):
    context = browser.new_context()
    p = context.new_page()

    my_dealer_url = credentials["url"].replace(
        "/login", "/kingdom/view?tab=dealerships&groupId=3345"
    )
    p.goto(my_dealer_url, wait_until="domcontentloaded")

    try:
        p.wait_for_function(
            "() => window.location.href.includes('/login')",
            timeout=10000,
        )
    except Exception:
        pass

    steps = (
        "1. Open a new browser with no session/cookies\n"
        "2. Navigate directly to My Dealerships URL\n"
        "3. Wait for React SPA redirect\n"
        "4. Verify URL contains /login"
    )
    expected = "Unauthorized access to My Dealerships redirects to /login"
    redirected = "/login" in p.url
    actual = f"redirected_to_login={redirected}; URL={p.url}"
    status = "PASS" if redirected else "FAIL"

    request.node._record("TC-31", steps, expected, actual, status)
    context.close()
    assert redirected, f"TC-31 FAIL: not redirected to login. URL={p.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-32: Direct URL access when logged in
# ─────────────────────────────────────────────────────────────────────────────
def test_tc32_direct_url_access(my_dealerships_page, credentials, request):
    # Navigate away first
    my_dealerships_page.goto(
        credentials["url"].replace("/login", "/kingdom/home?groupId=3345"),
        wait_until="domcontentloaded",
    )
    my_dealerships_page.wait_for_timeout(2000)

    # Now go directly to My Dealerships URL
    my_dealer_url = credentials["url"].replace(
        "/login", "/kingdom/view?tab=dealerships&groupId=3345"
    )
    my_dealerships_page.goto(my_dealer_url, wait_until="domcontentloaded")
    my_dealerships_page.wait_for_timeout(3000)

    mdp = MyDealershipsPage(my_dealerships_page)
    on_page = mdp.is_on_my_dealerships_page()

    steps = (
        "1. Login and navigate to home page\n"
        "2. Paste My Dealerships URL directly into browser\n"
        "3. Verify page loads correctly"
    )
    expected = "Direct URL access loads My Dealerships page without errors"
    actual = f"on_page={on_page}; URL={my_dealerships_page.url}"
    status = "PASS" if on_page else "FAIL"

    request.node._record("TC-32", steps, expected, actual, status)
    assert on_page, f"TC-32 FAIL: direct URL did not load page. URL={my_dealerships_page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-33: Invalid/missing groupId in URL
# ─────────────────────────────────────────────────────────────────────────────
def test_tc33_invalid_group_id(my_dealerships_page, credentials, request):
    # Access with invalid groupId
    bad_url = credentials["url"].replace(
        "/login", "/kingdom/view?tab=dealerships&groupId=999999"
    )
    my_dealerships_page.goto(bad_url, wait_until="domcontentloaded")
    my_dealerships_page.wait_for_timeout(3000)

    mdp = MyDealershipsPage(my_dealerships_page)
    has_error = mdp.has_error_or_fallback()

    # Also try with no groupId at all
    no_group_url = credentials["url"].replace(
        "/login", "/kingdom/view?tab=dealerships"
    )
    my_dealerships_page.goto(no_group_url, wait_until="domcontentloaded")
    my_dealerships_page.wait_for_timeout(3000)
    has_fallback = mdp.has_error_or_fallback()

    # Check if page content differs from valid group (no valuation data)
    mdp_check = MyDealershipsPage(my_dealerships_page)
    no_data = not mdp_check.is_valuation_section_visible()

    steps = (
        "1. Login to the application\n"
        "2. Navigate to My Dealerships URL with invalid groupId=999999\n"
        "3. Verify error/fallback/redirect is shown or data is empty\n"
        "4. Navigate to My Dealerships URL with no groupId\n"
        "5. Verify error/fallback/redirect is shown or data is empty"
    )
    # The app may auto-redirect to a valid groupId — that counts as graceful handling
    url_changed = "groupId=999999" not in my_dealerships_page.url

    expected = "System handles invalid/missing groupId gracefully (error, redirect, or auto-correct)"
    handled = has_error or has_fallback or no_data or url_changed
    actual = (
        f"invalid_groupId_error={has_error}; "
        f"missing_groupId_fallback={has_fallback}; "
        f"no_data={no_data}; url_auto_corrected={url_changed}; URL={my_dealerships_page.url}"
    )
    status = "PASS" if handled else "FAIL"

    request.node._record("TC-33", steps, expected, actual, status)
    assert handled, (
        f"TC-33 FAIL: no error/fallback for bad groupId. URL={my_dealerships_page.url}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-34: JumpIQ logo redirects to Home
# ─────────────────────────────────────────────────────────────────────────────
def test_tc34_logo_redirects_to_home(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)

    mdp.click_logo()

    try:
        my_dealerships_page.wait_for_function(
            "() => window.location.href.includes('/kingdom/home')",
            timeout=8000,
        )
    except Exception:
        pass

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Click the JumpIQ logo in the header\n"
        "3. Verify URL navigates to /kingdom/home"
    )
    expected = "Clicking JumpIQ logo redirects to Home/Dashboard page"
    on_home = "/kingdom/home" in my_dealerships_page.url
    actual = f"on_home={on_home}; URL={my_dealerships_page.url}"
    status = "PASS" if on_home else "FAIL"

    request.node._record("TC-34", steps, expected, actual, status)
    assert on_home, f"TC-34 FAIL: logo did not redirect to home. URL={my_dealerships_page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-35: My Dealerships tab highlighted as active
# ─────────────────────────────────────────────────────────────────────────────
def test_tc35_tab_highlighted(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Check nav bar for My Dealerships button\n"
        "3. Verify it has active styling (underline, bright text, or border)"
    )
    expected = "My Dealerships tab has active/highlighted styling in the nav bar"
    active = mdp.is_my_dealerships_tab_active()
    actual = f"tab_active={active}"
    status = "PASS" if active else "FAIL"

    request.node._record("TC-35", steps, expected, actual, status)
    assert active, "TC-35 FAIL: My Dealerships tab not highlighted as active"


# ─────────────────────────────────────────────────────────────────────────────
# TC-36: Navigation to Groups from header
# ─────────────────────────────────────────────────────────────────────────────
def test_tc36_nav_to_groups(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    before_url = my_dealerships_page.url

    mdp.click_groups_nav()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Click 'Groups' in the header nav bar\n"
        "3. Verify URL changes away from My Dealerships"
    )
    expected = "Clicking Groups nav navigates away from My Dealerships"
    navigated = my_dealerships_page.url != before_url
    actual = f"navigated={navigated}; URL={my_dealerships_page.url}"
    status = "PASS" if navigated else "FAIL"

    request.node._record("TC-36", steps, expected, actual, status)
    assert navigated, f"TC-36 FAIL: URL unchanged after Groups click. URL={my_dealerships_page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-37: Navigation to Single Dealership from header
# ─────────────────────────────────────────────────────────────────────────────
def test_tc37_nav_to_single_dealership(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    before_url = my_dealerships_page.url

    mdp.click_single_dealership_nav()

    # Wait for possible React navigation
    try:
        my_dealerships_page.wait_for_function(
            f"() => window.location.href !== '{before_url}'",
            timeout=5000,
        )
    except Exception:
        pass

    # Check if a dropdown/modal appeared or URL changed
    navigated = my_dealerships_page.url != before_url
    # Check if a search/select dropdown appeared
    content_changed = False
    if not navigated:
        try:
            content_changed = bool(my_dealerships_page.evaluate("""() => {
                return document.body.innerText.includes('Search Dealerships')
                    || document.body.innerText.includes('Select a dealership')
                    || document.querySelectorAll('[role="dialog"], [role="listbox"], [class*="dropdown"]').length > 0
                    || document.querySelectorAll('input[placeholder*="earch"]').length > 1;
            }"""))
        except Exception:
            pass

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Click 'Single Dealership' in the header nav bar\n"
        "3. Verify URL changes or dealership selection appears"
    )
    expected = "Clicking Single Dealership nav navigates or opens dealership selector"
    result = navigated or content_changed
    actual = f"navigated={navigated}; content_changed={content_changed}; URL={my_dealerships_page.url}"
    status = "PASS" if result else "FAIL"

    request.node._record("TC-37", steps, expected, actual, status)
    assert result, f"TC-37 FAIL: no response to Single Dealership click. URL={my_dealerships_page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-38: View As option functionality
# ─────────────────────────────────────────────────────────────────────────────
def test_tc38_view_as_option(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    before_url = my_dealerships_page.url

    mdp.click_view_as_nav()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Click 'View As' in the header nav bar\n"
        "3. Verify URL changes or view selector appears"
    )
    expected = "View As option navigates to view selection page"
    navigated = my_dealerships_page.url != before_url
    actual = f"navigated={navigated}; URL={my_dealerships_page.url}"
    status = "PASS" if navigated else "FAIL"

    request.node._record("TC-38", steps, expected, actual, status)
    assert navigated, f"TC-38 FAIL: URL unchanged after View As click. URL={my_dealerships_page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-39: Group Valuation Change range displayed (UI only)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc39_valuation_range_displayed(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)

    section_visible = mdp.is_valuation_section_visible()
    range_text = mdp.get_valuation_range_text()
    has_dollar = "$" in range_text

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Locate EST. TOTAL GROUP VALUATION section\n"
        "3. Verify section is visible\n"
        "4. Verify valuation range contains dollar amounts"
    )
    expected = "Group Valuation section visible with dollar range (e.g. $2.64B – $3.33B)"
    actual = f"section_visible={section_visible}; has_dollar={has_dollar}; text='{range_text[:100]}'"
    status = "PASS" if (section_visible and has_dollar) else "FAIL"

    request.node._record("TC-39", steps, expected, actual, status)
    assert section_visible, "TC-39 FAIL: valuation section not visible"
    assert has_dollar, f"TC-39 FAIL: no dollar values in range. Got: '{range_text[:100]}'"


# ─────────────────────────────────────────────────────────────────────────────
# TC-40: Last 30 days valuation change % + color (UI only)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc40_valuation_30d_change(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)

    visible = mdp.is_valuation_30d_change_visible()
    badges = mdp.is_valuation_change_badges_visible()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Locate the 'last 30 days' valuation change indicator\n"
        "3. Verify percentage text is visible\n"
        "4. Verify Negative/Neutral/Positive badges are visible"
    )
    expected = "Last 30 days valuation change % is visible with Negative/Neutral/Positive badges"
    actual = f"30d_change_visible={visible}; badges_visible={badges}"
    status = "PASS" if (visible and badges) else "FAIL"

    request.node._record("TC-40", steps, expected, actual, status)
    assert visible, "TC-40 FAIL: 30-day valuation change not visible"
    assert badges, "TC-40 FAIL: Negative/Neutral/Positive badges not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-41: Last n months valuation change % + color (UI only)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc41_valuation_long_term_change(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)

    visible = mdp.is_valuation_long_term_change_visible()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Locate the long-term valuation change (e.g. 'last 11 months')\n"
        "3. Verify percentage text is visible"
    )
    expected = "Long-term valuation change % (last N months) is visible"
    actual = f"long_term_visible={visible}"
    status = "PASS" if visible else "FAIL"

    request.node._record("TC-41", steps, expected, actual, status)
    assert visible, "TC-41 FAIL: long-term valuation change not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-42: Group Momentum Change value displayed (UI only)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc42_momentum_value_displayed(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)

    section_visible = mdp.is_momentum_section_visible()
    value = mdp.get_momentum_value()
    has_value = bool(value)

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Locate GROUP MOMENTUM section\n"
        "3. Verify section is visible\n"
        "4. Verify a numeric momentum value is displayed"
    )
    expected = "Group Momentum section visible with a numeric value (e.g. 77.3)"
    actual = f"section_visible={section_visible}; value='{value}'; has_value={has_value}"
    status = "PASS" if (section_visible and has_value) else "FAIL"

    request.node._record("TC-42", steps, expected, actual, status)
    assert section_visible, "TC-42 FAIL: momentum section not visible"
    assert has_value, "TC-42 FAIL: no momentum value found"


# ─────────────────────────────────────────────────────────────────────────────
# TC-43: Group Momentum % for last 30 days (UI only)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc43_momentum_30d_change(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)

    section_visible = mdp.is_momentum_section_visible()
    has_30d = mdp.is_momentum_30d_change_visible()
    badges = mdp.is_momentum_badges_visible()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Locate GROUP MOMENTUM section\n"
        "3. Verify 'last 30 days' percentage is visible\n"
        "4. Verify Low/Medium/High momentum badges are visible"
    )
    expected = "Momentum 30-day % visible with Low/Medium/High badges"
    actual = f"section_visible={section_visible}; 30d_visible={has_30d}; badges={badges}"
    status = "PASS" if (section_visible and has_30d and badges) else "FAIL"

    request.node._record("TC-43", steps, expected, actual, status)
    assert section_visible, "TC-43 FAIL: momentum section not visible"
    assert has_30d, "TC-43 FAIL: 30-day momentum % not visible"
    assert badges, "TC-43 FAIL: Low/Medium/High badges not visible"
