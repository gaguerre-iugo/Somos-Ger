(function () {
  "use strict";

  var labels = {
    index: "Menú principal",
    previous: "Página anterior",
    next: "Página siguiente",
    glossary: "Glosario",
    settings: "Configuración",
    accessibility: "Menú de accesibilidad",
    languageShortcut: "Abrir idioma",
    audioPrevious: "Audio anterior",
    audioNext: "Audio siguiente",
    play: "Reproducir",
    pause: "Pausar",
    pauseNative: "Pausa",
    stop: "Detener",
  };
  var updateScheduled = false;
  var toolsReturnFocus = null;
  var glossaryReturnFocus = null;
  var pendingToolsFocusSelector = "";
  var pendingPanelFocusKind = "";
  var userStartedAudio = false;
  var automaticPausePending = false;
  var conditionalSettings = {
    autoplay: null,
    describeImages: null,
    highlight: null,
    pending: {},
  };

  function icon(paths) {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">' + paths + "</svg>";
  }

  var icons = {
    index: icon('<path d="M4 5h16M4 12h16M4 19h16"/><circle cx="2" cy="5" r=".7"/><circle cx="2" cy="12" r=".7"/><circle cx="2" cy="19" r=".7"/>'),
    previous: icon('<path d="m15 18-6-6 6-6"/>'),
    next: icon('<path d="m9 18 6-6-6-6"/>'),
    tools: icon('<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.04.08H10l-.04-.08a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1L3.92 14v-4L4 9.96a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.04-.08h3.92L14 4a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.4.32.75.6 1l.08.04v3.92L20 14a1.7 1.7 0 0 0-.6 1Z"/>'),
    close: icon('<path d="m6 6 12 12M18 6 6 18"/>'),
    glossary: icon('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z"/>'),
    audio: icon('<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>'),
    preferences: icon('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
    play: icon('<path d="m8 5 11 7-11 7Z"/>'),
    pause: icon('<path d="M8 5v14M16 5v14"/>'),
    stop: icon('<rect x="7" y="7" width="10" height="10" rx="1"/>'),
    audioPrevious: icon('<path d="M6 5v14M18 6l-9 6 9 6Z"/>'),
    audioNext: icon('<path d="M18 5v14M6 6l9 6-9 6Z"/>'),
    audioSettings: icon('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
  };
  var speedOptions = [
    { id: "slow", nativeLabel: "Lento", label: "Lenta", multiplier: "0,5 veces" },
    { id: "normal", nativeLabel: "Normal", label: "Normal", multiplier: "1 vez" },
    { id: "fast", nativeLabel: "Rápido", label: "Rápida", multiplier: "1,5 veces" },
    { id: "very-fast", nativeLabel: "Muy rápido", label: "Muy rápida", multiplier: "2 veces" },
  ];

  function navContainer() {
    return document.getElementById("nav-container");
  }

  function baseDock() {
    var root = navContainer();
    return root ? root.querySelector(':scope > [role="group"][aria-label="dock-label"]') : null;
  }

  function bridgeButton(predicate) {
    var dock = baseDock();
    if (!dock) return null;
    return Array.prototype.find.call(dock.querySelectorAll("button[data-dock-trigger]"), function (button) {
      return predicate(button.getAttribute("aria-label") || "");
    });
  }

  function exactBridge(label) {
    return bridgeButton(function (value) { return value === label; });
  }

  function setAttributeIfChanged(element, name, value) {
    if (element && element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  function concealBaseDock() {
    var dock = baseDock();
    if (!dock) return;
    setAttributeIfChanged(dock, "aria-hidden", "true");
    dock.querySelectorAll("button, [tabindex]").forEach(function (control) {
      if (control.tabIndex !== -1) control.tabIndex = -1;
    });
  }

  function exposeCustomControls() {
    var toolbar = document.getElementById("somos-primary-toolbar");
    if (toolbar) {
      toolbar.removeAttribute("aria-hidden");
      toolbar.removeAttribute("inert");
      toolbar.querySelectorAll("button").forEach(function (button) {
        button.removeAttribute("aria-hidden");
      });
    }
    var player = audioPlayer();
    if (player && !player.hidden) {
      player.removeAttribute("aria-hidden");
      player.removeAttribute("inert");
      player.querySelectorAll("button").forEach(function (button) {
        button.removeAttribute("aria-hidden");
      });
    }
  }

  function closePressedPanels(except) {
    document.querySelectorAll('button[aria-pressed="true"]').forEach(function (button) {
      var label = button.getAttribute("aria-label");
      var text = button.textContent.trim();
      var isPanel = label === labels.index || label === labels.glossary || label === labels.settings || label === labels.accessibility ||
        text === labels.glossary || text === labels.settings;
      if (isPanel && button !== except) button.click();
    });
  }

  function compactToolButton(text) {
    return Array.prototype.find.call(document.querySelectorAll("button"), function (button) {
      return !button.id.startsWith("somos-") && button.textContent.trim() === text;
    });
  }

  function resolveCompactTool(text, accessibility, onOpened, attempt) {
    var button = compactToolButton(text);
    if (button) {
      button.click();
      scheduleUpdate();
      if (onOpened) onOpened(button);
      return;
    }
    if (attempt < 180) {
      window.requestAnimationFrame(function () {
        resolveCompactTool(text, accessibility, onOpened, attempt + 1);
      });
      return;
    }
    if (accessibility && accessibility.getAttribute("aria-pressed") === "true") accessibility.click();
    scheduleUpdate();
  }

  function openRuntimeFeature(label, compactText, onOpened) {
    closeTools(false);
    var direct = exactBridge(label);
    if (direct) {
      closePressedPanels(direct);
      direct.click();
      scheduleUpdate();
      if (onOpened) onOpened(direct);
      return;
    }

    closePressedPanels(null);
    var accessibility = exactBridge(labels.accessibility);
    if (!accessibility) return;
    accessibility.click();
    resolveCompactTool(compactText, accessibility, onOpened, 0);
  }

  function ttsSwitch() {
    return Array.prototype.find.call(document.querySelectorAll('#interface-container [role="switch"]'), function (control) {
      var label = document.getElementById(control.getAttribute("aria-labelledby"));
      return label && /^(Texto a voz|Activar lectura en voz alta)$/i.test(label.textContent.trim());
    });
  }

  function ttsPlayer() {
    return Array.prototype.find.call(document.querySelectorAll('#interface-container [role="group"]'), function (group) {
      return group.getAttribute("aria-label") === "Controles de lectura en voz alta";
    });
  }

  function nativeAudioButton(predicate) {
    var player = ttsPlayer();
    if (!player) return null;
    return Array.prototype.find.call(player.querySelectorAll("button"), function (button) {
      return predicate(button.getAttribute("aria-label") || "");
    });
  }

  function concealNativeTtsPlayer() {
    var player = ttsPlayer();
    if (!player) return;
    var wrapper = player.parentElement;
    if (wrapper) {
      wrapper.classList.add("somos-native-audio-bridge");
      setAttributeIfChanged(wrapper, "aria-hidden", "true");
    }
    player.querySelectorAll("button, input, [tabindex]").forEach(function (control) {
      if (control.tabIndex !== -1) control.tabIndex = -1;
    });
  }

  function ttsBridge() {
    return bridgeButton(function (value) {
      return value === "Activar texto a voz" || value === "Desactivar texto a voz";
    });
  }

  function toolsPanel() { return document.querySelector("#interface-container .somos-native-settings-panel"); }
  function toolsButton() { return document.getElementById("somos-tools"); }
  function audioPlayer() { return document.getElementById("somos-tts-player"); }

  function normalizedText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function settingsSection(panel, pattern) {
    return Array.prototype.find.call(panel.querySelectorAll("section"), function (section) {
      var heading = section.querySelector("h3");
      return heading && pattern.test(normalizedText(heading.textContent));
    });
  }

  function focusNativeMenuEntry(panel, kind, attempt) {
    if ((!panel || !panel.isConnected) && attempt < 45) {
      window.requestAnimationFrame(function () { focusNativeMenuEntry(panel, kind, attempt + 1); });
      return;
    }
    if (!panel || pendingPanelFocusKind !== kind) return;
    if (kind === "settings" && !panel.querySelector("#somos-reference-tools")) return;
    var target = kind === "settings" && pendingToolsFocusSelector
      ? panel.querySelector(pendingToolsFocusSelector)
      : panel.querySelector(kind === "glossary" ? ".somos-panel-back" : ".somos-panel-close");
    if (!target && attempt < 45) {
      window.requestAnimationFrame(function () { focusNativeMenuEntry(panel, kind, attempt + 1); });
      return;
    }
    if (!target) return;
    pendingPanelFocusKind = "";
    pendingToolsFocusSelector = "";
    if (panel.dataset.somosEntryInteractionGuard !== "true") {
      panel.dataset.somosEntryInteractionGuard = "true";
      var markPanelInteraction = function () { panel.dataset.somosUserInteracted = "true"; };
      panel.addEventListener("pointerdown", markPanelInteraction, { once: true, capture: true });
      panel.addEventListener("keydown", markPanelInteraction, { once: true, capture: true });
    }
    [0, 80, 240, 500, 900].forEach(function (delay) {
      window.setTimeout(function () {
        if (!panel.isConnected || !panel.getClientRects().length || !target.isConnected || panel.dataset.somosUserInteracted === "true") return;
        target.focus({ preventScroll: true });
      }, delay);
    });
  }

  function focusToolsTarget(attempt) {
    var panel = Array.prototype.find.call(document.querySelectorAll("#interface-container .somos-native-settings-panel"), function (candidate) {
      return candidate.querySelector("#somos-reference-tools");
    });
    if (!panel && attempt < 45) {
      window.requestAnimationFrame(function () { focusToolsTarget(attempt + 1); });
      return;
    }
    focusNativeMenuEntry(panel, "settings", attempt);
  }

  function openIndexWhenPanelsClose(attempt) {
    if (document.querySelector(".somos-native-settings-panel, .somos-native-glossary-panel") && attempt < 45) {
      window.requestAnimationFrame(function () { openIndexWhenPanelsClose(attempt + 1); });
      return;
    }
    var button = exactBridge(labels.index);
    closePressedPanels(button);
    if (button && button.getAttribute("aria-pressed") !== "true") {
      pendingPanelFocusKind = "index";
      button.click();
    }
    scheduleUpdate();
  }

  function nativeMenuKind(panel) {
    if (!panel || panel.classList.contains("somos-native-audio-bridge")) return null;
    var text = panel.textContent.replace(/\s+/g, " ").trim();
    if (panel.querySelector('[role="tablist"]') && text.indexOf("Lista de páginas") !== -1) return "index";
    if (panel.querySelector('input[placeholder="Buscar"], input[type="search"]') && text.indexOf("Glosario") !== -1) return "glossary";
    if (panel.querySelector('[role="switch"]') || text.indexOf("Configuración") !== -1) return "settings";
    return null;
  }

  function closeNativeMenu(panel, kind) {
    var returnFocus = kind === "settings"
      ? (toolsReturnFocus || toolsButton())
      : kind === "glossary"
        ? (glossaryReturnFocus || toolsButton())
        : document.getElementById("somos-index");
    var bridgeLabel = kind === "index" ? labels.index : kind === "glossary" ? labels.glossary : labels.settings;
    var bridge = exactBridge(bridgeLabel);
    if (bridge) bridge.click();
    else {
      var pressed = Array.prototype.find.call(document.querySelectorAll('button[aria-pressed="true"]'), function (button) {
        return !button.id.startsWith("somos-") && button.closest("#somos-primary-toolbar") === null;
      });
      if (pressed) pressed.click();
      else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
    if (kind === "settings") toolsReturnFocus = null;
    if (kind === "glossary") glossaryReturnFocus = null;
    scheduleUpdate();
    window.requestAnimationFrame(function () {
      var target = returnFocus && returnFocus.isConnected
        ? returnFocus
        : document.getElementById(kind === "index" ? "somos-index" : "somos-tools");
      if (target) target.focus({ preventScroll: true });
    });
  }

  function returnFromGlossaryToTools() {
    var glossary = exactBridge(labels.glossary);
    if (glossary && glossary.getAttribute("aria-pressed") === "true") glossary.click();
    else {
      var compactGlossary = compactToolButton("Glosario");
      if (compactGlossary && compactGlossary.getAttribute("aria-pressed") === "true") compactGlossary.click();
      else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
    glossaryReturnFocus = null;
    window.setTimeout(function () { openTools(toolsButton(), "#somos-open-glossary"); }, 180);
  }

  function createAudioSettings(readingCard) {
    var audioHeading = document.getElementById("somos-audio-settings-heading");
    if (!audioHeading) {
      audioHeading = document.createElement("h4");
      audioHeading.id = "somos-audio-settings-heading";
      audioHeading.className = "somos-settings-subheading";
      audioHeading.textContent = "Audio y voz";
      readingCard.appendChild(audioHeading);
    }

    var voiceRow = document.getElementById("somos-audio-voice-setting");
    if (!voiceRow) {
      voiceRow = document.createElement("div");
      voiceRow.id = "somos-audio-voice-setting";
      voiceRow.className = "somos-audio-voice somos-native-setting-row";
      voiceRow.innerHTML = "<strong>Voz del narrador</strong><span>Predeterminada · única voz disponible</span>";
      readingCard.appendChild(voiceRow);
    }

    var speedRow = document.getElementById("somos-audio-speed-setting");
    if (!speedRow) {
      var speedMarkup = speedOptions.map(function (option) {
        return '<button type="button" role="radio" aria-checked="false" aria-label="' + option.label + ", " + option.multiplier + '" data-somos-speed="' + option.id + '"><span>' + option.label + "</span><small>" + option.multiplier + "</small></button>";
      }).join("");
      speedRow = document.createElement("div");
      speedRow.id = "somos-audio-speed-setting";
      speedRow.className = "somos-native-setting-row";
      speedRow.innerHTML = '<fieldset class="somos-speed-fieldset"><legend id="somos-speed-title">Velocidad</legend><div class="somos-speed-options" role="radiogroup" aria-labelledby="somos-speed-title">' + speedMarkup + "</div></fieldset>";
      readingCard.appendChild(speedRow);
      speedRow.querySelectorAll("[data-somos-speed]").forEach(function (button) {
        button.addEventListener("click", function () {
          var option = speedOptions.find(function (candidate) { return candidate.id === button.getAttribute("data-somos-speed"); });
          if (option) selectSpeed(option);
        });
      });
    }
  }

  function nativeConditionalRow(readingCard, className) {
    return Array.prototype.find.call(readingCard.children, function (row) {
      return row.classList.contains(className) && !row.classList.contains("somos-proxy-setting");
    });
  }

  function syncConditionalSettings(readingCard) {
    var autoplayRow = nativeConditionalRow(readingCard, "somos-setting-autoplay");
    var imagesRow = nativeConditionalRow(readingCard, "somos-setting-describe-images");
    var highlightRow = nativeConditionalRow(readingCard, "somos-setting-highlight");
    var autoplaySwitch = autoplayRow && autoplayRow.querySelector('[role="switch"]');
    var imagesSwitch = imagesRow && imagesRow.querySelector('[role="switch"]');
    var checkedHighlight = highlightRow && highlightRow.querySelector('[role="radio"][aria-checked="true"]');
    if (autoplaySwitch && !conditionalSettings.pending.autoplay) {
      conditionalSettings.autoplay = autoplaySwitch.getAttribute("aria-checked") === "true";
    }
    if (imagesSwitch && !conditionalSettings.pending.describeImages) {
      conditionalSettings.describeImages = imagesSwitch.getAttribute("aria-checked") === "true";
    }
    if (checkedHighlight && !conditionalSettings.pending.highlight) {
      conditionalSettings.highlight = normalizedText(checkedHighlight.textContent);
    }
  }

  function applyPendingConditionalSettings(readingCard) {
    var definitions = [
      { key: "autoplay", className: "somos-setting-autoplay", role: "switch" },
      { key: "describeImages", className: "somos-setting-describe-images", role: "switch" },
    ];
    definitions.forEach(function (definition) {
      if (!conditionalSettings.pending[definition.key]) return;
      var row = nativeConditionalRow(readingCard, definition.className);
      var control = row && row.querySelector('[role="' + definition.role + '"]');
      if (!control) return;
      if ((control.getAttribute("aria-checked") === "true") !== conditionalSettings[definition.key]) control.click();
      delete conditionalSettings.pending[definition.key];
    });
    if (conditionalSettings.pending.highlight) {
      var highlightRow = nativeConditionalRow(readingCard, "somos-setting-highlight");
      var target = highlightRow && Array.prototype.find.call(highlightRow.querySelectorAll('[role="radio"]'), function (radio) {
        return normalizedText(radio.textContent) === conditionalSettings.highlight;
      });
      if (target && target.getAttribute("aria-checked") !== "true") target.click();
      if (target) delete conditionalSettings.pending.highlight;
    }
  }

  function proxySwitchRow(id, label, key, className) {
    var checked = conditionalSettings[key] === true;
    var row = document.createElement("div");
    row.id = id;
    row.className = "somos-native-setting-row somos-proxy-setting " + className;
    row.innerHTML = '<span id="' + id + '-label">' + label + '</span><button type="button" class="somos-proxy-switch" role="switch" aria-checked="' + (checked ? "true" : "false") + '" aria-labelledby="' + id + '-label"><span aria-hidden="true"></span></button>';
    row.querySelector("button").addEventListener("click", function (event) {
      conditionalSettings[key] = event.currentTarget.getAttribute("aria-checked") !== "true";
      conditionalSettings.pending[key] = true;
      setAttributeIfChanged(event.currentTarget, "aria-checked", conditionalSettings[key] ? "true" : "false");
    });
    return row;
  }

  function ensureConditionalSettings(readingCard) {
    var autoplayRow = nativeConditionalRow(readingCard, "somos-setting-autoplay");
    var imagesRow = nativeConditionalRow(readingCard, "somos-setting-describe-images");
    var highlightRow = nativeConditionalRow(readingCard, "somos-setting-highlight");
    var proxyAutoplay = document.getElementById("somos-proxy-autoplay");
    var proxyImages = document.getElementById("somos-proxy-describe-images");
    var proxyHighlight = document.getElementById("somos-proxy-highlight");
    if (autoplayRow && proxyAutoplay) proxyAutoplay.remove();
    if (imagesRow && proxyImages) proxyImages.remove();
    if (highlightRow && proxyHighlight) proxyHighlight.remove();
    if (!autoplayRow && !proxyAutoplay) {
      readingCard.appendChild(proxySwitchRow("somos-proxy-autoplay", "Reproducción automática", "autoplay", "somos-setting-autoplay"));
    }
    if (!imagesRow && !proxyImages) {
      readingCard.appendChild(proxySwitchRow("somos-proxy-describe-images", "Descripción de imágenes", "describeImages", "somos-setting-describe-images"));
    }
    if (!highlightRow && !proxyHighlight) {
      proxyHighlight = document.createElement("div");
      proxyHighlight.id = "somos-proxy-highlight";
      proxyHighlight.className = "somos-native-setting-row somos-proxy-setting somos-setting-highlight";
      proxyHighlight.innerHTML = '<span id="somos-proxy-highlight-label">Resaltado</span><div class="somos-proxy-radio-group" role="radiogroup" aria-labelledby="somos-proxy-highlight-label"><button type="button" role="radio" aria-checked="' + (conditionalSettings.highlight !== "Oración" ? "true" : "false") + '">Palabra</button><button type="button" role="radio" aria-checked="' + (conditionalSettings.highlight === "Oración" ? "true" : "false") + '">Oración</button></div>';
      proxyHighlight.querySelectorAll('[role="radio"]').forEach(function (radio) {
        radio.addEventListener("click", function () {
          conditionalSettings.highlight = normalizedText(radio.textContent);
          conditionalSettings.pending.highlight = true;
          proxyHighlight.querySelectorAll('[role="radio"]').forEach(function (candidate) {
            setAttributeIfChanged(candidate, "aria-checked", candidate === radio ? "true" : "false");
          });
        });
      });
      readingCard.appendChild(proxyHighlight);
    }
  }

  function syncHighlightAvailability(readingCard) {
    var highlightRow = nativeConditionalRow(readingCard, "somos-setting-highlight") ||
      readingCard.querySelector(".somos-setting-highlight");
    if (!highlightRow) return;
    var group = highlightRow.matches('[role="group"], [role="radiogroup"]')
      ? highlightRow
      : highlightRow.querySelector('[role="group"], [role="radiogroup"]');
    if (!group) return;
    var description = highlightRow.querySelector("#somos-highlight-requirement");
    if (!description) {
      description = document.createElement("span");
      description.id = "somos-highlight-requirement";
      description.className = "somos-setting-description somos-highlight-requirement";
      description.textContent = "Active Lectura en voz alta para utilizar el resaltado.";
      highlightRow.appendChild(description);
    }
    var control = ttsSwitch();
    var enabled = Boolean(ttsPlayer() || (control && control.getAttribute("aria-checked") === "true"));
    setAttributeIfChanged(group, "aria-disabled", enabled ? "false" : "true");
    if (enabled) {
      group.removeAttribute("tabindex");
      group.removeAttribute("aria-describedby");
      description.hidden = true;
    } else {
      group.tabIndex = 0;
      group.setAttribute("aria-describedby", description.id);
      description.hidden = false;
    }
    group.querySelectorAll('[role="radio"]').forEach(function (radio) {
      if (!enabled) {
        radio.dataset.somosTtsRequiredDisabled = "true";
        radio.disabled = true;
        setAttributeIfChanged(radio, "aria-disabled", "true");
      } else if (radio.dataset.somosTtsRequiredDisabled === "true") {
        delete radio.dataset.somosTtsRequiredDisabled;
        radio.disabled = false;
        radio.removeAttribute("aria-disabled");
      }
    });
    highlightRow.classList.toggle("somos-setting-disabled", !enabled);
  }

  function organizeNativeSettings(panel) {
    var readingSection = settingsSection(panel, /^(Lectura|Apoyos para la lectura)$/i);
    if (readingSection) {
      readingSection.classList.add("somos-settings-section-reading");
      var readingHeading = readingSection.querySelector("h3");
      if (readingHeading) readingHeading.textContent = "Apoyos para la lectura";
      var readingCard = readingSection.querySelector(":scope > div");
      if (readingCard) {
        readingCard.classList.add("somos-settings-card");
        Array.prototype.slice.call(readingCard.children).forEach(function (row) {
          if (row.id === "somos-audio-settings-heading") return;
          row.classList.add("somos-native-setting-row");
          var rowText = normalizedText(row.textContent);
          if (/^(Texto a voz|Activar lectura en voz alta)/i.test(rowText)) row.classList.add("somos-setting-read-aloud");
          else if (/^Reproducción automática/i.test(rowText)) row.classList.add("somos-setting-autoplay");
          else if (/^(Describir imágenes|Descripción de imágenes)/i.test(rowText)) row.classList.add("somos-setting-describe-images");
          else if (/^Resaltado/i.test(rowText)) row.classList.add("somos-setting-highlight");
        });
        var readAloud = Array.prototype.find.call(readingCard.children, function (row) {
          return /^(Texto a voz|Activar lectura en voz alta)/i.test(normalizedText(row.textContent));
        });
        if (readAloud) {
          var label = readAloud.querySelector("label span");
          if (label) {
            label.id = "somos-read-aloud-label";
            label.textContent = "Activar lectura en voz alta";
          }
          var labelContainer = readAloud.querySelector("label");
          if (labelContainer && !labelContainer.querySelector(".somos-setting-description")) {
            var description = document.createElement("span");
            description.id = "somos-read-aloud-description";
            description.className = "somos-setting-description";
            description.textContent = "Habilita el modo. Use Reproducir para comenzar.";
            labelContainer.appendChild(description);
          }
          var readAloudSwitch = readAloud.querySelector('[role="switch"]');
          if (readAloudSwitch) {
            readAloudSwitch.setAttribute("aria-labelledby", "somos-read-aloud-label");
            readAloudSwitch.setAttribute("aria-describedby", "somos-read-aloud-description");
            if (readAloudSwitch.dataset.somosActivationFlow !== "true") {
              readAloudSwitch.dataset.somosActivationFlow = "true";
              readAloudSwitch.addEventListener("click", function () {
                var activating = readAloudSwitch.getAttribute("aria-checked") !== "true";
                window.setTimeout(function () {
                  var liveControl = ttsSwitch();
                  var active = Boolean(ttsPlayer() || (liveControl && liveControl.getAttribute("aria-checked") === "true"));
                  if (activating && active) {
                    closeTools(false);
                    closePressedPanels(null);
                    pausePreparedTtsSession(0);
                  }
                  scheduleUpdate();
                }, 180);
              });
            }
          }
        }
        Array.prototype.slice.call(readingCard.querySelectorAll("label span")).forEach(function (label) {
          if (normalizedText(label.textContent) === "Describir imágenes") label.textContent = "Descripción de imágenes";
        });
        applyPendingConditionalSettings(readingCard);
        syncConditionalSettings(readingCard);
        ensureConditionalSettings(readingCard);
        syncHighlightAvailability(readingCard);
        createAudioSettings(readingCard);
      }
    }

    var preferencesSection = settingsSection(panel, /^(Comportamiento|Preferencias)$/i);
    if (preferencesSection) {
      preferencesSection.classList.add("somos-settings-section-preferences");
      var preferencesHeading = preferencesSection.querySelector("h3");
      if (preferencesHeading) preferencesHeading.textContent = "Preferencias";
      var preferencesCard = preferencesSection.querySelector(":scope > div");
      if (preferencesCard) preferencesCard.classList.add("somos-settings-card");
    }

    var shortcutsSection = settingsSection(panel, /^Atajos de teclado$/i);
    if (shortcutsSection) {
      shortcutsSection.classList.add("somos-settings-section-shortcuts");
      var shortcutsCard = shortcutsSection.querySelector(":scope > div");
      Array.prototype.slice.call(shortcutsSection.querySelectorAll("span")).forEach(function (label) {
        if (normalizedText(label.textContent) === "Abrir ajustes") label.textContent = "Abrir Herramientas";
      });
      if (shortcutsCard && !shortcutsCard.querySelector("#somos-glossary-shortcut")) {
        var closeRow = Array.prototype.find.call(shortcutsCard.children, function (row) {
          return /^Cerrar panel/i.test(normalizedText(row.textContent));
        });
        var template = closeRow || shortcutsCard.firstElementChild;
        if (template) {
          var glossaryRow = template.cloneNode(true);
          glossaryRow.id = "somos-glossary-shortcut";
          glossaryRow.hidden = false;
          glossaryRow.removeAttribute("aria-hidden");
          var shortcutLabel = glossaryRow.querySelector("span");
          var shortcutKey = glossaryRow.querySelector('kbd[data-slot="kbd"]');
          if (shortcutLabel) shortcutLabel.textContent = "Abrir glosario";
          if (shortcutKey) shortcutKey.textContent = "G";
          shortcutsCard.insertBefore(glossaryRow, closeRow || null);
        }
      }
    }

    var toolsSection = panel.querySelector("#somos-reference-tools");
    if (!toolsSection) {
      var content = readingSection && readingSection.parentElement;
      if (content) {
        toolsSection = document.createElement("section");
        toolsSection.id = "somos-reference-tools";
        toolsSection.className = "somos-settings-section-tools";
        toolsSection.innerHTML = '<header><h3>Herramientas</h3></header><div class="somos-settings-card"><button id="somos-open-glossary" class="somos-tool-option" type="button" aria-keyshortcuts="G">' + icons.glossary + "<span>Glosario</span></button></div>";
        content.appendChild(toolsSection);
        toolsSection.querySelector("#somos-open-glossary").addEventListener("click", openGlossary);
      }
    }
    panel.id = "somos-tools-runtime-panel";
    var trigger = toolsButton();
    var audioTrigger = document.getElementById("somos-audio-settings");
    if (trigger) trigger.setAttribute("aria-controls", panel.id);
    if (audioTrigger) audioTrigger.setAttribute("aria-controls", panel.id);
  }

  function enhanceNativeMenus() {
    document.querySelectorAll('#interface-container [role="dialog"][data-slot="popover-content"], #interface-container [role="dialog"][data-slot="sheet-content"]').forEach(function (panel) {
      var kind = nativeMenuKind(panel);
      if (!kind) return;
      panel.classList.add("somos-native-menu-panel", "somos-native-" + kind + "-panel");
      if (panel.parentElement) panel.parentElement.classList.add("somos-native-menu-anchor");
      var titles = {
        index: "Índice",
        glossary: "Glosario",
        settings: "Herramientas",
      };
      var inner = Array.prototype.find.call(panel.children, function (child) {
        return child.querySelector("section") || child.querySelector('[role="presentation"]');
      }) || panel.firstElementChild;
      if (!inner) return;
      inner.classList.add("somos-native-menu-shell");
      var existingHeader = panel.querySelector(".somos-panel-control-header");
      if (existingHeader && existingHeader.parentElement !== inner) {
        inner.insertBefore(existingHeader, inner.firstChild);
      }
      var nativeTitle = Array.prototype.find.call(inner.querySelectorAll("h2, h3, h4"), function (heading) {
        if (heading.classList.contains("somos-panel-control-title")) return false;
        var text = normalizedText(heading.textContent);
        return kind === "settings" ? /^Configuración$/i.test(text) : text === titles[kind];
      });
      if (nativeTitle) {
        nativeTitle.classList.add("somos-native-title-hidden");
        nativeTitle.setAttribute("aria-hidden", "true");
      }
      if (existingHeader) {
        if (kind === "settings") organizeNativeSettings(panel);
        focusNativeMenuEntry(panel, kind, 0);
        return;
      }
      var header = document.createElement("div");
      var titleId = "somos-native-" + kind + "-title";
      header.className = "somos-panel-control-header" + (kind === "glossary" ? " somos-panel-control-header-glossary" : "");
      header.innerHTML = (kind === "glossary" ? '<button type="button" class="somos-panel-back" aria-label="Volver a Herramientas"><span aria-hidden="true">←</span><span>Herramientas</span></button>' : "") + '<h2 id="' + titleId + '" class="somos-panel-control-title">' + titles[kind] + '</h2><button type="button" class="somos-panel-close" aria-keyshortcuts="Escape" aria-label="Cerrar ' + titles[kind] + '">' + icons.close + "</button>";
      inner.insertBefore(header, inner.firstChild);
      panel.setAttribute("aria-labelledby", titleId);
      header.querySelector(".somos-panel-close").addEventListener("click", function () { closeNativeMenu(panel, kind); });
      var back = header.querySelector(".somos-panel-back");
      if (back) back.addEventListener("click", returnFromGlossaryToTools);
      if (kind === "settings") organizeNativeSettings(panel);
      focusNativeMenuEntry(panel, kind, 0);
    });
  }

  function closeTools(restoreFocus) {
    var panel = toolsPanel();
    var trigger = toolsButton();
    var returnFocus = toolsReturnFocus || trigger;
    var bridge = exactBridge(labels.settings);
    if (!panel && (!bridge || bridge.getAttribute("aria-pressed") !== "true")) return;
    if (bridge && bridge.getAttribute("aria-pressed") === "true") bridge.click();
    else if (panel) document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    setAttributeIfChanged(trigger, "aria-expanded", "false");
    toolsReturnFocus = null;
    scheduleUpdate();
    if (restoreFocus && returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
  }

  function openTools(origin, focusSelector) {
    var trigger = toolsButton();
    var bridge = exactBridge(labels.settings);
    if (!trigger) return;
    toolsReturnFocus = origin || trigger;
    pendingToolsFocusSelector = focusSelector || "";
    pendingPanelFocusKind = "settings";
    setAttributeIfChanged(trigger, "aria-expanded", "true");
    if (bridge) {
      closePressedPanels(bridge);
      if (bridge.getAttribute("aria-pressed") !== "true") bridge.click();
    } else {
      closePressedPanels(null);
      var accessibility = exactBridge(labels.accessibility);
      if (!accessibility) return;
      if (accessibility.getAttribute("aria-pressed") !== "true") accessibility.click();
      resolveCompactTool("Configuración", accessibility, function () {
        window.requestAnimationFrame(function () { focusToolsTarget(0); });
      }, 0);
    }
    scheduleUpdate();
    window.requestAnimationFrame(function () { focusToolsTarget(0); });
  }

  function toggleTools() {
    var bridge = exactBridge(labels.settings);
    if ((bridge && bridge.getAttribute("aria-pressed") === "true") || toolsPanel()) closeTools(true);
    else openTools(toolsButton());
  }

  function openGlossary(eventOrOrigin) {
    var bridge = exactBridge(labels.glossary);
    if (bridge && bridge.getAttribute("aria-pressed") === "true") return;
    glossaryReturnFocus = eventOrOrigin && eventOrOrigin.currentTarget
      ? eventOrOrigin.currentTarget
      : eventOrOrigin && eventOrOrigin.nodeType === 1
        ? eventOrOrigin
        : document.activeElement;
    pendingPanelFocusKind = "glossary";
    openRuntimeFeature(labels.glossary, "Glosario");
  }

  function toolbarButton(id, label, iconMarkup) {
    return '<button type="button" id="' + id + '" class="somos-toolbar-button" aria-label="' + label + '" title="' + label + '">' + iconMarkup + '<span>' + label + "</span></button>";
  }

  function audioPlayerButton(id, label, iconMarkup, attributes) {
    return '<button type="button" id="' + id + '" class="somos-audio-button" aria-label="' + label + '" title="' + label + '" ' + (attributes || "") + ">" + iconMarkup + '<span>' + label + "</span></button>";
  }

  function focusBookContent() {
    var content = document.getElementById("content");
    if (!content) return;
    content.tabIndex = -1;
    content.focus({ preventScroll: true });
  }

  function focusBookAfterStop(attempt) {
    if (!ttsPlayer() || attempt >= 30) {
      document.documentElement.removeAttribute("data-somos-audio-stopping");
      focusBookContent();
      scheduleUpdate();
      return;
    }
    window.requestAnimationFrame(function () { focusBookAfterStop(attempt + 1); });
  }

  function focusPreparedPlayer(attempt) {
    var control = document.getElementById("somos-audio-toggle");
    var player = audioPlayer();
    if (control && player && !control.disabled && !player.hidden) {
      control.focus({ preventScroll: true });
      var status = document.getElementById("somos-audio-status");
      if (status) status.textContent = "Lectura en voz alta activada. Pulse Reproducir para comenzar.";
      return;
    }
    if (attempt < 20) {
      window.requestAnimationFrame(function () { focusPreparedPlayer(attempt + 1); });
    }
  }

  function useNativeAudioButton(predicate, afterClick) {
    var button = nativeAudioButton(predicate);
    if (!button) return;
    button.click();
    scheduleUpdate();
    if (afterClick) afterClick();
  }

  function preservePausedTransport(attempt) {
    var toggle = nativeAudioButton(function (label) { return label === labels.play || label === labels.pauseNative; });
    if (toggle && toggle.getAttribute("aria-label") === labels.pauseNative) toggle.click();
    scheduleUpdate();
    if (attempt < 12) {
      window.requestAnimationFrame(function () { preservePausedTransport(attempt + 1); });
    }
  }

  function stepNativeAudio(predicate) {
    var toggle = nativeAudioButton(function (label) { return label === labels.play || label === labels.pauseNative; });
    var wasPlaying = Boolean(toggle && toggle.getAttribute("aria-label") === labels.pauseNative);
    useNativeAudioButton(predicate);
    if (!wasPlaying) preservePausedTransport(0);
  }

  function stopTtsSession() {
    var player = audioPlayer();
    userStartedAudio = false;
    document.documentElement.setAttribute("data-somos-audio-stopping", "true");
    if (player) player.hidden = true;
    useNativeAudioButton(function (label) { return label === labels.stop; }, function () {
      window.requestAnimationFrame(function () { focusBookAfterStop(0); });
    });
  }

  function setNativeSpeed(option, attempt) {
    var item = Array.prototype.find.call(document.querySelectorAll('[role="menuitemradio"]'), function (candidate) {
      return candidate.textContent.trim() === option.nativeLabel;
    });
    if (item) {
      item.click();
      window.requestAnimationFrame(function () {
        var speedButton = nativeAudioButton(function (label) { return label.indexOf("Velocidad de reproducción:") === 0; });
        if (speedButton && speedButton.getAttribute("aria-expanded") === "true") speedButton.click();
        scheduleUpdate();
      });
      return;
    }
    if (attempt === 0) {
      var speedButton = nativeAudioButton(function (label) { return label.indexOf("Velocidad de reproducción:") === 0; });
      if (speedButton) speedButton.click();
    }
    if (attempt < 20) {
      window.requestAnimationFrame(function () { setNativeSpeed(option, attempt + 1); });
    }
  }

  function selectSpeed(option) {
    setAttributeIfChanged(document.documentElement, "data-somos-audio-speed", option.id);
    if (ttsPlayer()) setNativeSpeed(option, 0);
    scheduleUpdate();
  }

  function applyPendingAudioSettings() {
    var speedId = document.documentElement.getAttribute("data-somos-audio-speed") || "normal";
    var option = speedOptions.find(function (candidate) { return candidate.id === speedId; }) || speedOptions[1];
    setNativeSpeed(option, 0);
  }

  function openAudioSettings() {
    openTools(document.getElementById("somos-audio-settings"), '[data-somos-speed="slow"]');
  }

  function pausePreparedTtsSession(attempt, settingsApplied) {
    var player = ttsPlayer();
    var pause = player && Array.prototype.find.call(player.querySelectorAll("button"), function (button) {
      return button.getAttribute("aria-label") === labels.pauseNative;
    });
    var applied = Boolean(settingsApplied);
    if (player && !applied) {
      applyPendingAudioSettings();
      applied = true;
    }
    if (player) {
      if (pause) pause.click();
      scheduleUpdate();
    }
    if (attempt < 30) {
      window.requestAnimationFrame(function () { pausePreparedTtsSession(attempt + 1, applied); });
      return;
    }
    focusPreparedPlayer(0);
  }

  function toggleTtsMode() {
    closeTools(false);
    closePressedPanels(null);
    var control = ttsSwitch();
    var activating = !ttsPlayer() && (!control || control.getAttribute("aria-checked") !== "true");
    userStartedAudio = false;
    var direct = ttsBridge();
    if (direct) {
      direct.click();
      if (activating) pausePreparedTtsSession(0);
      scheduleUpdate();
      return;
    }

    var accessibility = exactBridge(labels.accessibility);
    if (!accessibility) return;
    accessibility.click();
    resolveCompactTool("Texto a voz", accessibility, function () {
      if (activating) pausePreparedTtsSession(0);
    }, 0);
  }

  function buildInterface() {
    var root = navContainer();
    if (!root || document.getElementById("somos-primary-toolbar")) return;
    var dock = baseDock();
    if (!dock || !exactBridge(labels.index) || !(exactBridge(labels.settings) || exactBridge(labels.accessibility))) return;

    var toolbar = document.createElement("nav");
    toolbar.id = "somos-primary-toolbar";
    toolbar.className = "somos-primary-toolbar";
    toolbar.setAttribute("aria-label", "Navegación del libro");
    toolbar.innerHTML = toolbarButton("somos-index", "Índice", icons.index) +
      toolbarButton("somos-previous", "Anterior", icons.previous) +
      '<output id="somos-page-status" class="somos-page-status" aria-live="polite">– / –</output>' +
      toolbarButton("somos-next", "Siguiente", icons.next) +
      '<button type="button" id="somos-tools" class="somos-toolbar-button" aria-label="Herramientas" title="Herramientas" aria-haspopup="dialog" aria-expanded="false" aria-keyshortcuts="A">' + icons.tools + "<span>Herramientas</span></button>";

    var player = document.createElement("section");
    player.id = "somos-tts-player";
    player.className = "somos-tts-player";
    player.setAttribute("role", "group");
    player.setAttribute("aria-label", "Controles de lectura en voz alta");
    player.hidden = true;
    player.innerHTML = audioPlayerButton("somos-audio-previous", labels.audioPrevious, icons.audioPrevious) +
      audioPlayerButton("somos-audio-toggle", labels.play, icons.play, 'aria-pressed="false"') +
      audioPlayerButton("somos-audio-next", labels.audioNext, icons.audioNext) +
      audioPlayerButton("somos-audio-settings", "Voz y velocidad", icons.audioSettings, 'aria-haspopup="dialog" aria-expanded="false"') +
      audioPlayerButton("somos-audio-stop", labels.stop, icons.stop) +
      '<p id="somos-audio-status" class="somos-visually-hidden" aria-live="polite"></p>';

    document.body.appendChild(player);
    document.body.appendChild(toolbar);

    var indexControl = document.getElementById("somos-index");
    indexControl.setAttribute("aria-haspopup", "dialog");
    indexControl.setAttribute("aria-expanded", "false");
    indexControl.setAttribute("aria-keyshortcuts", "X");

    function openIndexFromPrimary() {
      closeTools(false);
      openIndexWhenPanelsClose(0);
    }

    document.getElementById("somos-index").addEventListener("click", openIndexFromPrimary);
    document.getElementById("somos-previous").addEventListener("click", function () {
      var button = exactBridge(labels.previous);
      if (button) button.click();
    });
    document.getElementById("somos-next").addEventListener("click", function () {
      var button = exactBridge(labels.next);
      if (button) button.click();
    });
    toolsButton().addEventListener("click", toggleTools);

    player.addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button) return;
      if (button.id === "somos-audio-previous") {
        stepNativeAudio(function (label) { return label === labels.audioPrevious || label === "previous-audio"; });
      } else if (button.id === "somos-audio-toggle") {
        var nativeToggle = nativeAudioButton(function (label) { return label === labels.play || label === labels.pauseNative; });
        if (nativeToggle && nativeToggle.getAttribute("aria-label") === labels.play) userStartedAudio = true;
        useNativeAudioButton(function (label) { return label === labels.play || label === labels.pauseNative; });
      } else if (button.id === "somos-audio-next") {
        stepNativeAudio(function (label) { return label === labels.audioNext || label === "next-audio"; });
      } else if (button.id === "somos-audio-settings") {
        openAudioSettings();
      }
    });

    player.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      var controls = Array.prototype.filter.call(player.querySelectorAll("button"), function (button) { return !button.disabled; });
      var index = controls.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      var step = event.key === "ArrowRight" ? 1 : -1;
      controls[(index + step + controls.length) % controls.length].focus();
    });

    toolbar.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      var controls = Array.prototype.filter.call(toolbar.querySelectorAll("button"), function (button) { return !button.disabled; });
      var index = controls.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      var step = event.key === "ArrowRight" ? 1 : -1;
      controls[(index + step + controls.length) % controls.length].focus();
    });
  }

  function updateInterface() {
    updateScheduled = false;
    buildInterface();
    concealBaseDock();
    exposeCustomControls();
    enhanceNativeMenus();

    var previous = exactBridge(labels.previous);
    var next = exactBridge(labels.next);
    var previousControl = document.getElementById("somos-previous");
    var nextControl = document.getElementById("somos-next");
    if (previousControl) previousControl.disabled = !previous || previous.disabled;
    if (nextControl) nextControl.disabled = !next || next.disabled;

    var counter = document.getElementById("somos-page-status");
    if (counter && next && next.parentElement) {
      var source = next.parentElement.querySelector(".order-3");
      var value = source
        ? source.textContent.replace(/\s+/g, " ").trim().replace(/\s*\/\s*/, " / ")
        : "– / –";
      if (counter.textContent !== value) counter.textContent = value;
    }

    var indexControl = document.getElementById("somos-index");
    var indexBridge = exactBridge(labels.index);
    if (indexControl && indexBridge) {
      setAttributeIfChanged(indexControl, "aria-expanded", indexBridge.getAttribute("aria-pressed") === "true" ? "true" : "false");
    }

    var tts = ttsSwitch();
    var ttsActive = Boolean(ttsPlayer() || (tts && tts.getAttribute("aria-checked") === "true"));
    concealNativeTtsPlayer();
    setAttributeIfChanged(document.documentElement, "data-somos-tts-active", ttsActive ? "true" : "false");

    var customPlayer = audioPlayer();
    var stoppingAudio = document.documentElement.getAttribute("data-somos-audio-stopping") === "true";
    if (!ttsActive && stoppingAudio) {
      document.documentElement.removeAttribute("data-somos-audio-stopping");
      stoppingAudio = false;
    }
    if (customPlayer) customPlayer.hidden = !ttsActive || stoppingAudio;
    var nativePrevious = nativeAudioButton(function (label) { return label === labels.audioPrevious || label === "previous-audio"; });
    var nativeToggle = nativeAudioButton(function (label) { return label === labels.play || label === labels.pauseNative; });
    var nativeNext = nativeAudioButton(function (label) { return label === labels.audioNext || label === "next-audio"; });
    var nativeStop = nativeAudioButton(function (label) { return label === labels.stop; });
    var customPrevious = document.getElementById("somos-audio-previous");
    var customToggle = document.getElementById("somos-audio-toggle");
    var customNext = document.getElementById("somos-audio-next");
    var customStop = document.getElementById("somos-audio-stop");
    if (customPrevious) customPrevious.disabled = !nativePrevious || nativePrevious.disabled;
    if (customNext) customNext.disabled = !nativeNext || nativeNext.disabled;
    if (customStop) customStop.disabled = !nativeStop || nativeStop.disabled;
    if (customToggle) {
      var nativePlaying = Boolean(nativeToggle && nativeToggle.getAttribute("aria-label") === labels.pauseNative);
      if (nativePlaying && !userStartedAudio && !automaticPausePending) {
        automaticPausePending = true;
        nativeToggle.click();
        window.setTimeout(function () {
          automaticPausePending = false;
          scheduleUpdate();
        }, 0);
      } else if (!nativePlaying) {
        automaticPausePending = false;
      }
      var playing = nativePlaying && userStartedAudio;
      var toggleLabel = playing ? labels.pause : labels.play;
      customToggle.disabled = !nativeToggle || nativeToggle.disabled;
      setAttributeIfChanged(customToggle, "aria-label", toggleLabel);
      setAttributeIfChanged(customToggle, "title", toggleLabel);
      setAttributeIfChanged(customToggle, "aria-pressed", playing ? "true" : "false");
      if (customToggle.getAttribute("data-somos-playing") !== (playing ? "true" : "false")) {
        customToggle.setAttribute("data-somos-playing", playing ? "true" : "false");
        customToggle.innerHTML = (playing ? icons.pause : icons.play) + "<span>" + toggleLabel + "</span>";
      }
    }

    var customAudioSettings = document.getElementById("somos-audio-settings");
    if (customAudioSettings) {
      var settingsBridge = exactBridge(labels.settings);
      setAttributeIfChanged(customAudioSettings, "aria-expanded", (settingsBridge && settingsBridge.getAttribute("aria-pressed") === "true") || toolsPanel() ? "true" : "false");
    }
    var customTools = toolsButton();
    var settingsControl = exactBridge(labels.settings);
    if (customTools) setAttributeIfChanged(customTools, "aria-expanded", (settingsControl && settingsControl.getAttribute("aria-pressed") === "true") || toolsPanel() ? "true" : "false");

    var nativeSpeed = nativeAudioButton(function (label) { return label.indexOf("Velocidad de reproducción:") === 0; });
    var currentSpeed = document.documentElement.getAttribute("data-somos-audio-speed") || "normal";
    if (nativeSpeed) {
      var nativeSpeedLabel = nativeSpeed.getAttribute("aria-label").split(":").slice(1).join(":").trim();
      var matchingSpeed = speedOptions.find(function (option) { return option.nativeLabel === nativeSpeedLabel; });
      if (matchingSpeed) currentSpeed = matchingSpeed.id;
    }
    setAttributeIfChanged(document.documentElement, "data-somos-audio-speed", currentSpeed);
    document.querySelectorAll("[data-somos-speed]").forEach(function (button) {
      setAttributeIfChanged(button, "aria-checked", button.getAttribute("data-somos-speed") === currentSpeed ? "true" : "false");
    });
  }

  function scheduleUpdate() {
    if (updateScheduled) return;
    updateScheduled = true;
    window.requestAnimationFrame(updateInterface);
  }

  function removeSingleLanguageShortcut() {
    document.querySelectorAll("#interface-container span").forEach(function (span) {
      if (span.textContent.trim() === labels.languageShortcut && span.parentElement) {
        span.parentElement.hidden = true;
        span.parentElement.setAttribute("aria-hidden", "true");
      }
    });
  }

  document.documentElement.setAttribute("data-project-adaptations", "somos-ger-53");
  var root = navContainer();
  if (root) {
    new MutationObserver(scheduleUpdate).observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-pressed", "disabled"],
    });
  }
  var interfaceRoot = document.getElementById("interface-container");
  if (interfaceRoot) {
    new MutationObserver(function () {
      removeSingleLanguageShortcut();
      scheduleUpdate();
    }).observe(interfaceRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-label", "aria-pressed", "aria-expanded", "disabled"],
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && event.target && event.target.closest) {
      var activePanel = event.target.closest(".somos-native-menu-panel");
      if (activePanel) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var activeKind = activePanel.classList.contains("somos-native-index-panel")
          ? "index"
          : activePanel.classList.contains("somos-native-glossary-panel")
            ? "glossary"
            : "settings";
        closeNativeMenu(activePanel, activeKind);
        return;
      }
    }
    if (event.altKey && event.shiftKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    var typingContext = event.target && event.target.closest && event.target.closest(
      "input, textarea, select, [contenteditable='true'], [data-activity-item], form"
    );
    if (
      !event.defaultPrevented && !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey &&
      !typingContext && String(event.key || "").toLocaleLowerCase("es") === "g"
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openGlossary();
    }
  }, true);
  document.addEventListener("click", function (event) {
    if (event.target.closest && event.target.closest("#somos-audio-stop")) stopTtsSession();
  }, true);

  scheduleUpdate();
  window.setTimeout(scheduleUpdate, 500);
  window.setTimeout(scheduleUpdate, 1500);
})();
