// "Days since I last played HTB" on the home page.
//
// The date comes from src/_data/htb.json, which the daily poll writes only when
// the profile XP changes — so the last XP movement is the last time I played.
// The server-rendered text is the plain date; this script replaces it with a
// live day count, which a static build can't keep accurate between deploys.
(function () {
  "use strict";

  var MS_PER_DAY = 24 * 60 * 60 * 1000;

  function daysSince(lastPlayed, now) {
    var then = Date.parse(
      typeof lastPlayed === "string" ? lastPlayed + "T00:00:00Z" : "",
    );
    if (isNaN(then)) return null;
    var utcNow = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    return Math.max(0, Math.round((utcNow - then) / MS_PER_DAY));
  }

  window.__htbIdle = { daysSince: daysSince };

  var el = document.getElementById("htb-idle");
  if (!el) return;

  var days = daysSince(el.getAttribute("data-last-played"), new Date());
  if (days === null) return;

  el.textContent =
    days === 0
      ? "Days since I last played HTB: 0"
      : "Days since I last played HTB: " + days;
})();
