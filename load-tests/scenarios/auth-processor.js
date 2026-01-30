"use strict";

/**
 * Artillery auth processor for API load tests.
 * Authenticates virtual users before each scenario by obtaining
 * an auth token via the magic link flow or direct cookie.
 */

const http = require("http");
const https = require("https");

/**
 * Called before each scenario to authenticate the virtual user.
 * Sets authToken in userContext.vars for use in scenario requests.
 */
async function beforeScenario(requestParams, context, ee, next) {
  const target = context.vars.target || "http://localhost:8888/.netlify/functions";

  try {
    // Attempt to authenticate by calling the auth endpoint
    // This assumes a test user exists and can be authenticated
    const authUrl = `${target}/auth-magic-link`;
    const response = await fetch(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@motionify.com",
      }),
    });

    if (response.ok) {
      const data = await response.json();

      // If the auth endpoint returns a token directly (dev mode)
      if (data.token) {
        context.vars.authToken = data.token;
      } else if (data.magicLink) {
        // Follow the magic link to get the cookie
        const verifyResponse = await fetch(data.magicLink, {
          redirect: "manual",
        });

        // Extract auth_token cookie from Set-Cookie header
        const setCookie = verifyResponse.headers.get("set-cookie") || "";
        const tokenMatch = setCookie.match(/auth_token=([^;]+)/);
        if (tokenMatch) {
          context.vars.authToken = tokenMatch[1];
        }
      }
    }

    // Fallback: If no token obtained, use a placeholder
    // This allows the test to run and measure error rates
    if (!context.vars.authToken) {
      console.warn(
        "[auth-processor] Could not obtain auth token. Requests will likely fail with 401."
      );
      context.vars.authToken = "load-test-no-auth";
    }
  } catch (err) {
    console.error("[auth-processor] Authentication error:", err.message);
    context.vars.authToken = "load-test-no-auth";
  }

  return next();
}

module.exports = {
  beforeScenario,
};
