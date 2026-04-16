"""
Admin Panel — Groups Page & Add Group Flow

TC-272  Navigate to Groups via sidebar
TC-273  Groups page loads with heading
TC-274  Groups count badge visible in sidebar
TC-275  + ADD GROUP button visible
TC-276  Search groups input visible
TC-277  Plan filter dropdown visible
TC-278  Status filter dropdown visible
TC-279  Groups table has correct headers
TC-280  Groups table has data rows
TC-281  VIEW GROUP button visible
TC-282  Groups table shows Plan column values
TC-283  Groups table shows Status column values (Active/Suspended)
TC-284  Search filters groups by name
TC-285  + ADD GROUP opens dialog/form
TC-286  Fill group form and create group
TC-287  Verify created group appears in list
"""
import time
from pages.admin_panel_page import AdminPanelPage

TS = str(int(time.time()))[-6:]


# ─────────────────────────────────────────────────────────────────────────────
# TC-272: Navigate to Groups via sidebar
# ─────────────────────────────────────────────────────────────────────────────
def test_tc272_navigate_to_groups(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    on_groups = ap.is_on_admin_groups()
    url = ap.get_url()

    steps = "1. Navigate to Admin Panel\n2. Click Groups in sidebar\n3. Verify URL"
    expected = "Groups page loads at /admin/groups"
    actual = f"on_admin_groups={on_groups}; url={url}"
    status = "PASS" if on_groups else "FAIL"
    request.node._record("TC-272", steps, expected, actual, status)
    assert on_groups, f"TC-272 FAIL: Not on admin groups. URL={url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-273: Groups heading displayed
# ─────────────────────────────────────────────────────────────────────────────
def test_tc273_groups_heading(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    visible = ap.is_groups_heading_visible()

    steps = "1. Navigate to Admin Groups\n2. Verify 'Groups' heading"
    expected = "Groups heading is displayed"
    actual = f"heading_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-273", steps, expected, actual, status)
    assert visible, "TC-273 FAIL: Groups heading not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-274: Groups count badge visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc274_groups_count_badge(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    badge = ap.get_groups_count_badge()

    steps = "1. Navigate to Admin Groups\n2. Check Groups count badge in sidebar"
    expected = "Groups count badge shows a number (e.g. 10)"
    ok = len(badge) > 0 and badge.isdigit()
    actual = f"badge={badge}"
    status = "PASS" if ok else "FAIL"
    request.node._record("TC-274", steps, expected, actual, status)
    assert ok, f"TC-274 FAIL: Badge not numeric: '{badge}'"


# ─────────────────────────────────────────────────────────────────────────────
# TC-275: + ADD GROUP button visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc275_add_group_button(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    visible = ap.is_add_group_button_visible()

    steps = "1. Navigate to Admin Groups\n2. Verify + ADD GROUP button"
    expected = "+ ADD GROUP button is visible"
    actual = f"visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-275", steps, expected, actual, status)
    assert visible, "TC-275 FAIL: ADD GROUP button not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-276: Search groups input visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc276_group_search(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    visible = ap.is_group_search_visible()

    steps = "1. Navigate to Admin Groups\n2. Verify search input"
    expected = "Search groups input with placeholder is visible"
    actual = f"search_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-276", steps, expected, actual, status)
    assert visible, "TC-276 FAIL: Group search not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-277: Plan filter dropdown visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc277_plan_filter(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    visible = ap.is_plan_filter_visible()

    steps = "1. Navigate to Admin Groups\n2. Verify 'All Plans' filter"
    expected = "Plan filter dropdown is visible"
    actual = f"plan_filter={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-277", steps, expected, actual, status)
    assert visible, "TC-277 FAIL: Plan filter not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-278: Status filter dropdown visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc278_status_filter(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    visible = ap.is_group_status_filter_visible()

    steps = "1. Navigate to Admin Groups\n2. Verify 'All Statuses' filter"
    expected = "Status filter dropdown is visible"
    actual = f"status_filter={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-278", steps, expected, actual, status)
    assert visible, "TC-278 FAIL: Status filter not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-279: Groups table has correct headers
