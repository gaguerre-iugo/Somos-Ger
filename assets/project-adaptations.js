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
  };
  var updateScheduled = false;

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
  };

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
    if (attempt < 30) {
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
      return label && label.textContent.trim() === "Texto a voz";
    });
  }

  function ttsPlayer() {
    return Array.prototype.find.call(document.querySelectorAll('[role="group"]'), function (group) {
      return group.getAttribute("aria-label") === "Controles de lectura en voz alta";
    });
  }

  function ttsBridge() {
    return bridgeButton(function (value) {
      return value === "Activar texto a voz" || value === "Desactivar texto a voz";
    });
  }

  function toolsPanel() { return document.getElementById("somos-tools-panel"); }
  function toolsButton() { return document.getElementById("somos-tools"); }

  function closeTools(restoreFocus) {
    var panel = toolsPanel();
    var trigger = toolsButton();
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    setAttributeIfChanged(trigger, "aria-expanded", "false");
    if (restoreFocus && trigger) trigger.focus();
  }

  function openTools() {
    var panel = toolsPanel();
    var trigger = toolsButton();
    if (!panel || !trigger) return;
    closePressedPanels(null);
    panel.hidden = false;
    setAttributeIfChanged(trigger, "aria-expanded", "true");
    var first = panel.querySelector("button:not([disabled])");
    if (first) first.focus();
  }

  function toggleTools() {
    var panel = toolsPanel();
    if (!panel) return;
    if (panel.hidden) openTools();
    else closeTools(true);
  }

  function toolbarButton(id, label, iconMarkup) {
    return '<button type="button" id="' + id + '" class="somos-toolbar-button" aria-label="' + label + '" title="' + label + '">' + iconMarkup + '<span>' + label + "</span></button>";
  }

  function pausePreparedTtsSession(attempt) {
    var player = ttsPlayer();
    var pause = player && Array.prototype.find.call(player.querySelectorAll("button"), function (button) {
      return button.getAttribute("aria-label") === "Pausa";
    });
    if (pause) {
      pause.click();
      scheduleUpdate();
      return;
    }
    if (attempt < 20) {
      window.requestAnimationFrame(function () { pausePreparedTtsSession(attempt + 1); });
    }
  }

  function toggleTtsMode() {
    closeTools(false);
    closePressedPanels(null);
    var control = ttsSwitch();
    var activating = !ttsPlayer() && (!control || control.getAttribute("aria-checked") !== "true");
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

    var toolbar = document.createElement("nav");
    toolbar.id = "somos-primary-toolbar";
    toolbar.className = "somos-primary-toolbar";
    toolbar.setAttribute("aria-label", "Navegación del libro");
    toolbar.innerHTML = toolbarButton("somos-index", "Índice", icons.index) +
      toolbarButton("somos-previous", "Anterior", icons.previous) +
      '<output id="somos-page-status" class="somos-page-status" aria-live="polite">– / –</output>' +
      toolbarButton("somos-next", "Siguiente", icons.next) +
      '<button type="button" id="somos-tools" class="somos-toolbar-button" aria-label="Herramientas" title="Herramientas" aria-haspopup="dialog" aria-expanded="false" aria-controls="somos-tools-panel">' + icons.tools + "<span>Herramientas</span></button>";

    var panel = document.createElement("section");
    panel.id = "somos-tools-panel";
    panel.className = "somos-tools-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "somos-tools-title");
    panel.hidden = true;
    panel.innerHTML = '<header><h2 id="somos-tools-title">Herramientas</h2><button type="button" id="somos-tools-close" class="somos-icon-button" aria-label="Cerrar Herramientas">' + icons.close + "</button></header>" +
      '<div class="somos-tools-section"><h3>Consulta</h3><button type="button" id="somos-open-glossary" class="somos-tool-option">' + icons.glossary + "<span>Glosario</span></button></div>" +
      '<div class="somos-tools-section"><h3>Audio y voz</h3><button type="button" id="somos-toggle-tts" class="somos-tool-option">' + icons.audio + "<span>Activar lectura en voz alta</span></button></div>" +
      '<div class="somos-tools-section"><h3>Preferencias</h3><button type="button" id="somos-open-settings" class="somos-tool-option">' + icons.preferences + "<span>Configuración de lectura</span></button></div>";

    root.appendChild(panel);
    root.appendChild(toolbar);

    var indexControl = document.getElementById("somos-index");
    indexControl.setAttribute("aria-haspopup", "dialog");
    indexControl.setAttribute("aria-expanded", "false");

    document.getElementById("somos-index").addEventListener("click", function () {
      closeTools(false);
      var button = exactBridge(labels.index);
      closePressedPanels(button);
      if (button) button.click();
      scheduleUpdate();
    });
    document.getElementById("somos-previous").addEventListener("click", function () {
      var button = exactBridge(labels.previous);
      if (button) button.click();
    });
    document.getElementById("somos-next").addEventListener("click", function () {
      var button = exactBridge(labels.next);
      if (button) button.click();
    });
    toolsButton().addEventListener("click", toggleTools);
    document.getElementById("somos-tools-close").addEventListener("click", function () { closeTools(true); });
    document.getElementById("somos-open-glossary").addEventListener("click", function () {
      openRuntimeFeature(labels.glossary, "Glosario");
    });
    document.getElementById("somos-toggle-tts").addEventListener("click", toggleTtsMode);
    document.getElementById("somos-open-settings").addEventListener("click", function () {
      openRuntimeFeature(labels.settings, "Configuración");
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

    panel.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTools(true);
        return;
      }
      if (event.key !== "Tab") return;
      var controls = Array.prototype.filter.call(panel.querySelectorAll("button"), function (button) { return !button.disabled; });
      if (!controls.length) return;
      var first = controls[0];
      var last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function updateInterface() {
    updateScheduled = false;
    buildInterface();
    concealBaseDock();

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
    var ttsText = document.querySelector("#somos-toggle-tts span");
    var ttsActive = Boolean(ttsPlayer() || (tts && tts.getAttribute("aria-checked") === "true"));
    setAttributeIfChanged(document.documentElement, "data-somos-tts-active", ttsActive ? "true" : "false");
    if (ttsText) {
      ttsText.textContent = ttsActive ? "Desactivar lectura en voz alta" : "Activar lectura en voz alta";
    }
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

  document.documentElement.setAttribute("data-project-adaptations", "somos-ger-16");
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
    new MutationObserver(removeSingleLanguageShortcut).observe(interfaceRoot, { childList: true, subtree: true });
  }

  document.addEventListener("keydown", function (event) {
    if (event.altKey && event.shiftKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (event.key === "Escape") closeTools(true);
  }, true);
  document.addEventListener("pointerdown", function (event) {
    var panel = toolsPanel();
    var toolbar = document.getElementById("somos-primary-toolbar");
    if (panel && !panel.hidden && !panel.contains(event.target) && (!toolbar || !toolbar.contains(event.target))) closeTools(false);
  });

  scheduleUpdate();
  window.setTimeout(scheduleUpdate, 500);
  window.setTimeout(scheduleUpdate, 1500);
})();
