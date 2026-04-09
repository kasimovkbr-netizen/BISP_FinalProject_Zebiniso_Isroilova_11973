/**
 * Unit tests verifying removed UI elements are absent from dashboard.js templates.
 * Feature: vaccination-tracker
 * Task 7.7
 *
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.1**
 */

const fs = require("fs");
const path = require("path");

const dashboardPath = path.resolve(
  __dirname,
  "../../../frontend/js/dashboard.js",
);
const dashboardSource = fs.readFileSync(dashboardPath, "utf8");

describe("Dashboard template cleanup", () => {
  /**
   * Requirement 1.1: home-stats div must be absent from home template.
   */
  test("home template does NOT contain home-stats div", () => {
    expect(dashboardSource).not.toMatch(/home-stats/);
  });

  /**
   * Requirement 1.2: home-recent div must be absent from home template.
   */
  test("home template does NOT contain home-recent div", () => {
    expect(dashboardSource).not.toMatch(/home-recent/);
  });

  /**
   * Requirement 2.1: my-supplements tab button must be absent from medicines template.
   * Requirement 2.2: my-supplements tab-content div must be absent from medicines template.
   */
  test("medicines template does NOT contain my-supplements tab or content", () => {
    expect(dashboardSource).not.toMatch(/data-tab="my-supplements"/);
  });

  /**
   * Requirement 3.1: chart-box div must be absent from checklist template.
   */
  test("checklist template does NOT contain chart-box div", () => {
    expect(dashboardSource).not.toMatch(/chart-box/);
  });
});
