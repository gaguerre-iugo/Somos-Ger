(function () {
  "use strict";

  /* Verified against assets/config.json and the es-UY interface dictionary. */
  var singleLanguage = {
    languageLabel: "Idioma",
    shortcutLabel: "Abrir idioma",
  };

  function hideSingleLanguageControls(labels) {
    var languageLabel = labels.languageLabel;
    var shortcutLabel = labels.shortcutLabel;

    document.querySelectorAll("button").forEach(function (button) {
      if (
        button.getAttribute("aria-label") === languageLabel ||
        button.getAttribute("title") === languageLabel
      ) {
        button.hidden = true;
        button.setAttribute("aria-hidden", "true");
        button.style.setProperty("display", "none", "important");
      }
    });

    document.querySelectorAll("#interface-container span").forEach(function (span) {
      if (span.textContent.trim() === shortcutLabel) {
        var row = span.parentElement;
        if (row) {
          row.hidden = true;
          row.setAttribute("aria-hidden", "true");
          row.style.setProperty("display", "none", "important");
        }
      }
    });
  }

  function adaptSingleLanguageInterface() {
    var apply = function () {
      hideSingleLanguageControls(singleLanguage);
    };
    document.documentElement.setAttribute("data-project-adaptations", "somos-ger-4");
    new MutationObserver(apply).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    apply();
    window.setTimeout(apply, 500);
    window.setTimeout(apply, 1500);
  }

  adaptSingleLanguageInterface();
})();
