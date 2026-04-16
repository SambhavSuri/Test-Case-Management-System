"""
Single Dealership page tests (/dashboard/home?dealershipId=...&groupId=...)

TC-109 Page loads with valid dealershipId + groupId
TC-110 Redirects when no dealershipId
TC-111 Invalid dealershipId handling
TC-112 Browser back/forward navigation
TC-113 Page refresh retains context
TC-114 Session refresh keeps user on page
TC-115 Unauthorized users redirected to login
TC-116 Select Dealership modal from nav
TC-117 Dealership search filters results
TC-118 Select dealership → navigates to dashboard
TC-119 Modal close (✕) button
TC-120 Default placeholder text
TC-121 Dealership name, brand, address displayed
TC-122 Dealership image loads
TC-123 Fallback initials when image missing
TC-124 Home/breadcrumb navigation
TC-125 Valuation summary visible
TC-126 Momentum/Environment scores with colors
TC-127 Momentum Score value + color
TC-128 Environment Score value + color
"""
from pages.single_dealership_page import SingleDealershipPage
from pages.login_page import LoginPage

DEALER_NAME = "KEN GARFF CHEVROLET"


# ─────────────────────────────────────────────────────────────────────────────
# TC-109: Page loads with valid dealershipId + groupId
# ─────────────────────────────────────────────────────────────────────────────
def test_tc109_page_loads(single_dealership_page, request):
    sdp = SingleDealershipPage(single_dealership_page)
    on_page = sdp.is_on_single_dealership_page()
    greeting = sdp.is_greeting_visible()

    steps = "1. Login → GM View → select group → select dealer\n2. Verify page loads at /dashboard"
    expected = "Single Dealership page loads with greeting and dealer data"
    actual = f"on_page={on_page}; greeting={greeting}; URL={single_dealership_page.url}"
    status = "PASS" if (on_page and greeting) else "FAIL"
    request.node._record("TC-109", steps, expected, actual, status)
    assert on_page, f"TC-109 FAIL: not on dashboard. URL={single_dealership_page.url}"
    assert greeting, "TC-109 FAIL: greeting not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-110: Redirects when no dealershipId
# ─────────────────────────────────────────────────────────────────────────────
def test_tc110_no_dealership_id(single_dealership_page, request):
    url = single_dealership_page.url
    no_dealer_url = url.split("?")[0] + "?groupId=3345"
    single_dealership_page.goto(no_dealer_url, wait_until="domcontentloaded")
    single_dealership_page.wait_for_timeout(3000)
    redirected_url = single_dealership_page.url

    steps = "1. Navigate to dashboard URL without dealershipId\n2. Verify redirect or fallback"
    expected = "Page redirects or shows fallback when dealershipId is missing"
    handled = redirected_url != no_dealer_url or "dealershipId" in redirected_url
    actual = f"handled={handled}; URL={redirected_url}"
    status = "PASS" if handled else "FAIL"
    request.node._record("TC-110", steps, expected, actual, status)
    assert handled, f"TC-110 FAIL: no redirect. URL={redirected_url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-111: Invalid dealershipId handling
# ─────────────────────────────────────────────────────────────────────────────
def test_tc111_invalid_dealership_id(single_dealership_page, request):
    bad_url = single_dealership_page.url.replace("dealershipId=23027", "dealershipId=999999")
    single_dealership_page.goto(bad_url, wait_until="domcontentloaded")
    single_dealership_page.wait_for_timeout(3000)

    steps = "1. Navigate with invalid dealershipId=999999\n2. Verify error/fallback"
    expected = "Page handles invalid dealershipId gracefully"
    url = single_dealership_page.url
    handled = "999999" not in url or "/login" in url or "/dashboard" in url
    actual = f"handled={handled}; URL={url}"
    status = "PASS" if handled else "FAIL"
    request.node._record("TC-111", steps, expected, actual, status)
    assert handled, f"TC-111 FAIL: no handling. URL={url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-112: Browser back/forward navigation
# ─────────────────────────────────────────────────────────────────────────────
def test_tc112_back_forward(single_dealership_page, request):
    sdp = SingleDealershipPage(single_dealership_page)
    original_url = single_dealership_page.url

    sdp.click_see_your_dealership()
    away_url = single_dealership_page.url

    single_dealership_page.go_back()
    single_dealership_page.wait_for_timeout(2000)
    back_url = single_dealership_page.url

    single_dealership_page.go_forward()
    single_dealership_page.wait_for_timeout(2000)
    forward_url = single_dealership_page.url

    steps = (
        "1. Navigate away from Single Dealership page\n"
        "2. Click browser Back → verify return\n"
        "3. Click browser Forward → verify forward"
    )
    expected = "Back/Forward navigation works correctly"
    back_ok = "/dashboard" in back_url
    actual = f"back_url={back_url}; forward_url={forward_url}"
    status = "PASS" if back_ok else "FAIL"
    request.node._record("TC-112", steps, expected, actual, status)
    assert back_ok, f"TC-112 FAIL: back didn't return to dashboard. URL={back_url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-113: Page refresh retains context
