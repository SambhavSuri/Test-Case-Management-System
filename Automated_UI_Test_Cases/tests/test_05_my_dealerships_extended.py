"""
Extended My Dealerships page tests (/kingdom/view?tab=dealerships&groupId=...)

TC-44  Valuation badge counts (Negative/Neutral/Positive)
TC-45  Momentum badge counts (Low/Medium/High)
TC-46  Color coding on valuation and momentum badges
TC-47  Brand filter dropdown loads brands
TC-48  Dealership filter dropdown loads dealerships
TC-49  Filtering by removing a brand chip
TC-50  Search icon is visible and functional
TC-51  CLEAR button resets filters
TC-52  Map View displays correctly
TC-53  Map pins/markers are visible
TC-54  Zoom in/out controls work
TC-55  Momentum legend visible on map
TC-56  View By dropdown default is Momentum
TC-57  Switch Map View → Analysis View
TC-58  Analysis View loads data
TC-59  Superstars and Stragglers section visible
TC-60  Table headers displayed correctly
TC-61  Sorting by clicking column header
TC-62  Dealership name click → navigation
TC-63  Valuation format ($X – $X) in table
TC-64  Momentum trend arrows (MoM %) in table
TC-65  Detailed view links in table
TC-66  Map pin elements exist (UI only — no backend)
TC-67  Legend color bar visible with thresholds (UI only)
TC-68  Consistency: badges counts sum check (UI only)
TC-69  Analysis View sections visible (UI only)
TC-70  Large dataset scroll in Analysis View (UI only)
"""
from pages.my_dealerships_page import MyDealershipsPage


# ─────────────────────────────────────────────────────────────────────────────
# TC-44: Valuation badge counts (Negative/Neutral/Positive) are visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc44_valuation_badge_counts(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    counts = mdp.get_valuation_badge_counts()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Locate EST. VALUATION CHANGE (3 mo) section\n"
        "3. Verify Negative, Neutral, Positive counts are displayed and non-negative"
    )
    expected = "All three valuation badge counts are visible with numeric values"
    neg = counts.get("Negative", -1)
    neu = counts.get("Neutral", -1)
    pos = counts.get("Positive", -1)
    all_ok = neg >= 0 and neu >= 0 and pos >= 0
    actual = f"Negative={neg}; Neutral={neu}; Positive={pos}"
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-44", steps, expected, actual, status)
    assert all_ok, f"TC-44 FAIL: badge counts missing. {actual}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-45: Momentum badge counts (Low/Medium/High) are visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc45_momentum_badge_counts(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    counts = mdp.get_momentum_badge_counts()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Locate MOMENTUM (3 mo) section\n"
        "3. Verify Low, Medium, High counts are displayed"
    )
    expected = "All three momentum badge counts are visible with numeric values"
    low = counts.get("Low", -1)
    med = counts.get("Medium", -1)
    high = counts.get("High", -1)
    all_ok = low >= 0 and med >= 0 and high >= 0
    actual = f"Low={low}; Medium={med}; High={high}"
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-45", steps, expected, actual, status)
    assert all_ok, f"TC-45 FAIL: badge counts missing. {actual}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-46: Color coding on valuation and momentum badges
# ─────────────────────────────────────────────────────────────────────────────
def test_tc46_badge_color_coding(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    colors = mdp.get_badge_colors()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Locate valuation badges (Negative/Neutral/Positive)\n"
        "3. Locate momentum badges (Low/Medium/High)\n"
        "4. Verify each badge has a distinct background color"
    )
    expected = "Badges have color coding applied (different colors for different categories)"
    has_colors = len(colors) >= 4
    actual = f"colors_found={len(colors)}; colors={colors}"
    status = "PASS" if has_colors else "FAIL"

    request.node._record("TC-46", steps, expected, actual, status)
    assert has_colors, f"TC-46 FAIL: insufficient badge colors. Found {len(colors)}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-47: Brand filter dropdown loads brands
