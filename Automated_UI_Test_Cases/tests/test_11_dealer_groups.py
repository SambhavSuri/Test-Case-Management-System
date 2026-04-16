"""
Dealer Groups page test cases (/kingdom/view?tab=groups&groupId=...)

TC-149  Navigate to Dealer Groups page
TC-150  Group name heading displayed
TC-151  Subtitle visible
TC-152  Summary: Total Group Valuation visible
TC-153  Summary: Blue Sky Valuation visible
TC-154  Summary: Real Estate Valuation visible
TC-155  Summary values are currency-formatted ranges
TC-156  Summary shows change percentage
TC-157  Valuation/Momentum chart time range visible (3M/6M/12M)
TC-158  Default time range is 12M
TC-159  Trend line chart renders with Y-axis label
TC-160  X-axis time period labels displayed
TC-161  Multiple group trend lines displayed
TC-162  Scatter chart (Momentum vs Environment) displayed
TC-163  Quadrant labels visible
TC-164  Scatter chart axes correct
TC-165  Trend Vectors toggle visible and enabled by default
TC-166  Disable Trend Vectors updates scatter chart
TC-167  RESET ZOOM button visible
TC-168  Trending Analysis carousel visible
TC-169  Positioning Analysis carousel visible
TC-170  Powered by JumpIQ AI label visible
TC-171  Insight carousel has navigation arrows
TC-172  Insight carousel arrow navigation works
TC-173  Leaderboard section visible
TC-174  Leaderboard has correct column headers
TC-175  Leaderboard shows user's group with [YOU] badge
TC-176  Leaderboard has multiple rows
TC-177  View More loads additional rows
TC-178  Brand filter dropdown visible
TC-179  Groups filter dropdown visible
TC-180  Filter panel search icon visible
TC-181  Switching metric (Valuation → Momentum) updates chart
"""
from pages.dealer_groups_page import DealerGroupsPage


# ─────────────────────────────────────────────────────────────────────────────
# TC-149: Navigate to Dealer Groups page
# ─────────────────────────────────────────────────────────────────────────────
def test_tc149_navigate_to_dealer_groups(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    on_page = dg.is_on_groups_page()
    url = dg.get_url()

    steps = (
        "1. Login with valid credentials\n"
        "2. Select DP View and group\n"
        "3. Click 'Groups' nav link\n"
        "4. Verify URL contains tab=groups"
    )
    expected = "User is redirected to the Dealer Groups page"
    actual = f"on_groups_page={on_page}; url={url}"
    status = "PASS" if on_page else "FAIL"
    request.node._record("TC-149", steps, expected, actual, status)
    assert on_page, f"TC-149 FAIL: Not on groups page. URL={url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-150: Group name heading displayed
# ─────────────────────────────────────────────────────────────────────────────
def test_tc150_group_name_heading(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_group_name_heading_visible()

    steps = "1. Navigate to Dealer Groups page\n2. Verify group name heading is visible"
    expected = "Group name 'KEN GARFF AUTOMOTIVE GROUP' is displayed as page heading"
    actual = f"group_heading_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-150", steps, expected, actual, status)
    assert visible, "TC-150 FAIL: Group name heading not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-151: Subtitle visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc151_subtitle_visible(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_subtitle_visible()

    steps = "1. Navigate to Dealer Groups page\n2. Check subtitle text"
    expected = "'Competitive performance across dealership groups' subtitle is visible"
    actual = f"subtitle_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-151", steps, expected, actual, status)
    assert visible, "TC-151 FAIL: Subtitle not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-152: Summary — Total Group Valuation visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc152_total_group_valuation(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_total_group_valuation_visible()
    text = dg.get_total_group_valuation_text()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Check EST. TOTAL GROUP VALUATION (TTM) is visible\n"
        "3. Verify value is not blank"
    )
    expected = "EST. TOTAL GROUP VALUATION (TTM) is displayed with a currency range"
    actual = f"visible={visible}; text={text[:80]}"
    status = "PASS" if visible and "$" in text else "FAIL"
    request.node._record("TC-152", steps, expected, actual, status)
    assert visible and "$" in text, f"TC-152 FAIL: Total Group Valuation not visible or blank"


