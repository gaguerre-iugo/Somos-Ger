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
    pause: "Pausa",
    stop: "Detener",
  };
  var updateScheduled = false;
  var toolsReturnFocus = null;
  var userStartedAudio = false;
  var automaticPausePending = false;

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

  function toolsPanel() { return document.getElementById("somos-tools-panel"); }
  function toolsButton() { return document.getElementById("somos-tools"); }
  function audioPlayer() { return document.getElementById("somos-tts-player"); }

  function closeTools(restoreFocus) {
    var panel = toolsPanel();
    var trigger = toolsButton();
    if (!panel || panel.hidden) return;
    var returnFocus = toolsReturnFocus || trigger;
    panel.hidden = true;
    setAttributeIfChanged(trigger, "aria-expanded", "false");
    toolsReturnFocus = null;
    scheduleUpdate();
    if (restoreFocus && returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
  }

  function openTools(origin) {
    var panel = toolsPanel();
    var trigger = toolsButton();
    if (!panel || !trigger) return;
    toolsReturnFocus = origin || trigger;
    closePressedPanels(null);
    panel.hidden = false;
    setAttributeIfChanged(trigger, "aria-expanded", "true");
    scheduleUpdate();
    var first = panel.querySelector("button:not([disabled])");
    if (first) first.focus();
  }

  function toggleTools() {
    var panel = toolsPanel();
    if (!panel) return;
    if (panel.hidden) openTools(toolsButton());
    else closeTools(true);
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
    var toggle = nativeAudioButton(function (label) { return label === labels.play || label === labels.pause; });
    if (toggle && toggle.getAttribute("aria-label") === labels.pause) toggle.click();
    scheduleUpdate();
    if (attempt < 12) {
      window.requestAnimationFrame(function () { preservePausedTransport(attempt + 1); });
    }
  }

  function stepNativeAudio(predicate) {
    var toggle = nativeAudioButton(function (label) { return label === labels.play || label === labels.pause; });
    var wasPlaying = Boolean(toggle && toggle.getAttribute("aria-label") === labels.pause);
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

  function setNativeVolume(percent, attempt) {
    var input = document.querySelector('#interface-container input[type="range"][min="0"][max="1"]');
    if (input) {
      var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, String(percent / 100));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      window.requestAnimationFrame(function () {
        var volumeButton = nativeAudioButton(function (label) { return label.indexOf("Volumen:") === 0; });
        if (volumeButton && volumeButton.getAttribute("aria-expanded") === "true") volumeButton.click();
        window.setTimeout(function () {
          document.documentElement.removeAttribute("data-somos-audio-volume-pending");
          scheduleUpdate();
        }, 150);
        scheduleUpdate();
      });
      return;
    }
    if (attempt === 0) {
      var button = nativeAudioButton(function (label) { return label.indexOf("Volumen:") === 0; });
      if (button) button.click();
    }
    if (attempt < 20) {
      window.requestAnimationFrame(function () { setNativeVolume(percent, attempt + 1); });
    }
  }

  function selectSpeed(option) {
    setAttributeIfChanged(document.documentElement, "data-somos-audio-speed", option.id);
    if (ttsPlayer()) setNativeSpeed(option, 0);
    scheduleUpdate();
  }

  function selectVolume(percent) {
    setAttributeIfChanged(document.documentElement, "data-somos-audio-volume", String(percent));
    setAttributeIfChanged(document.documentElement, "data-somos-audio-volume-pending", String(percent));
    var output = document.getElementById("somos-volume-output");
    if (output) output.textContent = percent + "%";
    if (ttsPlayer()) setNativeVolume(percent, 0);
  }

  function applyPendingAudioSettings() {
    var speedId = document.documentElement.getAttribute("data-somos-audio-speed") || "normal";
    var option = speedOptions.find(function (candidate) { return candidate.id === speedId; }) || speedOptions[1];
    var volume = parseInt(document.documentElement.getAttribute("data-somos-audio-volume") || "100", 10);
    setNativeSpeed(option, 0);
    window.setTimeout(function () { setNativeVolume(volume, 0); }, 100);
  }

  function openAudioSettings() {
    openTools(document.getElementById("somos-audio-settings"));
    var firstSpeed = document.querySelector('[data-somos-speed="slow"]');
    if (firstSpeed) firstSpeed.focus({ preventScroll: true });
  }

  function pausePreparedTtsSession(attempt, settingsApplied) {
    var player = ttsPlayer();
    var pause = player && Array.prototype.find.call(player.querySelectorAll("button"), function (button) {
      return button.getAttribute("aria-label") === labels.pause;
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
    var speedMarkup = speedOptions.map(function (option) {
      return '<button type="button" role="radio" aria-checked="false" aria-label="' + option.label + ", " + option.multiplier + '" data-somos-speed="' + option.id + '"><span>' + option.label + "</span><small>" + option.multiplier + "</small></button>";
    }).join("");
    panel.innerHTML = '<header><h2 id="somos-tools-title">Herramientas</h2><button type="button" id="somos-tools-close" class="somos-icon-button" aria-label="Cerrar Herramientas">' + icons.close + "</button></header>" +
      '<div class="somos-tools-section"><h3>Consulta</h3><button type="button" id="somos-open-glossary" class="somos-tool-option">' + icons.glossary + "<span>Glosario</span></button></div>" +
      '<div class="somos-tools-section" id="somos-audio-settings-section"><h3>Audio y voz</h3><button type="button" id="somos-toggle-tts" class="somos-tool-option">' + icons.audio + '<span>Activar lectura en voz alta</span></button><p class="somos-audio-description">Habilita el modo. Use Reproducir para comenzar.</p><div class="somos-audio-voice"><strong>Voz del narrador</strong><span>Predeterminada · única voz disponible</span></div><fieldset class="somos-speed-fieldset"><legend id="somos-speed-title">Velocidad</legend><div class="somos-speed-options" role="radiogroup" aria-labelledby="somos-speed-title">' + speedMarkup + '</div></fieldset><label class="somos-volume-control" for="somos-volume"><span>Volumen</span><output id="somos-volume-output" for="somos-volume">100%</output></label><input id="somos-volume" class="somos-volume-range" type="range" min="0" max="100" step="5" value="100" aria-label="Volumen"></div>' +
      '<div class="somos-tools-section"><h3>Preferencias</h3><button type="button" id="somos-open-settings" class="somos-tool-option">' + icons.preferences + "<span>Configuración de lectura</span></button></div>";

    var player = document.createElement("section");
    player.id = "somos-tts-player";
    player.className = "somos-tts-player";
    player.setAttribute("role", "group");
    player.setAttribute("aria-label", "Controles de lectura en voz alta");
    player.hidden = true;
    player.innerHTML = audioPlayerButton("somos-audio-previous", labels.audioPrevious, icons.audioPrevious) +
      audioPlayerButton("somos-audio-toggle", labels.play, icons.play, 'aria-pressed="false"') +
      audioPlayerButton("somos-audio-next", labels.audioNext, icons.audioNext) +
      audioPlayerButton("somos-audio-settings", "Voz y velocidad", icons.audioSettings, 'aria-haspopup="dialog" aria-expanded="false" aria-controls="somos-tools-panel"') +
      audioPlayerButton("somos-audio-stop", labels.stop, icons.stop) +
      '<p id="somos-audio-status" class="somos-visually-hidden" aria-live="polite"></p>';

    root.appendChild(panel);
    root.appendChild(player);
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
    panel.querySelectorAll("[data-somos-speed]").forEach(function (button) {
      button.addEventListener("click", function () {
        var option = speedOptions.find(function (candidate) { return candidate.id === button.getAttribute("data-somos-speed"); });
        if (option) selectSpeed(option);
      });
    });
    document.getElementById("somos-volume").addEventListener("input", function (event) {
      selectVolume(parseInt(event.target.value, 10));
    });

    player.addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button) return;
      if (button.id === "somos-audio-previous") {
        stepNativeAudio(function (label) { return label === labels.audioPrevious || label === "previous-audio"; });
      } else if (button.id === "somos-audio-toggle") {
        var nativeToggle = nativeAudioButton(function (label) { return label === labels.play || label === labels.pause; });
        if (nativeToggle && nativeToggle.getAttribute("aria-label") === labels.play) userStartedAudio = true;
        useNativeAudioButton(function (label) { return label === labels.play || label === labels.pause; });
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

    panel.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTools(true);
        return;
      }
      if (event.key !== "Tab") return;
      var controls = Array.prototype.filter.call(panel.querySelectorAll("button, input"), function (control) { return !control.disabled; });
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
    concealNativeTtsPlayer();
    setAttributeIfChanged(document.documentElement, "data-somos-tts-active", ttsActive ? "true" : "false");
    if (ttsText) {
      ttsText.textContent = ttsActive ? "Desactivar lectura en voz alta" : "Activar lectura en voz alta";
    }

    var customPlayer = audioPlayer();
    var stoppingAudio = document.documentElement.getAttribute("data-somos-audio-stopping") === "true";
    if (!ttsActive && stoppingAudio) {
      document.documentElement.removeAttribute("data-somos-audio-stopping");
      stoppingAudio = false;
    }
    if (customPlayer) customPlayer.hidden = !ttsActive || stoppingAudio;
    var nativePrevious = nativeAudioButton(function (label) { return label === labels.audioPrevious || label === "previous-audio"; });
    var nativeToggle = nativeAudioButton(function (label) { return label === labels.play || label === labels.pause; });
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
      var nativePlaying = Boolean(nativeToggle && nativeToggle.getAttribute("aria-label") === labels.pause);
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
      setAttributeIfChanged(customAudioSettings, "aria-expanded", toolsPanel() && !toolsPanel().hidden ? "true" : "false");
    }

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

    var nativeVolume = nativeAudioButton(function (label) { return label.indexOf("Volumen:") === 0; });
    var pendingVolume = document.documentElement.getAttribute("data-somos-audio-volume-pending");
    var currentVolume = parseInt(pendingVolume || document.documentElement.getAttribute("data-somos-audio-volume") || "100", 10);
    if (nativeVolume && pendingVolume === null) {
      var volumeMatch = nativeVolume.getAttribute("aria-label").match(/(\d+)%/);
      if (volumeMatch) currentVolume = parseInt(volumeMatch[1], 10);
    }
    setAttributeIfChanged(document.documentElement, "data-somos-audio-volume", String(currentVolume));
    var volumeControl = document.getElementById("somos-volume");
    var volumeOutput = document.getElementById("somos-volume-output");
    if (volumeControl && volumeControl.value !== String(currentVolume)) volumeControl.value = String(currentVolume);
    if (volumeOutput && volumeOutput.textContent !== currentVolume + "%") volumeOutput.textContent = currentVolume + "%";
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

  document.documentElement.setAttribute("data-project-adaptations", "somos-ger-25");
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
  document.addEventListener("click", function (event) {
    if (event.target.closest && event.target.closest("#somos-audio-stop")) stopTtsSession();
  }, true);

  scheduleUpdate();
  window.setTimeout(scheduleUpdate, 500);
  window.setTimeout(scheduleUpdate, 1500);
})();
