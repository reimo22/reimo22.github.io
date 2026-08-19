// Command palette. Reads the site-command data island and builds a
// unified command list from nav + actions. Palette UI is added in a
// later task; this skeleton builds the list and exposes it for
// testing.
(function () {
  "use strict";

  var island = document.getElementById("site-commands");
  if (!island) return;

  var data;
  try {
    data = JSON.parse(island.textContent);
  } catch {
    return;
  }

  var commands = [];
  var i, item;

  var nav = data.nav || [];
  for (i = 0; i < nav.length; i++) {
    item = nav[i];
    commands.push({
      label: item.label,
      run: (function (url) {
        return function () {
          location.href = url;
        };
      })(item.url),
    });
  }

  var actions = data.actions || [];
  for (i = 0; i < actions.length; i++) {
    item = actions[i];
    if (item.action === "toggle-theme") {
      commands.push({
        label: item.label,
        run: function () {
          var btn = document.getElementById("theme-toggle");
          if (btn) btn.click();
        },
      });
    } else if (item.action === "copy-url") {
      commands.push({
        label: item.label,
        run: function () {
          navigator.clipboard.writeText(location.href).then(
            function () {},
            function () {},
          );
        },
      });
    } else if (item.url) {
      commands.push({
        label: item.label,
        run: (function (url, ext) {
          return function () {
            if (ext) window.open(url, "_blank", "noopener");
            else location.href = url;
          };
        })(item.url, !!item.external),
      });
    }
  }

  // Expose for testing; palette UI (Task 3) takes over.
  window.__palette = { commands: commands };
})();
