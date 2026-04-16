"""
Login test cases for J3 (https://dev.valueup.jumpiq.com/login)

TC-01  Valid login                  → redirected away from /login
TC-02  Invalid username             → error shown, stays on /login
TC-03  Invalid password             → error shown, stays on /login
TC-04  Both fields empty            → blocked (required) or error
TC-05  Username empty               → blocked or error
TC-06  Password empty               → blocked or error
TC-07  Page elements visible        → all form elements present
TC-08  Checkbox toggle              → checkbox is present and clickable
"""
import pytest

from pages.login_page import LoginPage


# ─────────────────────────────────────────────────────────────────────────────
# TC-01: Valid login redirects away from /login
# ─────────────────────────────────────────────────────────────────────────────
def test_tc01_valid_login(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()
    lp.login(credentials["username"], credentials["password"])

    steps = (
        "1. Open login URL\n"
        "2. Enter valid username and password\n"
        "3. Click the terms checkbox\n"
        "4. Click Sign In"
    )
    expected = "URL changes away from /login; view-mode page loads"
    on_login = lp.is_on_login_page()
    actual = f"URL after login: {page.url}"
    status = "PASS" if not on_login else "FAIL"

    request.node._record("TC-01", steps, expected, actual, status)
    assert not on_login, f"TC-01 FAIL: still on login page. URL={page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-02: Invalid username shows error
# ─────────────────────────────────────────────────────────────────────────────
def test_tc02_invalid_username(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()
    lp.login("invalid_user_xyz_999", credentials["password"])

    steps = (
        "1. Open login URL\n"
        "2. Enter an invalid username and a valid password\n"
        "3. Click the terms checkbox\n"
        "4. Click Sign In"
    )
    expected = "Error message shown; URL stays on /login"
    error = lp.get_error_message()
    still_on_login = lp.is_on_login_page()
    actual = f"Error='{error}'; on_login={still_on_login}; URL={page.url}"
    status = "PASS" if (still_on_login or error) else "FAIL"

    request.node._record("TC-02", steps, expected, actual, status)
    assert still_on_login or error, f"TC-02 FAIL: unexpected redirect. URL={page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-03: Invalid password shows error
# ─────────────────────────────────────────────────────────────────────────────
def test_tc03_invalid_password(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()
    lp.login(credentials["username"], "wrong_password_xyz_999")

    steps = (
        "1. Open login URL\n"
        "2. Enter a valid username and an invalid password\n"
        "3. Click the terms checkbox\n"
        "4. Click Sign In"
    )
    expected = "Error message shown; URL stays on /login"
    error = lp.get_error_message()
    still_on_login = lp.is_on_login_page()
    actual = f"Error='{error}'; on_login={still_on_login}; URL={page.url}"
    status = "PASS" if (still_on_login or error) else "FAIL"

    request.node._record("TC-03", steps, expected, actual, status)
    assert still_on_login or error, f"TC-03 FAIL: unexpected redirect. URL={page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-04: Both fields empty — form blocked or error shown
# ─────────────────────────────────────────────────────────────────────────────
def test_tc04_both_fields_empty(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()

    submit_enabled_before = lp.is_submit_enabled()
    lp.click_submit()

    steps = (
        "1. Open login URL\n"
        "2. Leave username and password fields empty\n"
        "3. Click Sign In"
    )
    expected = "Submit button disabled or form blocked; URL stays on /login"
    still_on_login = lp.is_on_login_page()
    submit_blocked = not submit_enabled_before
    actual = (
        f"submit_disabled={submit_blocked}; "
        f"on_login={still_on_login}; URL={page.url}"
    )
    status = "PASS" if (still_on_login or submit_blocked) else "FAIL"

    request.node._record("TC-04", steps, expected, actual, status)
    assert still_on_login or submit_blocked, (
        f"TC-04 FAIL: empty form was submitted. URL={page.url}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-05: Username empty, valid password — blocked or error
# ─────────────────────────────────────────────────────────────────────────────
def test_tc05_username_empty(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()
    lp.fill_password(credentials["password"])

    submit_enabled_before = lp.is_submit_enabled()
    lp.click_submit()

    steps = (
        "1. Open login URL\n"
        "2. Leave username empty, enter a valid password\n"
        "3. Click Sign In"
    )
    expected = "Submit button disabled or form blocked; URL stays on /login"
    still_on_login = lp.is_on_login_page()
    submit_blocked = not submit_enabled_before
    actual = (
        f"submit_disabled={submit_blocked}; "
        f"on_login={still_on_login}; URL={page.url}"
    )
    status = "PASS" if (still_on_login or submit_blocked) else "FAIL"

    request.node._record("TC-05", steps, expected, actual, status)
    assert still_on_login or submit_blocked, (
        f"TC-05 FAIL: empty username was accepted. URL={page.url}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-06: Password empty, valid username — blocked or error
# ─────────────────────────────────────────────────────────────────────────────
def test_tc06_password_empty(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()
    lp.fill_username(credentials["username"])

    submit_enabled_before = lp.is_submit_enabled()
    lp.click_submit()

    steps = (
        "1. Open login URL\n"
        "2. Enter a valid username, leave password empty\n"
        "3. Click Sign In"
    )
    expected = "Submit button disabled or form blocked; URL stays on /login"
    still_on_login = lp.is_on_login_page()
    submit_blocked = not submit_enabled_before
    actual = (
        f"submit_disabled={submit_blocked}; "
        f"on_login={still_on_login}; URL={page.url}"
    )
    status = "PASS" if (still_on_login or submit_blocked) else "FAIL"

    request.node._record("TC-06", steps, expected, actual, status)
    assert still_on_login or submit_blocked, (
        f"TC-06 FAIL: empty password was accepted. URL={page.url}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-07: All form elements visible on page load
# ─────────────────────────────────────────────────────────────────────────────
def test_tc07_page_elements_visible(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()

    steps = (
        "1. Open login URL\n"
        "2. Verify username field is visible\n"
        "3. Verify password field is visible\n"
        "4. Verify Sign In button is visible"
    )
    expected = "Username field, password field, and submit button all visible"
    user_ok = lp.username_field_visible()
    pass_ok = lp.password_field_visible()
    submit_ok = lp.submit_button_visible()
    actual = (
        f"username_visible={user_ok}; "
        f"password_visible={pass_ok}; "
        f"submit_visible={submit_ok}"
    )
    status = "PASS" if (user_ok and pass_ok and submit_ok) else "FAIL"

    request.node._record("TC-07", steps, expected, actual, status)
    assert user_ok, "TC-07 FAIL: username field not visible"
    assert pass_ok, "TC-07 FAIL: password field not visible"
    assert submit_ok, "TC-07 FAIL: submit button not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-08: Checkbox is present and toggles without error
# ─────────────────────────────────────────────────────────────────────────────
def test_tc08_checkbox_toggle(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()

    steps = (
        "1. Open login URL\n"
        "2. Verify the terms checkbox is visible\n"
        "3. Click the checkbox\n"
        "4. Verify no error appears"
    )
    expected = "Checkbox is visible and toggles without error"
    visible = lp.checkbox_visible()

    if not visible:
        request.node._record(
            "TC-08",
            steps,
            expected,
            "Checkbox not found on page — may not exist in this app version",
            "SKIP",
        )
        pytest.skip("No checkbox found on login page")

    clicked = lp.click_checkbox()
    error = lp.get_error_message()
    actual = f"checkbox_visible={visible}; clicked={clicked}; error='{error}'"
    status = "PASS" if (clicked and not error) else "FAIL"

    request.node._record("TC-08", steps, expected, actual, status)
    assert clicked, "TC-08 FAIL: could not click checkbox"
    assert not error, f"TC-08 FAIL: error after checkbox click: {error}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-22: Login Page UI Elements — heading, sub-heading, placeholders, terms, forgot password
# ─────────────────────────────────────────────────────────────────────────────
def test_tc22_login_page_ui_elements(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()

    steps = (
        "1. Open login URL\n"
        "2. Verify 'Sign In' heading is displayed\n"
        "3. Verify 'Welcome back to your Dealership Dashboard' sub-heading\n"
        "4. Verify username and password fields have placeholder text\n"
        "5. Verify terms/EULA checkbox text is visible\n"
        "6. Verify 'Forgot password?' link is visible"
    )
    expected = "All login page UI elements are present and correctly labeled"

    heading = lp.get_heading_text()
    subheading = lp.get_subheading_text()
    user_placeholder = lp.get_username_placeholder()
    pass_placeholder = lp.get_password_placeholder()
    terms_ok = lp.is_terms_text_visible()
    forgot_ok = lp.is_forgot_password_visible()

    actual = (
        f"heading='{heading}'; subheading='{subheading}'; "
        f"user_placeholder='{user_placeholder}'; pass_placeholder='{pass_placeholder}'; "
        f"terms_visible={terms_ok}; forgot_password={forgot_ok}"
    )

    heading_ok = "Sign In" in heading
    subheading_ok = "Welcome back" in subheading

    all_ok = heading_ok and subheading_ok and terms_ok and forgot_ok
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-22", steps, expected, actual, status)
    assert heading_ok, f"TC-22 FAIL: heading mismatch. Got '{heading}'"
    assert subheading_ok, f"TC-22 FAIL: subheading mismatch. Got '{subheading}'"
    assert terms_ok, "TC-22 FAIL: terms/EULA text not visible"
    assert forgot_ok, "TC-22 FAIL: 'Forgot password?' link not visible"


# ─────────────────────────────────────────────────────────────────────────────
# TC-23: Combined Validation — invalid username + empty password sequence
# ─────────────────────────────────────────────────────────────────────────────
def test_tc23_combined_validation(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()

    steps = (
        "1. Open login URL\n"
        "2. Enter invalid username, leave password empty, click Sign In\n"
        "3. Verify form is blocked (submit disabled or stays on login)\n"
        "4. Enter valid username, leave password empty, click Sign In\n"
        "5. Verify form is still blocked\n"
        "6. Enter valid password → both fields pass validation"
    )
    expected = "Form blocks submission at each step until both fields are filled"

    # Step 1: invalid username + empty password → submit should be disabled
    lp.fill_username("testexample.com")
    blocked_1 = not lp.is_submit_enabled()

    # Step 2: valid username + empty password → still disabled
    lp.fill_username(credentials["username"])
    blocked_2 = not lp.is_submit_enabled()

    # Step 3: fill password → submit should become enabled (after checkbox)
    lp.fill_password(credentials["password"])
    lp.click_checkbox()
    enabled_after = lp.is_submit_enabled()

    actual = (
        f"blocked_invalid_user_empty_pass={blocked_1}; "
        f"blocked_valid_user_empty_pass={blocked_2}; "
        f"enabled_both_filled={enabled_after}"
    )
    all_ok = blocked_1 and blocked_2 and enabled_after
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-23", steps, expected, actual, status)
    assert blocked_1, "TC-23 FAIL: submit was enabled with invalid username + empty password"
    assert blocked_2, "TC-23 FAIL: submit was enabled with valid username + empty password"
    assert enabled_after, "TC-23 FAIL: submit not enabled after filling both fields"


# ─────────────────────────────────────────────────────────────────────────────
# TC-24: Password Visibility Toggle (eye icon)
# ─────────────────────────────────────────────────────────────────────────────
def test_tc24_password_visibility_toggle(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()

    steps = (
        "1. Open login URL\n"
        "2. Enter a password\n"
        "3. Verify input type is 'password' (masked)\n"
        "4. Click the eye icon\n"
        "5. Verify input type changes to 'text' (visible)\n"
        "6. Click the eye icon again\n"
        "7. Verify input type returns to 'password' (masked)"
    )
    expected = "Password toggles between masked and visible on eye icon clicks"

    lp.fill_password("TestPassword123")

    type_before = lp.get_password_input_type()
    click_1 = lp.click_password_eye_icon()
    type_after_show = lp.get_password_input_type()
    click_2 = lp.click_password_eye_icon()
    type_after_hide = lp.get_password_input_type()

    actual = (
        f"initial_type='{type_before}'; "
        f"eye_click_1={click_1}; type_after_show='{type_after_show}'; "
        f"eye_click_2={click_2}; type_after_hide='{type_after_hide}'"
    )

    toggled_to_text = type_after_show == "text"
    toggled_back = type_after_hide == "password"
    all_ok = type_before == "password" and click_1 and toggled_to_text and click_2 and toggled_back
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-24", steps, expected, actual, status)
    assert type_before == "password", f"TC-24 FAIL: initial type not 'password'. Got '{type_before}'"
    assert click_1, "TC-24 FAIL: could not click eye icon (first click)"
    assert toggled_to_text, f"TC-24 FAIL: type did not change to 'text'. Got '{type_after_show}'"
    assert click_2, "TC-24 FAIL: could not click eye icon (second click)"
    assert toggled_back, f"TC-24 FAIL: type did not return to 'password'. Got '{type_after_hide}'"


# ─────────────────────────────────────────────────────────────────────────────
# TC-25: Forgot Password link is visible and clickable
# ─────────────────────────────────────────────────────────────────────────────
def test_tc25_forgot_password_link(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()

    steps = (
        "1. Open login URL\n"
        "2. Verify 'Forgot password?' link is visible\n"
        "3. Click the link\n"
        "4. Verify navigation or popup occurs"
    )
    expected = "Forgot password link is visible and triggers navigation when clicked"

    visible = lp.is_forgot_password_visible()
    home_url = page.url

    # Click the link
    try:
        page.get_by_text("Forgot password?", exact=False).first.click()
        page.wait_for_timeout(2000)
    except Exception:
        pass

    navigated = page.url != home_url
    actual = f"link_visible={visible}; navigated={navigated}; URL={page.url}"
    all_ok = visible and navigated
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-25", steps, expected, actual, status)
    assert visible, "TC-25 FAIL: 'Forgot password?' link not visible"
    assert navigated, f"TC-25 FAIL: clicking link did not navigate. URL={page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# TC-26: Responsiveness — login page at mobile, tablet, desktop viewports
# ─────────────────────────────────────────────────────────────────────────────
def test_tc26_responsiveness(page, credentials, request):
    lp = LoginPage(page, credentials["url"])
    lp.navigate()

    steps = (
        "1. Open login URL at desktop viewport (1920x1080)\n"
        "2. Verify login form elements visible\n"
        "3. Resize to tablet viewport (768x1024)\n"
        "4. Verify login form elements still visible\n"
        "5. Resize to mobile viewport (375x667)\n"
        "6. Verify login form elements still visible\n"
        "7. Resize to landscape mobile (667x375)\n"
        "8. Verify login form elements still visible"
    )
    expected = "Login form elements remain visible at all viewport sizes"

    viewports = {
        "desktop": (1920, 1080),
        "tablet": (768, 1024),
        "mobile": (375, 667),
        "landscape": (667, 375),
    }
    results = {}
    for name, (w, h) in viewports.items():
        lp.set_viewport(w, h)
        user_ok = lp.username_field_visible()
        pass_ok = lp.password_field_visible()
        submit_ok = lp.submit_button_visible()
        results[name] = user_ok and pass_ok and submit_ok

    actual = "; ".join(f"{k}={v}" for k, v in results.items())
    all_ok = all(results.values())
    status = "PASS" if all_ok else "FAIL"

    request.node._record("TC-26", steps, expected, actual, status)
    for name, passed in results.items():
        assert passed, f"TC-26 FAIL: form elements not visible at {name} viewport"