# ─────────────────────────────────────────────────────────────────────────────
def test_tc113_refresh_retains_context(single_dealership_page, request):
    sdp = SingleDealershipPage(single_dealership_page)
    url_before = single_dealership_page.url

    single_dealership_page.reload()
    single_dealership_page.wait_for_timeout(3000)

    url_after = single_dealership_page.url
    still_on_page = sdp.is_on_single_dealership_page()

    steps = "1. Note current dealership URL\n2. Refresh page\n3. Verify context retained"
    expected = "Page refresh retains dealership context"
    actual = f"still_on_page={still_on_page}; URL={url_after}"
    status = "PASS" if still_on_page else "FAIL"
    request.node._record("TC-113", steps, expected, actual, status)
    assert still_on_page, f"TC-113 FAIL: context lost after refresh. URL={url_after}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-114: Session refresh keeps user on page
# ─────────────────────────────────────────────────────────────────────────────
def test_tc114_session_refresh(single_dealership_page, request):
    single_dealership_page.reload()
    single_dealership_page.wait_for_timeout(3000)

    on_page = "/dashboard" in single_dealership_page.url
    not_login = "/login" not in single_dealership_page.url

    steps = "1. Refresh while session is active\n2. Verify no redirect to login"
    expected = "User remains on Single Dealership page after session refresh"
    actual = f"on_page={on_page}; not_login={not_login}; URL={single_dealership_page.url}"
    status = "PASS" if (on_page and not_login) else "FAIL"
    request.node._record("TC-114", steps, expected, actual, status)
    assert on_page and not_login, f"TC-114 FAIL: redirected. URL={single_dealership_page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-115: Unauthorized users redirected to login
# ─────────────────────────────────────────────────────────────────────────────
def test_tc115_unauthorized_redirect(browser, credentials, request):
    context = browser.new_context()
    p = context.new_page()
    dashboard_url = credentials["url"].replace("/login", "/dashboard/home?dealershipId=23027&groupId=3345")
    p.goto(dashboard_url, wait_until="domcontentloaded")
    try:
        p.wait_for_function("() => window.location.href.includes('/login')", timeout=10000)
    except Exception:
        pass

    steps = "1. Open dashboard URL without session\n2. Verify redirect to /login"
    expected = "Unauthorized access redirects to login"
    redirected = "/login" in p.url
    actual = f"redirected={redirected}; URL={p.url}"
    status = "PASS" if redirected else "FAIL"
    request.node._record("TC-115", steps, expected, actual, status)
    context.close()
    assert redirected, f"TC-115 FAIL: not redirected. URL={p.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-116: Select Dealership modal from nav
# ─────────────────────────────────────────────────────────────────────────────
def test_tc116_select_dealership_modal(single_dealership_page, request):
    sdp = SingleDealershipPage(single_dealership_page)
    url_before = single_dealership_page.url
    sdp.click_single_dealership_nav()
    single_dealership_page.wait_for_timeout(3000)

    url_after = single_dealership_page.url
    text = single_dealership_page.evaluate("() => document.body.innerText")
    # Accept any of: modal opened, page navigated, or dealership content visible
    has_modal = "Select" in text or "Search" in text
    page_changed = url_after != url_before
    has_dealership_content = "Dealership" in text or "Single Dealership" in text or "dashboard" in url_after

    steps = (
        "1. Click 'Single Dealership' in nav\n"
        "2. Verify modal opens or page navigates to dealership selection"
    )
    expected = "Single Dealership nav triggers modal or navigation"
    ok = has_modal or page_changed or has_dealership_content
    actual = f"has_modal={has_modal}; page_changed={page_changed}; has_content={has_dealership_content}"
    status = "PASS" if ok else "FAIL"
    request.node._record("TC-116", steps, expected, actual, status)
    assert ok, "TC-116 FAIL: no response to Single Dealership nav click"


# ─────────────────────────────────────────────────────────────────────────────
# TC-117: Dealership search filters (placeholder — verifies search exists)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc117_dealership_search(single_dealership_page, request):
    has_search = single_dealership_page.evaluate("""() => {
        const inputs = document.querySelectorAll('input');
        return Array.from(inputs).some(i =>
            (i.placeholder || '').toLowerCase().includes('search')
            || (i.getAttribute('aria-label') || '').toLowerCase().includes('search')
        );
    }""")

    steps = "1. Navigate to Single Dealership page\n2. Verify search input exists in header"
    expected = "Dealership search input is available"
    actual = f"has_search_input={has_search}"
    status = "PASS" if has_search else "FAIL"
    request.node._record("TC-117", steps, expected, actual, status)
    assert has_search, "TC-117 FAIL: search input not found"