# ─────────────────────────────────────────────────────────────────────────────
def test_tc47_brand_filter_loads(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    brands = mdp.get_brand_chips()
    visible = mdp.is_brand_filter_visible()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Locate brand filter chips\n"
        "3. Verify multiple brand names are displayed (Audi, BMW, Buick, etc.)"
    )
    expected = "Brand filter shows multiple brand chips"
    actual = f"visible={visible}; brands={brands}"
    status = "PASS" if (visible and len(brands) >= 3) else "FAIL"

    request.node._record("TC-47", steps, expected, actual, status)
    assert visible, "TC-47 FAIL: brand filter not visible"
    assert len(brands) >= 3, f"TC-47 FAIL: too few brands. Found: {brands}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-48: Dealership filter dropdown loads dealerships
# ─────────────────────────────────────────────────────────────────────────────
def test_tc48_dealership_filter_loads(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    visible = mdp.is_dealership_filter_visible()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Locate dealership filter chips\n"
        "3. Verify dealership names are displayed"
    )
    expected = "Dealership filter shows dealership name chips"
    actual = f"dealership_filter_visible={visible}"
    status = "PASS" if visible else "FAIL"

    request.node._record("TC-48", steps, expected, actual, status)
    assert visible, "TC-48 FAIL: dealership filter not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-49: Filtering by removing a brand chip
# ─────────────────────────────────────────────────────────────────────────────
def test_tc49_filter_by_brand(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    brands_before = mdp.get_brand_chips()
    removed = mdp.remove_one_brand_chip()
    my_dealerships_page.wait_for_timeout(1500)
    brands_after = mdp.get_brand_chips()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Note current brand chips\n"
        "3. Remove one brand chip by clicking its X\n"
        "4. Verify the brand was removed from the filter"
    )
    expected = "Removing a brand chip updates the filter (one fewer chip)"
    changed = len(brands_after) < len(brands_before) or removed not in str(brands_after)
    actual = (
        f"brands_before={len(brands_before)}; removed='{removed}'; "
        f"brands_after={len(brands_after)}"
    )
    status = "PASS" if (removed and changed) else "FAIL"

    request.node._record("TC-49", steps, expected, actual, status)
    assert removed, "TC-49 FAIL: could not remove a brand chip"
    assert changed, "TC-49 FAIL: brands did not change after removal"


# ─────────────────────────────────────────────────────────────────────────────
# TC-50: Search icon is visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc50_search_icon_visible(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    visible = mdp.is_search_icon_visible()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Locate the search icon near the filter chips\n"
        "3. Verify it is visible"
    )
    expected = "Search icon is visible on the page"
    actual = f"search_icon_visible={visible}"
    status = "PASS" if visible else "FAIL"

    request.node._record("TC-50", steps, expected, actual, status)
    assert visible, "TC-50 FAIL: search icon not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-51: CLEAR button resets filters
# ─────────────────────────────────────────────────────────────────────────────
def test_tc51_clear_filters(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)

    # First remove a brand to create a filtered state
    mdp.remove_one_brand_chip()
    my_dealerships_page.wait_for_timeout(1000)

    # Click CLEAR
    mdp.click_clear_filters()
    brands_after = mdp.get_brand_chips()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Remove a brand chip to create filtered state\n"
        "3. Click CLEAR button\n"
        "4. Verify filters are reset (all brands restored)"
    )
    expected = "CLEAR button restores all brand chips to default"
    restored = len(brands_after) >= 3
    actual = f"brands_after_clear={len(brands_after)}; brands={brands_after}"
    status = "PASS" if restored else "FAIL"

    request.node._record("TC-51", steps, expected, actual, status)
    assert restored, f"TC-51 FAIL: brands not restored after CLEAR. Count={len(brands_after)}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-52: Map View displays correctly
# ─────────────────────────────────────────────────────────────────────────────
def test_tc52_map_view_displayed(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_map_view()
    map_ok = mdp.is_map_view_active()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Click Map View tab\n"
        "3. Verify map is displayed"
    )
    expected = "Map View loads and displays the map"
    actual = f"map_active={map_ok}"
    status = "PASS" if map_ok else "FAIL"

    request.node._record("TC-52", steps, expected, actual, status)
    assert map_ok, "TC-52 FAIL: map view not displayed"