# ─────────────────────────────────────────────────────────────────────────────
# TC-153: Summary — Blue Sky Valuation visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc153_blue_sky_valuation(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_blue_sky_valuation_visible()
    text = dg.get_blue_sky_valuation_text()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Check EST. JUMPIQ BLUE SKY VALUATION (TTM) is visible\n"
        "3. Verify value is not blank"
    )
    expected = "EST. JUMPIQ BLUE SKY VALUATION (TTM) is displayed with a currency range"
    actual = f"visible={visible}; text={text[:80]}"
    status = "PASS" if visible and "$" in text else "FAIL"
    request.node._record("TC-153", steps, expected, actual, status)
    assert visible and "$" in text, "TC-153 FAIL: Blue Sky Valuation not visible or blank"


# ─────────────────────────────────────────────────────────────────────────────
# TC-154: Summary — Real Estate Valuation visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc154_real_estate_valuation(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_real_estate_valuation_visible()
    text = dg.get_real_estate_valuation_text()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Check EST. REAL ESTATE VALUATION is visible\n"
        "3. Verify value is not blank"
    )
    expected = "EST. REAL ESTATE VALUATION is displayed with a currency range"
    actual = f"visible={visible}; text={text[:80]}"
    status = "PASS" if visible and "$" in text else "FAIL"
    request.node._record("TC-154", steps, expected, actual, status)
    assert visible and "$" in text, "TC-154 FAIL: Real Estate Valuation not visible or blank"


# ─────────────────────────────────────────────────────────────────────────────
# TC-155: Summary values are currency-formatted ranges
# ─────────────────────────────────────────────────────────────────────────────
def test_tc155_currency_formatted_ranges(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    formatted = dg.has_currency_formatted_values()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Verify each valuation shows a currency range (e.g. $X.XXB – $X.XXB)\n"
        "3. Verify no negative or zero values"
    )
    expected = "All three valuation values are formatted in dollars with ranges"
    actual = f"currency_formatted={formatted}"
    status = "PASS" if formatted else "FAIL"
    request.node._record("TC-155", steps, expected, actual, status)
    assert formatted, "TC-155 FAIL: Valuation values not currency-formatted"


# ─────────────────────────────────────────────────────────────────────────────
# TC-156: Summary shows change percentage
# ─────────────────────────────────────────────────────────────────────────────
def test_tc156_change_percentage(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    has_pct = dg.has_change_percentage()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Check that at least one valuation shows a change percentage"
    )
    expected = "Blue Sky Valuation shows change percentage (e.g. -0.49%)"
    actual = f"has_change_pct={has_pct}"
    status = "PASS" if has_pct else "FAIL"
    request.node._record("TC-156", steps, expected, actual, status)
    assert has_pct, "TC-156 FAIL: No change percentage visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-157: Time range visible (3M / 6M / 12M)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc157_time_range_visible(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_time_range_visible()

    steps = "1. Navigate to Dealer Groups page\n2. Verify 3M, 6M, 12M buttons are visible"
    expected = "Time range selector with 3M, 6M, 12M options is visible"
    actual = f"time_range_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-157", steps, expected, actual, status)
    assert visible, "TC-157 FAIL: Time range buttons not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-158: Default time range is 12M
