(function () {
  "use strict";

  async function loadJson(url) {
    var response = await fetch(url);
    if (!response.ok) throw new Error("No se pudo cargar " + url);
    return response.json();
  }

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
      }
    });

    document.querySelectorAll("#interface-container span").forEach(function (span) {
      if (span.textContent.trim() === shortcutLabel) {
        var row = span.parentElement;
        if (row) {
          row.hidden = true;
          row.setAttribute("aria-hidden", "true");
        }
      }
    });
  }

  async function adaptSingleLanguageInterface() {
    var config = await loadJson("./assets/config.json");
    var languages = config.languages && config.languages.available;
    if (!Array.isArray(languages) || languages.length !== 1) return;

    var locale = languages[0];
    var translations = await loadJson(
      "./assets/interface_translations/" +
        encodeURIComponent(locale) +
        "/interface_translations.json"
    );
    var labels = {
      languageLabel: translations["language-label"] || "Idioma",
      shortcutLabel: translations["shortcut-language-label"] || "Abrir idioma",
    };
    var container = document.getElementById("interface-container");
    if (!container) return;

    var apply = function () {
      hideSingleLanguageControls(labels);
    };
    new MutationObserver(apply).observe(container, {
      childList: true,
      subtree: true,
    });
    apply();
  }

  adaptSingleLanguageInterface().catch(function (error) {
    console.warn("No se pudieron aplicar las adaptaciones del proyecto.", error);
  });
})();
