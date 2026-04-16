"""
Profile page test cases for J3 (/profile)

TC-27  Cancel button on Add User popup       → dialog closes, no user created
TC-28  User list in profile section           → User Management tab loads, group dropdown + user list visible
TC-29  View user details (eye icon)           → click eye icon on a user → details popup
"""
from pages.profile_page import ProfilePage


GROUP_NAME = "KEN GARFF AUTOMOTIVE GROUP"


# ─────────────────────────────────────────────────────────────────────────────
# TC-27: Cancel button on Add User popup closes the dialog
# ─────────────────────────────────────────────────────────────────────────────
def test_tc27_cancel_add_user_popup(profile_page_page, request):
    pp = ProfilePage(profile_page_page)

    pp.click_user_management_tab()
    um_visible = pp.is_user_management_heading_visible()

    pp.click_add_new_user()
    dialog_open = pp.is_add_user_dialog_visible()
    cancel_visible = pp.is_cancel_button_visible()

    pp.click_cancel_on_dialog()
    dialog_closed = pp.is_dialog_closed()

    steps = (
        "1. Login and navigate to Profile page\n"
        "2. Click User Management tab\n"
        "3. Click ADD NEW USER button\n"
        "4. Verify Add New User dialog opens\n"
        "5. Verify CANCEL button is visible\n"
        "6. Click CANCEL\n"
        "7. Verify dialog closes"
    )
    expected = "Add User dialog opens and closes cleanly when CANCEL is clicked"
    actual = (
        f"um_tab_visible={um_visible}; dialog_opened={dialog_open}; "
        f"cancel_visible={cancel_visible}; dialog_closed_after_cancel={dialog_closed}"
    )
    all_ok = um_visible and dialog_open and cancel_visible and dialog_closed
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-27", steps, expected, actual, status)
    assert um_visible, "TC-27 FAIL: User Management tab content not visible"
    assert dialog_open, "TC-27 FAIL: Add New User dialog did not open"
    assert cancel_visible, "TC-27 FAIL: CANCEL button not visible in dialog"
    assert dialog_closed, "TC-27 FAIL: dialog did not close after CANCEL click"


# ─────────────────────────────────────────────────────────────────────────────
# TC-28: User list in profile — User Management tab loads with group dropdown
# ─────────────────────────────────────────────────────────────────────────────
def test_tc28_user_list_in_profile(profile_page_page, request):
    pp = ProfilePage(profile_page_page)

    pp.click_user_management_tab()
    um_visible = pp.is_user_management_heading_visible()
    add_btn = pp.is_add_new_user_button_visible()
    group_dropdown = pp.is_select_group_dropdown_visible()
    user_list = pp.is_user_list_visible()

    steps = (
        "1. Login and navigate to Profile page\n"
        "2. Click User Management tab\n"
        "3. Verify User Management heading visible\n"
        "4. Verify ADD NEW USER button visible\n"
        "5. Verify 'Select a group' dropdown visible\n"
        "6. Verify User List section visible"
    )
    expected = "User Management tab shows heading, Add User button, group dropdown, and user list"
    actual = (
        f"um_heading={um_visible}; add_new_user_btn={add_btn}; "
        f"group_dropdown={group_dropdown}; user_list={user_list}"
    )
    all_ok = um_visible and add_btn and group_dropdown and user_list
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-28", steps, expected, actual, status)
    assert um_visible, "TC-28 FAIL: User Management heading not visible"
    assert add_btn, "TC-28 FAIL: ADD NEW USER button not visible"
    assert group_dropdown, "TC-28 FAIL: Select group dropdown not visible"
    assert user_list, "TC-28 FAIL: User List section not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-29: Profile tab shows account information
# ─────────────────────────────────────────────────────────────────────────────
def test_tc29_profile_account_info(profile_page_page, request):
    pp = ProfilePage(profile_page_page)

    pp.click_profile_tab()
    on_profile = pp.is_on_profile_page()
    tabs_visible = pp.is_profile_tab_visible() and pp.is_change_password_tab_visible() and pp.is_user_management_tab_visible()
    account_info = pp.is_account_info_visible()

    steps = (
        "1. Login and navigate to Profile page\n"
        "2. Click Profile tab\n"
        "3. Verify URL is /profile\n"
        "4. Verify Profile, Change Password, User Management tabs visible\n"
        "5. Verify Account Information section visible"
    )
    expected = "Profile page shows all tabs and Account Information section"
    actual = (
        f"on_profile={on_profile}; tabs_visible={tabs_visible}; "
        f"account_info={account_info}"
    )
    all_ok = on_profile and tabs_visible and account_info
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-29", steps, expected, actual, status)
    assert on_profile, f"TC-29 FAIL: not on /profile. URL={profile_page_page.url}"
    assert tabs_visible, "TC-29 FAIL: not all profile tabs visible"
    assert account_info, "TC-29 FAIL: Account Information section not visible"
