// Copy buttons for code blocks. Styling of the blocks themselves is pure CSS
// (main pre in main.css), so code stays framed with JS off — this file only
// wraps each block in a .codeblock (the button's anchor and horizontal
// scroll) and handles the click. Progressive enhancement, nothing is reached
// for when JS is missing.
(function () {
  "use strict";

  var COPIED_LABEL = "Copied";
  var COPIED_DURATION = 2000;

  function wrapBlocks() {
    var blocks = document.querySelectorAll("main pre");
    var button, label, wrapper;
    for (var i = 0; i < blocks.length; i++) {
      wrapper = document.createElement("div");
      wrapper.className = "codeblock";

      // The button is the full 44px touch target (accessibility floor);
      // .codecopy-label is the small visible pill inside it, so the control
      // reads as its intended size instead of a big box over the code.
      button = document.createElement("button");
      button.type = "button";
      button.className = "codecopy";
      button.setAttribute("aria-label", "Copy code");

      label = document.createElement("span");
      label.className = "codecopy-label";
      label.textContent = "Copy";
      button.appendChild(label);

      blocks[i].parentNode.insertBefore(wrapper, blocks[i]);
      wrapper.appendChild(button);
      wrapper.appendChild(blocks[i]);
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    var ok;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    textarea.remove();
    return ok ? Promise.resolve() : Promise.reject(new Error("copy failed"));
  }

  function flashLabel(button, ok) {
    var label = button.querySelector(".codecopy-label");
    label.textContent = ok ? COPIED_LABEL : "Copy failed";
    button.setAttribute("aria-label", ok ? "Code copied" : "Copy failed");
    if (button._resetTimer) {
      window.clearTimeout(button._resetTimer);
    }
    button._resetTimer = window.setTimeout(function () {
      label.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code");
      button._resetTimer = null;
    }, COPIED_DURATION);
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest(".codecopy");
    if (!button) return;

    var wrapper = button.closest(".codeblock");
    if (!wrapper) return;
    var pre = wrapper.querySelector("pre");
    if (!pre) return;

    copyText(pre.textContent).then(
      function () {
        flashLabel(button, true);
      },
      function () {
        flashLabel(button, false);
      },
    );
  });

  wrapBlocks();
})();