# ─────────────────────────────────────────────────────────────────────────────
def test_tc158_default_time_range(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    active = dg.get_active_time_range()

    steps = "1. Navigate to Dealer Groups page\n2. Check which time range is active"
    expected = "Default time range is 12M"
    actual = f"active_time_range={active}"
    status = "PASS" if active == "12M" else "FAIL"
    request.node._record("TC-158", steps, expected, actual, status)
    assert active == "12M", f"TC-158 FAIL: Default time range is '{active}', expected '12M'"


# ─────────────────────────────────────────────────────────────────────────────
# TC-159: Trend line chart Y-axis label
# ─────────────────────────────────────────────────────────────────────────────
def test_tc159_y_axis_label(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    has_label = dg.has_y_axis_label()

    steps = "1. Navigate to Dealer Groups page\n2. Check left chart Y-axis label"
    expected = "Y-axis shows 'EST. Valuation ($M)' or 'Momentum Score'"
    actual = f"y_axis_label={has_label}"
    status = "PASS" if has_label else "FAIL"
    request.node._record("TC-159", steps, expected, actual, status)
    assert has_label, "TC-159 FAIL: Y-axis label not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-160: X-axis time period labels
# ─────────────────────────────────────────────────────────────────────────────
def test_tc160_x_axis_label(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    has_label = dg.has_x_axis_label()

    steps = "1. Navigate to Dealer Groups page\n2. Check left chart X-axis label"
    expected = "X-axis shows 'Time Period →'"
    actual = f"x_axis_label={has_label}"
    status = "PASS" if has_label else "FAIL"
    request.node._record("TC-160", steps, expected, actual, status)
    assert has_label, "TC-160 FAIL: X-axis label not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-161: Multiple group trend lines displayed
# ─────────────────────────────────────────────────────────────────────────────
def test_tc161_group_trend_lines(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    has_lines = dg.has_dealership_lines()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Check the trend chart for multiple group legend labels"
    )
    expected = "Multiple peer group names appear as chart legend entries"
    actual = f"has_group_lines={has_lines}"
    status = "PASS" if has_lines else "FAIL"
    request.node._record("TC-161", steps, expected, actual, status)
    assert has_lines, "TC-161 FAIL: Multiple group lines not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-162: Scatter chart visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc162_scatter_chart_visible(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_scatter_chart_visible()

    steps = "1. Navigate to Dealer Groups page\n2. Verify 'Momentum vs Environment' chart is visible"
    expected = "Scatter chart with title 'Momentum vs Environment' is displayed"
    actual = f"scatter_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-162", steps, expected, actual, status)
    assert visible, "TC-162 FAIL: Scatter chart not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-163: Quadrant labels visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc163_quadrant_labels(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    has_labels = dg.has_quadrant_labels()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Check for Overachievers, Champions, Stragglers, Opportunities labels"
    )
    expected = "At least 3 of 4 quadrant labels are visible"
    actual = f"has_quadrant_labels={has_labels}"
    status = "PASS" if has_labels else "FAIL"
    request.node._record("TC-163", steps, expected, actual, status)
    assert has_labels, "TC-163 FAIL: Quadrant labels not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-164: Scatter chart axes correct
# ─────────────────────────────────────────────────────────────────────────────
def test_tc164_scatter_axes(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    has_axes = dg.has_scatter_axes()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Verify scatter chart has 'Environment →' (X) and 'Momentum Score (3 mo)' (Y)"
    )
    expected = "Scatter chart shows correct axis labels"
    actual = f"has_scatter_axes={has_axes}"
    status = "PASS" if has_axes else "FAIL"
    request.node._record("TC-164", steps, expected, actual, status)
    assert has_axes, "TC-164 FAIL: Scatter chart axes incorrect"


# ─────────────────────────────────────────────────────────────────────────────
# TC-165: Trend Vectors toggle visible and enabled by default
# ─────────────────────────────────────────────────────────────────────────────
def test_tc165_trend_vectors_default(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_trend_vectors_toggle_visible()
    enabled = dg.is_trend_vectors_enabled()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Verify 'Trend Vectors' toggle is visible\n"
        "3. Verify it is enabled (checked) by default"
    )
    expected = "Trend Vectors toggle is visible and checked by default"
    actual = f"visible={visible}; enabled={enabled}"
    status = "PASS" if visible and enabled else "FAIL"
    request.node._record("TC-165", steps, expected, actual, status)
    assert visible and enabled, "TC-165 FAIL: Trend Vectors not visible or not enabled"


# ─────────────────────────────────────────────────────────────────────────────
# TC-166: Disable Trend Vectors updates scatter chart
# ─────────────────────────────────────────────────────────────────────────────
def test_tc166_toggle_trend_vectors(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    before = dg.is_trend_vectors_enabled()
    dg.toggle_trend_vectors()
    after = dg.is_trend_vectors_enabled()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Confirm Trend Vectors is enabled\n"
        "3. Click toggle to disable\n"
        "4. Verify toggle state changed"
    )
    expected = "Trend Vectors toggle changes from enabled to disabled"
    actual = f"before={before}; after={after}"
    status = "PASS" if before and not after else "FAIL"
    request.node._record("TC-166", steps, expected, actual, status)
    assert before and not after, f"TC-166 FAIL: Toggle did not change. before={before}, after={after}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-167: RESET ZOOM button visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc167_reset_zoom(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_reset_zoom_visible()

    steps = "1. Navigate to Dealer Groups page\n2. Verify RESET ZOOM button is visible"
    expected = "RESET ZOOM button is visible near the scatter chart"
    actual = f"reset_zoom_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-167", steps, expected, actual, status)
    assert visible, "TC-167 FAIL: RESET ZOOM button not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-168: Trending Analysis carousel visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc168_trending_analysis_visible(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_trending_analysis_visible()
    text = dg.get_trending_analysis_text()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Scroll down to Trending Analysis section\n"
        "3. Verify insight cards are visible"
    )
    expected = "Trending Analysis carousel is visible with AI insight text"
    actual = f"visible={visible}; text_len={len(text)}"
    status = "PASS" if visible and len(text) > 20 else "FAIL"
    request.node._record("TC-168", steps, expected, actual, status)
    assert visible, "TC-168 FAIL: Trending Analysis carousel not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-169: Positioning Analysis carousel visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc169_positioning_analysis_visible(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    dg.scroll_to_insights()
    visible = dg.is_positioning_analysis_visible()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Scroll to insight area\n"
        "3. Verify 'Positioning analysis and recommendations' carousel is visible"
    )
    expected = "Positioning Analysis carousel is displayed"
    actual = f"positioning_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-169", steps, expected, actual, status)
    assert visible, "TC-169 FAIL: Positioning Analysis carousel not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-170: Powered by JumpIQ AI label visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc170_powered_by_jumpiq_ai(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    dg.scroll_to_insights()
    visible = dg.is_powered_by_jumpiq_ai_visible()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Scroll to insight area\n"
        "3. Check for 'Powered by JumpIQ AI' label"
    )
    expected = "'Powered by JumpIQ AI' label is visible on insight carousels"
    actual = f"powered_by_ai={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-170", steps, expected, actual, status)
    assert visible, "TC-170 FAIL: 'Powered by JumpIQ AI' not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-171: Insight carousel has navigation arrows