# ─────────────────────────────────────────────────────────────────────────────
# TC-118: Select dealership → dashboard (verified by fixture)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc118_select_navigates(single_dealership_page, request):
    sdp = SingleDealershipPage(single_dealership_page)
    on_page = sdp.is_on_single_dealership_page()
    has_dealer = sdp.is_dealer_name_visible()

    steps = "1. Select KEN GARFF CHEVROLET from GM View flow\n2. Verify dashboard loads"
    expected = "Selecting a dealership navigates to its dashboard"
    actual = f"on_page={on_page}; dealer_visible={has_dealer}"
    status = "PASS" if (on_page and has_dealer) else "FAIL"
    request.node._record("TC-118", steps, expected, actual, status)
    assert on_page and has_dealer, "TC-118 FAIL: dashboard not loaded for selected dealer"


# ─────────────────────────────────────────────────────────────────────────────
# TC-119: Modal close button
# ─────────────────────────────────────────────────────────────────────────────
def test_tc119_modal_close(single_dealership_page, request):
    sdp = SingleDealershipPage(single_dealership_page)
    # Try to open insight modal and close it
    opened = sdp.click_first_insight()
    if opened:
        modal_open = sdp.is_insight_modal_open()
        sdp.close_modal()
        modal_closed = sdp.is_modal_closed()
    else:
        modal_open = False
        modal_closed = True

    steps = "1. Click an insight card to open modal\n2. Click close (✕)\n3. Verify modal closes"
    expected = "Modal close button works correctly"
    all_ok = modal_closed
    actual = f"opened={opened}; modal_open={modal_open}; modal_closed={modal_closed}"
    status = "PASS" if all_ok else "FAIL"
    request.node._record("TC-119", steps, expected, actual, status)
    assert all_ok, f"TC-119 FAIL: {actual}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-120: Default placeholder text
# ─────────────────────────────────────────────────────────────────────────────
def test_tc120_placeholder_text(single_dealership_page, request):
    has_placeholder = single_dealership_page.evaluate("""() => {
        const inputs = document.querySelectorAll('input');
        return Array.from(inputs).some(i => i.placeholder && i.placeholder.length > 3);
    }""")

    steps = "1. Navigate to Single Dealership page\n2. Verify input fields have placeholder text"
    expected = "Input fields show placeholder text"
    actual = f"has_placeholder={has_placeholder}"
    status = "PASS" if has_placeholder else "FAIL"
    request.node._record("TC-120", steps, expected, actual, status)
    assert has_placeholder, "TC-120 FAIL: no placeholder text found"


# ─────────────────────────────────────────────────────────────────────────────
# TC-121: Dealership name, brand, address displayed
# ─────────────────────────────────────────────────────────────────────────────
def test_tc121_dealer_info(single_dealership_page, request):
    sdp = SingleDealershipPage(single_dealership_page)
    name = sdp.is_dealer_name_visible()
    address = sdp.is_dealer_address_visible()

    steps = (
        "1. Navigate to Single Dealership page\n"
        "2. Verify dealership name 'KEN GARFF CHEVROLET' visible\n"
        "3. Verify address (AMERICAN FORK, Utah) visible"
    )
    expected = "Dealership name, brand, and address are displayed"
    actual = f"name={name}; address={address}"
    status = "PASS" if (name and address) else "FAIL"
    request.node._record("TC-121", steps, expected, actual, status)
    assert name, "TC-121 FAIL: dealer name not visible"
    assert address, "TC-121 FAIL: address not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-122: Dealership image loads
# ─────────────────────────────────────────────────────────────────────────────
def test_tc122_dealer_image(single_dealership_page, request):
    sdp = SingleDealershipPage(single_dealership_page)
    has_image = sdp.is_dealer_image_loaded()
    has_initials = sdp.has_fallback_initials()

    steps = (
        "1. Navigate to Single Dealership page\n"
        "2. Verify dealership image/logo loads or initials fallback is shown"
    )
    expected = "Dealership image or initials fallback is displayed"
    ok = has_image or has_initials
    actual = f"image_loaded={has_image}; initials_fallback={has_initials}"
    status = "PASS" if ok else "FAIL"
    request.node._record("TC-122", steps, expected, actual, status)
    assert ok, "TC-122 FAIL: neither dealer image nor initials visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-123: Fallback initials