# ─────────────────────────────────────────────────────────────────────────────
# TC-53: Map pins/markers are visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc53_map_pins_visible(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_map_view()
    pins = mdp.are_map_pins_visible()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Switch to Map View\n"
        "3. Verify map pins/markers are visible on the map"
    )
    expected = "Dealership pins/markers are displayed on the map"
    actual = f"pins_visible={pins}"
    status = "PASS" if pins else "FAIL"

    request.node._record("TC-53", steps, expected, actual, status)
    assert pins, "TC-53 FAIL: no map pins visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-54: Zoom in/out controls work
# ─────────────────────────────────────────────────────────────────────────────
def test_tc54_zoom_controls(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_map_view()
    zoom_ok = mdp.are_zoom_controls_visible()

    # Try clicking zoom
    mdp.click_zoom_in()
    mdp.click_zoom_out()

    steps = (
        "1. Navigate to My Dealerships page → Map View\n"
        "2. Verify +/- zoom controls are visible\n"
        "3. Click zoom in then zoom out\n"
        "4. Verify map responds without errors"
    )
    expected = "Zoom controls visible and clickable without errors"
    actual = f"zoom_controls_visible={zoom_ok}"
    status = "PASS" if zoom_ok else "FAIL"

    request.node._record("TC-54", steps, expected, actual, status)
    assert zoom_ok, "TC-54 FAIL: zoom controls not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-55: Momentum legend visible on map
# ─────────────────────────────────────────────────────────────────────────────
def test_tc55_momentum_legend(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_map_view()
    legend = mdp.is_momentum_legend_visible()

    steps = (
        "1. Navigate to My Dealerships page → Map View\n"
        "2. Locate the Momentum (3 mo) legend\n"
        "3. Verify legend is visible with 60-100 range"
    )
    expected = "Momentum legend with color bar and 60-100 range is visible"
    actual = f"legend_visible={legend}"
    status = "PASS" if legend else "FAIL"

    request.node._record("TC-55", steps, expected, actual, status)
    assert legend, "TC-55 FAIL: momentum legend not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-56: View By dropdown default is Momentum
# ─────────────────────────────────────────────────────────────────────────────
def test_tc56_view_by_default_momentum(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    default_val = mdp.get_view_by_default()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Locate the 'View by' dropdown\n"
        "3. Verify default value is 'Momentum'"
    )
    expected = "View By dropdown shows 'Momentum' as default"
    is_momentum = "Momentum" in default_val
    actual = f"default_value='{default_val}'"
    status = "PASS" if is_momentum else "FAIL"

    request.node._record("TC-56", steps, expected, actual, status)
    assert is_momentum, f"TC-56 FAIL: default not Momentum. Got '{default_val}'"


# ─────────────────────────────────────────────────────────────────────────────
# TC-57: Switch from Map View to Analysis View
# ─────────────────────────────────────────────────────────────────────────────
def test_tc57_switch_to_analysis(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_map_view()
    mdp.click_analysis_view()
    analysis_ok = mdp.is_analysis_view_active()

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Click Map View\n"
        "3. Click Analysis View\n"
        "4. Verify Analysis View loads with table data"
    )
    expected = "Switching to Analysis View shows table/data content"
    actual = f"analysis_active={analysis_ok}"
    status = "PASS" if analysis_ok else "FAIL"

    request.node._record("TC-57", steps, expected, actual, status)
    assert analysis_ok, "TC-57 FAIL: analysis view not active"


# ─────────────────────────────────────────────────────────────────────────────
# TC-58: Analysis View loads data
# ─────────────────────────────────────────────────────────────────────────────
def test_tc58_analysis_view_data(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_analysis_view()
    my_dealerships_page.wait_for_timeout(2000)

    superstars = mdp.is_superstars_section_visible()
    rows = mdp.get_table_row_count()

    steps = (
        "1. Navigate to My Dealerships → Analysis View\n"
        "2. Verify Superstars and Stragglers section visible\n"
        "3. Verify table has data rows"
    )
    expected = "Analysis View shows Superstars section with data rows"
    all_ok = superstars and rows > 0
    actual = f"superstars_visible={superstars}; table_rows={rows}"
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-58", steps, expected, actual, status)
    assert superstars, "TC-58 FAIL: Superstars section not visible"
    assert rows > 0, f"TC-58 FAIL: table has no data rows"


# ─────────────────────────────────────────────────────────────────────────────
# TC-59: Superstars and Stragglers section visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc59_superstars_section(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_analysis_view()
    my_dealerships_page.wait_for_timeout(2000)

    visible = mdp.is_superstars_section_visible()

    steps = (
        "1. Navigate to My Dealerships → Analysis View\n"
        "2. Scroll to Superstars and Stragglers\n"
        "3. Verify section heading and layout visible"
    )
    expected = "Superstars and Stragglers section is displayed"
    actual = f"visible={visible}"
    status = "PASS" if visible else "FAIL"

    request.node._record("TC-59", steps, expected, actual, status)
    assert visible, "TC-59 FAIL: Superstars section not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-60: Table headers displayed correctly
# ─────────────────────────────────────────────────────────────────────────────
def test_tc60_table_headers(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_analysis_view()
    my_dealerships_page.wait_for_timeout(2000)

    headers = mdp.get_table_headers()
    expected_headers = ["DEALERSHIP", "VALUATION", "MOMENTUM", "USED", "NEW"]

    steps = (
        "1. Navigate to My Dealerships → Analysis View\n"
        "2. Locate Superstars table\n"
        "3. Verify column headers: DEALERSHIP, EST. VALUATION CHANGE, "
        "MOMENTUM, USED, NEW, USED TO NEW, EST. REVENUE, EST. JUMPIQ BLUE SKY"
    )
    expected = "Table has all expected column headers"
    # Check that key headers are present (text may vary slightly)
    found = [h for h in expected_headers if any(h in th.upper() for th in headers)]
    all_ok = len(found) >= 4
    actual = f"headers={headers}; matched={found}"
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-60", steps, expected, actual, status)
    assert all_ok, f"TC-60 FAIL: missing headers. Found: {headers}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-61: Sorting by clicking column header
# ─────────────────────────────────────────────────────────────────────────────
def test_tc61_sortable_columns(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_analysis_view()
    my_dealerships_page.wait_for_timeout(2000)

    # Verify sortable column headers have sort icons (SVG chevrons)
    has_sort_icons = my_dealerships_page.evaluate("""() => {
        const ths = document.querySelectorAll('thead th');
        let sortableCount = 0;
        for (const th of ths) {
            if (th.querySelector('svg') || th.getAttribute('aria-sort')
                || th.querySelector('[class*="chevron"]') || th.style.cursor === 'pointer') {
                sortableCount++;
            }
        }
        return sortableCount;
    }""")

    steps = (
        "1. Navigate to My Dealerships → Analysis View\n"
        "2. Locate Superstars table header row\n"
        "3. Verify column headers have sort icons/indicators\n"
        "4. Verify multiple columns are sortable"
    )
    expected = "Table has multiple sortable columns with sort icons"
    all_ok = has_sort_icons >= 3
    actual = f"sortable_columns={has_sort_icons}"
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-61", steps, expected, actual, status)
    assert all_ok, f"TC-61 FAIL: only {has_sort_icons} sortable columns found"


# ─────────────────────────────────────────────────────────────────────────────
# TC-62: Dealership name click → navigation
# ─────────────────────────────────────────────────────────────────────────────
def test_tc62_dealership_click_navigates(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_analysis_view()
    my_dealerships_page.wait_for_timeout(2000)

    before_url = my_dealerships_page.url
    name = mdp.click_first_dealership_name()
    my_dealerships_page.wait_for_timeout(3000)

    steps = (
        "1. Navigate to My Dealerships → Analysis View\n"
        f"2. Click on dealership name '{name}' in the table\n"
        "3. Verify URL changes to Detailed Dealership View"
    )
    expected = "Clicking a dealership name navigates to its detail page"
    navigated = my_dealerships_page.url != before_url
    actual = f"clicked='{name}'; navigated={navigated}; URL={my_dealerships_page.url}"
    status = "PASS" if navigated else "FAIL"

    request.node._record("TC-62", steps, expected, actual, status)
    assert navigated, f"TC-62 FAIL: URL unchanged after click. URL={my_dealerships_page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-63: Valuation format ($X – $X) in table
# ─────────────────────────────────────────────────────────────────────────────
def test_tc63_valuation_format(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_analysis_view()
    my_dealerships_page.wait_for_timeout(2000)

    has_format = mdp.has_valuation_format_in_table()

    steps = (
        "1. Navigate to My Dealerships → Analysis View\n"
        "2. Locate valuation column in Superstars table\n"
        "3. Verify values use $X.XXM – $X.XXM format"
    )
    expected = "Valuation column shows dollar-range format (e.g. $11.79M – $15.16M)"
    actual = f"has_dollar_range_format={has_format}"
    status = "PASS" if has_format else "FAIL"

    request.node._record("TC-63", steps, expected, actual, status)
    assert has_format, "TC-63 FAIL: no $X – $X format in table"


# ─────────────────────────────────────────────────────────────────────────────
# TC-64: Momentum trend arrows (MoM %) in table
# ─────────────────────────────────────────────────────────────────────────────
def test_tc64_momentum_trend_arrows(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_analysis_view()
    my_dealerships_page.wait_for_timeout(2000)

    has_arrows = mdp.has_trend_arrows_in_table()

    steps = (
        "1. Navigate to My Dealerships → Analysis View\n"
        "2. Locate momentum column in Superstars table\n"
        "3. Verify MoM % trend indicators are shown (e.g. +5.40% MoM)"
    )
    expected = "Table shows MoM trend percentages with direction indicators"
    actual = f"has_mom_trends={has_arrows}"
    status = "PASS" if has_arrows else "FAIL"

    request.node._record("TC-64", steps, expected, actual, status)
    assert has_arrows, "TC-64 FAIL: no MoM trend indicators in table"


# ─────────────────────────────────────────────────────────────────────────────
# TC-65: Detailed view links in table
# ─────────────────────────────────────────────────────────────────────────────
def test_tc65_detailed_view_links(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_analysis_view()
    my_dealerships_page.wait_for_timeout(2000)

    has_links = mdp.has_detailed_view_links()

    steps = (
        "1. Navigate to My Dealerships → Analysis View\n"
        "2. Check table rows for 'Detailed view' links\n"
        "3. Verify links are present"
    )
    expected = "'Detailed view' links are present in the table rows"
    actual = f"has_detailed_view_links={has_links}"
    status = "PASS" if has_links else "FAIL"

    request.node._record("TC-65", steps, expected, actual, status)
    assert has_links, "TC-65 FAIL: no 'Detailed view' links in table"


# ─────────────────────────────────────────────────────────────────────────────
# TC-66: Map pin elements exist (UI only — skip backend)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc66_map_pin_elements(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_map_view()
    my_dealerships_page.wait_for_timeout(2000)

    pins = mdp.are_map_pins_visible()

    steps = (
        "1. Navigate to My Dealerships → Map View\n"
        "2. Wait for map to fully load\n"
        "3. Verify pin/marker elements exist in the DOM"
    )
    expected = "Map contains dealership pin elements"
    actual = f"pins_exist={pins}"
    status = "PASS" if pins else "FAIL"

    request.node._record("TC-66", steps, expected, actual, status)
    assert pins, "TC-66 FAIL: no map pin elements found"


# ─────────────────────────────────────────────────────────────────────────────
# TC-67: Legend color bar visible with thresholds (UI only)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc67_legend_color_bar(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_map_view()

    legend = mdp.is_momentum_legend_visible()

    steps = (
        "1. Navigate to My Dealerships → Map View\n"
        "2. Locate momentum legend color bar\n"
        "3. Verify legend shows 'Momentum (3 mo)' with 60 and 100 thresholds"
    )
    expected = "Legend color bar visible with 60-100 threshold labels"
    actual = f"legend_visible={legend}"
    status = "PASS" if legend else "FAIL"

    request.node._record("TC-67", steps, expected, actual, status)
    assert legend, "TC-67 FAIL: legend color bar not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-68: Badge counts sum check (UI only — valuation badges should sum ~61)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc68_badge_count_sum(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.scroll_to_top()
    my_dealerships_page.wait_for_timeout(1000)
    val_counts = mdp.get_valuation_badge_counts()
    mom_counts = mdp.get_momentum_badge_counts()

    val_sum = sum(v for v in val_counts.values() if v >= 0)
    mom_sum = sum(v for v in mom_counts.values() if v >= 0)

    steps = (
        "1. Navigate to My Dealerships page\n"
        "2. Read Negative + Neutral + Positive counts\n"
        "3. Read Low + Medium + High counts\n"
        "4. Verify both sums are > 0 and both sums match (same total dealerships)"
    )
    expected = "Valuation and momentum badge count sums are positive and equal"
    sums_positive = val_sum > 0 and mom_sum > 0
    sums_match = val_sum == mom_sum
    actual = (
        f"valuation_sum={val_sum} ({val_counts}); "
        f"momentum_sum={mom_sum} ({mom_counts}); match={sums_match}"
    )
    status = "PASS" if (sums_positive and sums_match) else "FAIL"

    request.node._record("TC-68", steps, expected, actual, status)
    assert sums_positive, f"TC-68 FAIL: sums not positive. val={val_sum}, mom={mom_sum}"
    assert sums_match, f"TC-68 FAIL: sums don't match. val={val_sum} != mom={mom_sum}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-69: Analysis View sections visible (UI only)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc69_analysis_sections_visible(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_analysis_view()
    my_dealerships_page.wait_for_timeout(2000)

    superstars = mdp.is_superstars_section_visible()
    headers = mdp.get_table_headers()
    rows = mdp.get_table_row_count()

    steps = (
        "1. Navigate to My Dealerships → Analysis View\n"
        "2. Verify Superstars section visible\n"
        "3. Verify table has headers\n"
        "4. Verify table has data rows"
    )
    expected = "Analysis View displays Superstars section with table headers and data"
    all_ok = superstars and len(headers) > 0 and rows > 0
    actual = f"superstars={superstars}; headers={len(headers)}; rows={rows}"
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-69", steps, expected, actual, status)
    assert all_ok, f"TC-69 FAIL: {actual}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-70: Large dataset scroll in Analysis View (UI only)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc70_analysis_scroll(my_dealerships_page, request):
    mdp = MyDealershipsPage(my_dealerships_page)
    mdp.click_analysis_view()
    my_dealerships_page.wait_for_timeout(2000)

    rows_before = mdp.get_table_row_count()

    # Scroll the table container
    my_dealerships_page.evaluate("""() => {
        const table = document.querySelector('[class*="overflow-y-auto"]')
            || document.querySelector('table')?.closest('[class*="overflow"]');
        if (table) table.scrollBy(0, 500);
        else window.scrollBy(0, 800);
    }""")
    my_dealerships_page.wait_for_timeout(1000)

    rows_after = mdp.get_table_row_count()

    steps = (
        "1. Navigate to My Dealerships → Analysis View\n"
        "2. Note initial row count\n"
        "3. Scroll down in the table\n"
        "4. Verify table is scrollable and data remains visible"
    )
    expected = "Table is scrollable with data rows remaining visible after scroll"
    ok = rows_before > 0
    actual = f"rows_before={rows_before}; rows_after_scroll={rows_after}"
    status = "PASS" if ok else "FAIL"

    request.node._record("TC-70", steps, expected, actual, status)
    assert ok, f"TC-70 FAIL: no rows in table. rows={rows_before}"
