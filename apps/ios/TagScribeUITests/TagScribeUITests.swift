import XCTest

/// UI tests that capture screenshots for App Store (and local use).
/// Screenshots are saved to a folder and attached to the test report so Xcode Cloud includes them.
final class TagScribeUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = true
        app = XCUIApplication()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Screenshot output

    /// Directory where PNGs are written. Local: ~/Desktop/TagScribeScreenshots. CI: NSTemporaryDirectory()/TagScribeScreenshots.
    static var screenshotOutputDirectory: URL {
        let isCI = ProcessInfo.processInfo.environment["CI"] == "1"
        if isCI {
            return FileManager.default.temporaryDirectory.appendingPathComponent("TagScribeScreenshots", isDirectory: true)
        }
        let desktop = FileManager.default.urls(for: .desktopDirectory, in: .userDomainMask).first!
        return desktop.appendingPathComponent("TagScribeScreenshots", isDirectory: true)
    }

    /// Saves the screenshot to the output directory and attaches it to the test (so Xcode Cloud artifacts include it).
    func saveScreenshot(_ screenshot: XCUIScreenshot, name: String) {
        let dir = Self.screenshotOutputDirectory
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let fileURL = dir.appendingPathComponent("\(name).png")
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
        do {
            try screenshot.pngRepresentation.write(to: fileURL)
            NSLog("[TagScribeUITests] Saved screenshot: %@", fileURL.path)
        } catch {
            NSLog("[TagScribeUITests] Failed to write screenshot to %@: %@", fileURL.path, String(describing: error))
        }
    }

    /// Captures the current screen and saves/attaches it.
    func captureScreen(name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        saveScreenshot(screenshot, name: name)
    }

    // MARK: - Tests (each captures one or more screenshots)

    func testCaptureSignInScreen() throws {
        app.launch()
        let signInButton = app.buttons["Sign in"]
        XCTAssertTrue(signInButton.waitForExistence(timeout: 8), "Sign in screen should appear")
        captureScreen(name: "01-SignIn")
    }

    func testCaptureSignUpScreen() throws {
        app.launch()
        let createAccount = app.buttons["Create an account"]
        XCTAssertTrue(createAccount.waitForExistence(timeout: 8), "Sign in screen should show Create account")
        createAccount.tap()
        let signUpButton = app.buttons["Sign up"]
        XCTAssertTrue(signUpButton.waitForExistence(timeout: 3), "Sign up screen should appear")
        captureScreen(name: "02-SignUp")
    }
}