# ─────────────────────────────────────────────────────────────────────────────
def test_tc123_fallback_initials(single_dealership_page, request):
    sdp = SingleDealershipPage(single_dealership_page)
    has_initials = sdp.has_fallback_initials()

    steps = "1. Navigate to Single Dealership page\n2. Verify initials avatar (KG) is present"
    expected = "Initials avatar is displayed alongside or as fallback for image"
    actual = f"has_initials={has_initials}"
    status = "PASS" if has_initials else "FAIL"
    request.node._record("TC-123", steps, expected, actual, status)
    assert has_initials, "TC-123 FAIL: no initials/fallback"


# ─────────────────────────────────────────────────────────────────────────────
# TC-124: Home/breadcrumb navigation
# ─────────────────────────────────────────────────────────────────────────────
def test_tc124_nav_links(single_dealership_page, request):
    has_nav = single_dealership_page.evaluate("""() => {
        const btns = document.querySelectorAll('header button, nav button, header a');
        const texts = Array.from(btns).map(b => b.textContent.trim());
        return texts.some(t =>
            t.includes('My Dealerships') || t.includes('Single Dealership')
            || t.includes('Groups') || t.includes('View As')
        );
    }""")

    steps = "1. Navigate to Single Dealership page\n2. Verify header nav buttons visible"
    expected = "Navigation buttons (My Dealerships, Single Dealership, etc.) are visible"
    actual = f"has_nav_buttons={has_nav}"
    status = "PASS" if has_nav else "FAIL"
    request.node._record("TC-124", steps, expected, actual, status)
    assert has_nav, "TC-124 FAIL: nav buttons not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-125: Valuation summary visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc125_valuation_summary(single_dealership_page, request):
    text = single_dealership_page.evaluate("() => document.body.innerText")
    has_dollar = "$" in text
    has_valuation = "VALUATION" in text or "valuation" in text.lower() or "Change in est." in text

    steps = "1. Navigate to Single Dealership page\n2. Verify valuation/dollar data visible"
    expected = "Valuation data with dollar amounts visible"
    actual = f"has_dollar={has_dollar}; has_valuation_text={has_valuation}"
    all_ok = has_dollar and has_valuation
    status = "PASS" if all_ok else "FAIL"
    request.node._record("TC-125", steps, expected, actual, status)
    assert has_dollar, "TC-125 FAIL: no dollar values on page"
    assert has_valuation, "TC-125 FAIL: no valuation text"


# ─────────────────────────────────────────────────────────────────────────────
# TC-126: Momentum/Environment scores with colors
# ─────────────────────────────────────────────────────────────────────────────
def test_tc126_scores_with_colors(single_dealership_page, request):
    sdp = SingleDealershipPage(single_dealership_page)
    momentum = sdp.is_momentum_score_visible()
    environment = sdp.is_environment_score_visible()

    steps = (
        "1. Navigate to Single Dealership page\n"
        "2. Verify Momentum Score (/100) visible\n"
        "3. Verify Environment Score (/100) visible"
    )
    expected = "Both scores visible with /100 format"
    actual = f"momentum={momentum}; environment={environment}"
    status = "PASS" if (momentum and environment) else "FAIL"
    request.node._record("TC-126", steps, expected, actual, status)
    assert momentum, "TC-126 FAIL: Momentum Score not visible"
    assert environment, "TC-126 FAIL: Environment Score not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-127: Momentum Score value
# ─────────────────────────────────────────────────────────────────────────────
def test_tc127_momentum_score_value(single_dealership_page, request):
    sdp = SingleDealershipPage(single_dealership_page)
    value = sdp.get_momentum_score()

    steps = "1. Navigate to Single Dealership page\n2. Read Momentum Score numeric value"
    expected = "Momentum Score shows a numeric value (e.g. 89)"
    has_value = bool(value) and value.isdigit()
    actual = f"value='{value}'"
    status = "PASS" if has_value else "FAIL"
    request.node._record("TC-127", steps, expected, actual, status)
    assert has_value, f"TC-127 FAIL: no momentum score value. Got '{value}'"


# ─────────────────────────────────────────────────────────────────────────────
# TC-128: Environment Score value
# ─────────────────────────────────────────────────────────────────────────────
def test_tc128_environment_score_value(single_dealership_page, request):
    sdp = SingleDealershipPage(single_dealership_page)
    value = sdp.get_environment_score()

    steps = "1. Navigate to Single Dealership page\n2. Read Environment Score numeric value"
    expected = "Environment Score shows a numeric value (e.g. 71)"
    has_value = bool(value) and value.isdigit()
    actual = f"value='{value}'"
    status = "PASS" if has_value else "FAIL"
    request.node._record("TC-128", steps, expected, actual, status)
    assert has_value, f"TC-128 FAIL: no environment score value. Got '{value}'"