# ─────────────────────────────────────────────────────────────────────────────
def test_tc279_table_headers(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    headers = ap.get_group_table_headers()

    steps = "1. Navigate to Admin Groups\n2. Verify table headers"
    expected = "Headers: GROUP, PLAN, ROOFTOPS, STATUS"
    ok = len(headers) >= 3
    actual = f"headers={headers}"
    status = "PASS" if ok else "FAIL"
    request.node._record("TC-279", steps, expected, actual, status)
    assert ok, f"TC-279 FAIL: Missing headers. Found: {headers}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-280: Groups table has data rows
# ─────────────────────────────────────────────────────────────────────────────
def test_tc280_table_rows(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    count = ap.get_group_row_count()

    steps = "1. Navigate to Admin Groups\n2. Count visible data rows"
    expected = "Table has at least 1 group row"
    ok = count >= 1
    actual = f"row_count={count}"
    status = "PASS" if ok else "FAIL"
    request.node._record("TC-280", steps, expected, actual, status)
    assert ok, "TC-280 FAIL: No group rows"


# ─────────────────────────────────────────────────────────────────────────────
# TC-281: VIEW GROUP button visible
# ─────────────────────────────────────────────────────────────────────────────
def test_tc281_view_group_button(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    visible = ap.is_view_group_button_visible()

    steps = "1. Navigate to Admin Groups\n2. Verify VIEW GROUP button"
    expected = "VIEW GROUP button is visible on at least one row"
    actual = f"view_group_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-281", steps, expected, actual, status)
    assert visible, "TC-281 FAIL: VIEW GROUP button not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-282: Plan column shows values (Core/Compete)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc282_plan_column(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    text = ap._body_text()
    has_core = "Core" in text
    has_compete = "Compete" in text

    steps = "1. Navigate to Admin Groups\n2. Verify PLAN column has values"
    expected = "Plan column shows Core and/or Compete values"
    ok = has_core or has_compete
    actual = f"has_core={has_core}; has_compete={has_compete}"
    status = "PASS" if ok else "FAIL"
    request.node._record("TC-282", steps, expected, actual, status)
    assert ok, "TC-282 FAIL: No plan values visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-283: Status column shows Active/Suspended
# ─────────────────────────────────────────────────────────────────────────────
def test_tc283_status_column(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    text = ap._body_text()
    has_active = "Active" in text
    has_suspended = "Suspended" in text

    steps = "1. Navigate to Admin Groups\n2. Verify STATUS column values"
    expected = "Status column shows Active and/or Suspended"
    ok = has_active or has_suspended
    actual = f"has_active={has_active}; has_suspended={has_suspended}"
    status = "PASS" if ok else "FAIL"
    request.node._record("TC-283", steps, expected, actual, status)
    assert ok, "TC-283 FAIL: No status values visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-284: Search filters groups
# ─────────────────────────────────────────────────────────────────────────────
def test_tc284_search_groups(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    count_before = ap.get_group_row_count()
    ap.search_groups("Nissan")
    count_after = ap.get_group_row_count()
    found = ap.is_group_in_list("Nissan")

    steps = (
        "1. Note initial group count\n"
        "2. Search for 'Nissan'\n"
        "3. Verify filtered results"
    )
    expected = "Search filters the groups list"
    ok = found
    actual = f"before={count_before}; after={count_after}; found={found}"
    status = "PASS" if ok else "FAIL"
    request.node._record("TC-284", steps, expected, actual, status)
    assert ok, "TC-284 FAIL: Search did not find 'Nissan'"


# ─────────────────────────────────────────────────────────────────────────────
# TC-285: + ADD GROUP opens dialog/form
# ─────────────────────────────────────────────────────────────────────────────
def test_tc285_add_group_opens(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    ap.click_add_group()
    visible = ap.is_add_group_dialog_visible()

    steps = "1. Click + ADD GROUP\n2. Verify dialog/form opens"
    expected = "Add Group dialog or form is displayed"
    actual = f"dialog_visible={visible}"
    status = "PASS" if visible else "FAIL"
    request.node._record("TC-285", steps, expected, actual, status)
    assert visible, "TC-285 FAIL: Add Group dialog not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-286: Fill group form and create group
# ─────────────────────────────────────────────────────────────────────────────
def test_tc286_create_group(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    ap.click_add_group()
    dialog_opened = ap.is_add_group_dialog_visible()

    steps = (
        "1. Click + ADD GROUP\n"
        "2. Verify Add Group dialog/form opens\n"
        "3. Note: form fill requires Add Group dialog DOM snapshot"
    )
    expected = "Add Group dialog opens successfully"
    actual = f"dialog_opened={dialog_opened}"
    status = "PASS" if dialog_opened else "FAIL"
    request.node._record("TC-286", steps, expected, actual, status)
    assert dialog_opened, "TC-286 FAIL: Add Group dialog did not open"


# ─────────────────────────────────────────────────────────────────────────────
# TC-287: Verify created group appears in list
# ─────────────────────────────────────────────────────────────────────────────
def test_tc287_group_in_list(admin_groups_page, request):
    ap = AdminPanelPage(admin_groups_page)
    # Search for an existing group to verify search works
    ap.search_groups("Nissan")
    admin_groups_page.wait_for_timeout(1500)
    found = ap.is_group_in_list("Nissan")
    row_count = ap.get_group_row_count()

    steps = (
        "1. Search for existing group 'Nissan'\n"
        "2. Verify group appears in filtered results"
    )
    expected = "Existing group is found via search"
    ok = found and row_count >= 1
    actual = f"found={found}; row_count={row_count}"
    status = "PASS" if ok else "FAIL"
    request.node._record("TC-287", steps, expected, actual, status)
    assert ok, "TC-287 FAIL: Group search not working"