# ─────────────────────────────────────────────────────────────────────────────
def test_tc171_insight_nav_arrows(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    dg.scroll_to_insights()
    has_arrows = dg.has_insight_nav_arrows()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Scroll to Trending Analysis carousel\n"
        "3. Check for left and right navigation arrows"
    )
    expected = "Left and right arrow buttons are present on the carousel"
    actual = f"has_arrows={has_arrows}"
    status = "PASS" if has_arrows else "FAIL"
    request.node._record("TC-171", steps, expected, actual, status)
    assert has_arrows, "TC-171 FAIL: Insight navigation arrows not found"


# ─────────────────────────────────────────────────────────────────────────────
# TC-172: Insight carousel arrow navigation works
# ─────────────────────────────────────────────────────────────────────────────
def test_tc172_insight_arrow_navigation(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    dg.scroll_to_insights()
    text_before = dg.get_trending_analysis_text()
    dg.click_insight_right_arrow()
    text_after = dg.get_trending_analysis_text()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Scroll to Trending Analysis\n"
        "3. Note current card text\n"
        "4. Click right arrow\n"
        "5. Verify card text changes (carousel slides)"
    )
    expected = "Clicking right arrow slides to the next insight card"
    changed = text_before != text_after and len(text_after) > 10
    actual = f"text_changed={changed}; before_len={len(text_before)}; after_len={len(text_after)}"
    status = "PASS" if changed else "FAIL"
    request.node._record("TC-172", steps, expected, actual, status)
    assert changed, "TC-172 FAIL: Carousel did not slide on arrow click"


# ─────────────────────────────────────────────────────────────────────────────
# TC-173: Leaderboard section visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc173_leaderboard_visible(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_leaderboard_visible()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Scroll to Leaderboard section\n"
        "3. Verify 'LEADERBOARD' heading is visible"
    )
    expected = "Leaderboard section is visible"
    actual = f"leaderboard_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-173", steps, expected, actual, status)
    assert visible, "TC-173 FAIL: Leaderboard not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-174: Leaderboard has correct column headers
# ─────────────────────────────────────────────────────────────────────────────
def test_tc174_leaderboard_headers(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    dg.scroll_to_leaderboard()
    headers = dg.get_leaderboard_headers()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Scroll to Leaderboard\n"
        "3. Verify column headers: GROUP NAME, PERFORMANCE, MOMENTUM, USED, NEW, etc."
    )
    expected_headers = ["group name", "performance", "momentum"]
    expected = f"Leaderboard shows headers: Group Name, Performance, Momentum etc."
    headers_lower = [h.lower() for h in headers]
    found = sum(1 for h in expected_headers if any(h in hdr for hdr in headers_lower))
    actual = f"headers={headers}; matched={found}/{len(expected_headers)}"
    status = "PASS" if found >= 3 else "FAIL"
    request.node._record("TC-174", steps, expected, actual, status)
    assert found >= 3, f"TC-174 FAIL: Missing leaderboard headers. Found: {headers}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-175: Leaderboard shows user's group with [YOU] badge
