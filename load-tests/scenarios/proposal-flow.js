"use strict";

/**
 * Artillery Playwright scenario for frontend load testing.
 * Simulates a user browsing the admin proposals page and viewing
 * proposal details, measuring LCP and page load metrics.
 */

async function proposalFlowTest(page, userContext, events) {
  const target = userContext.vars.target || "http://localhost:8888";

  // Navigate to admin login page
  await page.goto(`${target}/admin`, { waitUntil: "networkidle" });

  // Navigate to proposals list
  await page.goto(`${target}/admin/proposals`, { waitUntil: "networkidle" });

  // Check if proposals list loaded
  const proposalList = await page.$("table, [data-testid='proposal-list'], .proposal-list, main");
  if (proposalList) {
    events.emit("counter", "proposals.viewed", 1);
  }

  // Measure Largest Contentful Paint (LCP)
  try {
    const lcp = await page.evaluate(() => {
      const entries = performance.getEntriesByType("largest-contentful-paint");
      if (entries.length > 0) {
        return entries[entries.length - 1].startTime;
      }
      return null;
    });

    if (lcp !== null) {
      events.emit("histogram", "proposals.lcp", lcp);
    }
  } catch (err) {
    // LCP measurement may not be available in all contexts
    console.warn("[proposal-flow] LCP measurement unavailable:", err.message);
  }

  // Try to navigate to a proposal detail page
  try {
    const proposalLink = await page.$("a[href*='/proposals/'], a[href*='proposal'], tr[data-id]");
    if (proposalLink) {
      await proposalLink.click();
      await page.waitForLoadState("networkidle");
      events.emit("counter", "proposal.detail.viewed", 1);

      // Measure detail page LCP
      const detailLcp = await page.evaluate(() => {
        const entries = performance.getEntriesByType("largest-contentful-paint");
        if (entries.length > 0) {
          return entries[entries.length - 1].startTime;
        }
        return null;
      });

      if (detailLcp !== null) {
        events.emit("histogram", "proposal.detail.lcp", detailLcp);
      }
    }
  } catch (err) {
    // Detail navigation is optional - proposals page may be empty
    console.warn("[proposal-flow] Could not navigate to proposal detail:", err.message);
  }
}

module.exports = {
  proposalFlowTest,
};
