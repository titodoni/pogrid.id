// POgrid.id marketing site — lightweight attribution + UX helpers.
(function () {
  "use strict";

  // Keep footer year current.
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Persist the first-touch acquisition channel in localStorage so we can
  // carry it through to the app signup even if the visitor browses first.
  var ATTR_KEY = "pogrid_attrib";
  function readParams() {
    var p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source"),
      utm_medium: p.get("utm_medium"),
      utm_campaign: p.get("utm_campaign"),
      utm_content: p.get("utm_content"),
      ref: p.get("ref") || p.get("referral"),
    };
  }
  var incoming = readParams();
  var hasIncoming = Object.keys(incoming).some(function (k) { return incoming[k]; });
  if (hasIncoming) {
    try {
      var prev = JSON.parse(localStorage.getItem(ATTR_KEY) || "{}");
      // First-touch wins: only overwrite if we had nothing.
      if (!prev.utm_source && !prev.ref) {
        localStorage.setItem(ATTR_KEY, JSON.stringify(incoming));
      }
    } catch (e) { /* ignore */ }
  }

  // Rewrite every signup CTA to append the stored attribution, so the app
  // registration can record channel -> signup.
  function decorateLinks() {
    var stored;
    try { stored = JSON.parse(localStorage.getItem(ATTR_KEY) || "{}"); } catch (e) { stored = {}; }
    var keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"];
    var hasStored = keys.some(function (k) { return stored[k]; });
    if (!hasStored) return;

    var signupHref = "https://app.pogrid.id/register";
    var links = document.querySelectorAll('a[href*="app.pogrid.id/register"]');
    links.forEach(function (a) {
      var url = new URL(a.href, window.location.origin);
      if (url.href.indexOf(signupHref) !== 0) return;
      keys.forEach(function (k) {
        if (stored[k] && !url.searchParams.get(k)) {
          url.searchParams.set(k, stored[k]);
        }
      });
      a.href = url.pathname + "?" + url.searchParams.toString();
    });
  }
  decorateLinks();
})();