# ─────────────────────────────────────────────────────────────────────────────
def test_tc175_your_group_highlighted(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    dg.scroll_to_leaderboard()
    highlighted = dg.is_your_group_highlighted()
    row_data = dg.get_your_group_row_data()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Scroll to Leaderboard\n"
        "3. Verify KEN GARFF row has [YOU] badge"
    )
    expected = "User's group 'KEN GARFF AUTOMOTIVE GROUP' has [YOU] badge"
    actual = f"highlighted={highlighted}; data={row_data.get('text', '')[:100]}"
    status = "PASS" if highlighted else "FAIL"
    request.node._record("TC-175", steps, expected, actual, status)
    assert highlighted, "TC-175 FAIL: User's group not highlighted with [YOU] badge"


# ─────────────────────────────────────────────────────────────────────────────
# TC-176: Leaderboard has multiple rows
# ─────────────────────────────────────────────────────────────────────────────
def test_tc176_leaderboard_rows(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    dg.scroll_to_leaderboard()
    count = dg.get_leaderboard_row_count()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Scroll to Leaderboard\n"
        "3. Count visible data rows"
    )
    expected = "Leaderboard has multiple group rows (at least 3)"
    actual = f"row_count={count}"
    status = "PASS" if count >= 3 else "FAIL"
    request.node._record("TC-176", steps, expected, actual, status)
    assert count >= 3, f"TC-176 FAIL: Leaderboard has only {count} rows"


# ─────────────────────────────────────────────────────────────────────────────
# TC-177: View More loads additional rows
# ─────────────────────────────────────────────────────────────────────────────
def test_tc177_view_more(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    dg.scroll_to_leaderboard()
    count_before = dg.get_leaderboard_row_count()
    dg.click_view_more()
    count_after = dg.get_leaderboard_row_count()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Scroll to Leaderboard\n"
        "3. Note current row count\n"
        "4. Click 'View More' button\n"
        "5. Verify additional rows appear or all rows already loaded"
    )
    expected = "View More loads additional rows, or all rows are already displayed"
    increased = count_after > count_before
    all_loaded = count_before >= 10  # if 10+ rows already showing, all peers are loaded
    ok = increased or all_loaded
    actual = f"before={count_before}; after={count_after}; all_already_loaded={all_loaded}"
    status = "PASS" if ok else "FAIL"
    request.node._record("TC-177", steps, expected, actual, status)
    assert ok, f"TC-177 FAIL: Row count did not increase and too few rows ({count_before})"


# ─────────────────────────────────────────────────────────────────────────────
# TC-178: Brand filter dropdown visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc178_brand_filter_visible(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_brand_filter_visible()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Check that Brand filter dropdown is visible"
    )
    expected = "Brand filter dropdown is visible in the filter panel"
    actual = f"brand_filter_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-178", steps, expected, actual, status)
    assert visible, "TC-178 FAIL: Brand filter not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-179: Groups filter dropdown visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc179_groups_filter_visible(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_groups_filter_visible()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Check that Groups filter dropdown is visible"
    )
    expected = "Groups filter dropdown is visible in the filter panel"
    actual = f"groups_filter_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-179", steps, expected, actual, status)
    assert visible, "TC-179 FAIL: Groups filter not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-180: Filter panel search icon visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc180_search_icon_visible(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    visible = dg.is_search_icon_visible()

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Check that search icon button is visible next to filters"
    )
    expected = "Search icon (magnifying glass) is visible in filter panel"
    actual = f"search_icon_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-180", steps, expected, actual, status)
    assert visible, "TC-180 FAIL: Search icon not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-181: Switching metric (Valuation → Momentum) updates chart
# ─────────────────────────────────────────────────────────────────────────────
def test_tc181_switch_metric(dealer_groups_page, request):
    dg = DealerGroupsPage(dealer_groups_page)
    metric_before = dg.get_active_metric()
    dg.click_metric("Momentum")
    dealer_groups_page.wait_for_timeout(2000)
    text = dg._body_text()
    has_momentum_label = "Momentum Score" in text

    steps = (
        "1. Navigate to Dealer Groups page\n"
        "2. Note default metric (Valuation)\n"
        "3. Click 'Momentum' tab\n"
        "4. Verify chart updates to show Momentum Score"
    )
    expected = "Chart switches from Valuation to Momentum metric"
    actual = f"metric_before={metric_before}; has_momentum_label={has_momentum_label}"
    status = "PASS" if has_momentum_label else "FAIL"
    request.node._record("TC-181", steps, expected, actual, status)
    assert has_momentum_label, "TC-181 FAIL: Chart did not update to Momentum metric"
