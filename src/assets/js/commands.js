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

  // --- Palette UI ---
  var palette = null;
  var lastFocused = null;
  var activeIndex = 0;
  var filtered = commands.slice();

  function buildPalette() {
    // Backdrop
    var backdrop = document.createElement("div");
    backdrop.className = "palette-backdrop";

    // Dialog
    var dialog = document.createElement("div");
    dialog.className = "palette";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Command palette");

    // Filter input (combobox)
    var input = document.createElement("input");
    input.type = "text";
    input.className = "palette-input";
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-controls", "palette-list");
    input.setAttribute("aria-label", "Filter commands");
    input.setAttribute("placeholder", "Type a command\u2026");

    // Listbox
    var list = document.createElement("div");
    list.className = "palette-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("id", "palette-list");
    list.setAttribute("aria-label", "Commands");

    dialog.appendChild(input);
    dialog.appendChild(list);

    // Click backdrop to close
    backdrop.addEventListener("click", close);

    return { backdrop: backdrop, dialog: dialog, input: input, list: list };
  }

  function renderList() {
    if (!palette) return;
    var list = palette.list;
    list.innerHTML = "";

    if (filtered.length === 0) {
      var empty = document.createElement("div");
      empty.className = "palette-option-empty";
      empty.textContent = "No commands";
      list.appendChild(empty);
      palette.input.removeAttribute("aria-activedescendant");
      return;
    }

    for (var i = 0; i < filtered.length; i++) {
      var opt = document.createElement("div");
      opt.className = "palette-option";
      opt.setAttribute("role", "option");
      opt.id = "palette-opt-" + i;
      opt.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
      opt.textContent = filtered[i].label;
      opt.dataset.index = i;
      opt.addEventListener("mousedown", function (e) {
        e.preventDefault();
        var idx = parseInt(this.dataset.index, 10);
        filtered[idx].run();
        close();
      });
      list.appendChild(opt);
    }

    palette.input.setAttribute("aria-activedescendant", "palette-opt-" + activeIndex);
    var activeEl = document.getElementById("palette-opt-" + activeIndex);
    if (activeEl && activeEl.scrollIntoView) activeEl.scrollIntoView({ block: "nearest" });
  }

  function open() {
    if (palette) return;
    lastFocused = document.activeElement;
    palette = buildPalette();
    filtered = commands.slice();
    activeIndex = 0;
    document.body.appendChild(palette.backdrop);
    document.body.appendChild(palette.dialog);
    renderList();
    palette.input.focus();
  }

  function close() {
    if (!palette) return;
    palette.backdrop.remove();
    palette.dialog.remove();
    palette = null;
    if (lastFocused && lastFocused.isConnected) {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  function moveActive(delta) {
    if (filtered.length === 0) return;
    activeIndex =
      (activeIndex + delta + filtered.length) % filtered.length;
    renderList();
  }

  function applyFilter() {
    if (!palette) return;
    var q = palette.input.value.toLowerCase();
    filtered = [];
    for (var i = 0; i < commands.length; i++) {
      if (commands[i].label.toLowerCase().indexOf(q) !== -1) {
        filtered.push(commands[i]);
      }
    }
    activeIndex = 0;
    renderList();
  }

  // Single document keydown handler
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toUpperCase();
    var isInput =
      tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;

    // Ctrl+K / Cmd+K — toggle palette (works from anywhere)
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      if (palette) close();
      else open();
      return;
    }

    // / — open palette (only when not in an input)
    if (e.key === "/" && !isInput && !palette) {
      e.preventDefault();
      open();
      return;
    }

    // If palette is not open, no more keys to handle
    if (!palette) return;

    // Esc — close
    if (e.key === "Escape") {
      close();
      return;
    }

    // Arrow keys — navigate
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      if (filtered.length > 0) {
        activeIndex = 0;
        renderList();
      }
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      if (filtered.length > 0) {
        activeIndex = filtered.length - 1;
        renderList();
      }
      return;
    }

    // Enter — run active command
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0 && filtered[activeIndex]) {
        filtered[activeIndex].run();
        close();
      }
      return;
    }
  });

  // Filter on input events (delegated on document)
  document.addEventListener("input", function (e) {
    if (palette && e.target === palette.input) {
      applyFilter();
    }
  });

  // Expose open/close for help overlay (Task 4)
  window.__palette = { commands: commands, open: open, close: close };
})();
