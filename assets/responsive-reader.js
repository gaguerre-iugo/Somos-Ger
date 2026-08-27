(function () {
  "use strict";

  var BREAKPOINT = 768;
  var SCRIPT_VERSION = "somos-ger-reflow-34";
  var projectScript = "./assets/project-adaptations.js?v=somos-ger-64";
  var runtimeScript = "./assets/base.bundle.local.js?v=somos-ger-runtime-2";
  var reflowMedia = window.matchMedia("(max-width: " + (BREAKPOINT - 1) + "px)");
  var initialSectionId = document.querySelector('meta[name="title-id"]')
    ? document.querySelector('meta[name="title-id"]').content
    : "pg001_sec001";
  var isIndex = /(?:^|\/)index\.html$/.test(location.pathname) || /\/$/.test(location.pathname);
  var state = { active: false, current: 0, total: 1, sections: [], resizeTimer: 0, resizeAnchorId: "", initialTarget: initialSectionId, currentSectionId: initialSectionId, reflowReady: false, contentResizeTimer: 0 };
  var content = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = function () { reject(new Error("No se pudo cargar " + src)); };
      document.body.appendChild(script);
    });
  }

  function setResponsiveViewport() {
    var viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) viewport.content = "width=device-width, initial-scale=1";
  }

  function directPageUrl(sectionId, pages) {
    var entry = pages.find(function (item) { return item.section_id === sectionId; });
    return entry ? entry.href : "index.html";
  }

  function numberFromStyle(node, property) {
    var raw = node && node.style ? node.style[property] : "";
    var value = parseFloat(raw);
    return Number.isFinite(value) ? value : 0;
  }

  function visualPosition(node) {
    return {
      top: numberFromStyle(node, "top"),
      left: numberFromStyle(node, "left"),
      width: numberFromStyle(node, "width"),
      height: numberFromStyle(node, "height")
    };
  }

  function normalizedText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function extractedText(node) {
    if (node && node.dataset && node.dataset.segments) {
      try {
        var segments = JSON.parse(node.dataset.segments);
        if (Array.isArray(segments)) {
          return normalizedText(segments.map(function (segment) {
            return segment && typeof segment.text === "string" ? segment.text : "";
          }).join(""));
        }
      } catch (_error) {}
    }
    function collect(current) {
      return Array.prototype.map.call(current && current.childNodes || [], function (child) {
        if (child.nodeType === 3) return child.nodeValue || "";
        if (child.nodeType !== 1) return "";
        if (child.tagName === "BR") return " ";
        return collect(child);
      }).join("");
    }
    return normalizedText(node ? collect(node) : "");
  }

  function comparableText(value) {
    return normalizedText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
  }

  function sourceFontSize(node) {
    var values = [numberFromStyle(node, "fontSize")];
    node.querySelectorAll("[style]").forEach(function (child) {
      values.push(numberFromStyle(child, "fontSize"));
    });
    return Math.max.apply(Math, values);
  }

  function sourceEmphasis(node) {
    if (/bold|[6-9]00/i.test(node.style.fontWeight || "")) return true;
    return Array.prototype.some.call(node.querySelectorAll("[style]"), function (child) {
      return /bold|[6-9]00/i.test(child.style.fontWeight || "");
    });
  }

  function sourceRoot(doc, sectionId) {
    return doc.querySelector('[data-section-id="' + sectionId + '"]') ||
      doc.querySelector('[data-section-type="activity_quiz"][data-id="' + sectionId + '"]') ||
      doc.querySelector("main #content > section") ||
      doc.querySelector("main #content");
  }

  function textNodes(root) {
    return Array.prototype.filter.call(root.querySelectorAll("[data-id]:not(img)"), function (node) {
      if (!extractedText(node)) return false;
      return !node.parentElement || !node.parentElement.closest("[data-id]");
    }).sort(function (a, b) {
      var ap = visualPosition(a);
      var bp = visualPosition(b);
      return ap.top - bp.top || ap.left - bp.left;
    });
  }

  function imageNodes(root, sectionId) {
    var images = Array.prototype.filter.call(root.querySelectorAll("img[src]"), function (image) {
      if (sectionId === "pg032033_sec001") {
        return /pg032033_im00[12]\.(?:jpg|png)$/i.test(image.getAttribute("src") || "");
      }
      if (image.closest('[aria-hidden="true"]')) return false;
      var pos = visualPosition(image);
      return pos.width * pos.height >= 900 || Boolean(image.getAttribute("data-id"));
    });
    if (sectionId === "pg023_sec001") {
      return images.filter(function (image) { return /\.jpg$/i.test(image.getAttribute("src") || ""); });
    }
    if (sectionId === "pg032033_sec001") return images;
    var full = images.find(function (image) {
      var pos = visualPosition(image);
      return pos.width * pos.height > 150000;
    });
    if (full) return [full];
    return images.sort(function (a, b) {
      var ap = visualPosition(a);
      var bp = visualPosition(b);
      return (bp.width * bp.height) - (ap.width * ap.height);
    }).slice(0, 4);
  }

  function makeSemanticText(node, tagName, extraClass) {
    var result = document.createElement(tagName || "p");
    result.className = extraClass || "somos-reflow-copy";
    result.dataset.id = node.dataset.id;
    result.textContent = extractedText(node);
    if (sourceEmphasis(node)) result.dataset.sourceEmphasis = "true";
    return result;
  }

  function nodesById(root, ids) {
    return ids.map(function (id) {
      return root.querySelector('[data-id="' + id + '"]');
    }).filter(Boolean);
  }

  function makeCombinedCopy(nodes, extraClass) {
    var result = document.createElement("p");
    result.className = "somos-reflow-copy somos-reflow-combined-copy" +
      (extraClass ? " " + extraClass : "");
    nodes.forEach(function (node, index) {
      if (index) result.appendChild(document.createTextNode(" "));
      var segment = document.createElement("span");
      segment.dataset.id = node.dataset.id;
      segment.textContent = extractedText(node);
      if (sourceEmphasis(node)) segment.dataset.sourceEmphasis = "true";
      result.appendChild(segment);
    });
    return result;
  }

  function makeSourceFigure(root, imageId, className) {
    var sourceImage = root.querySelector('img[data-id="' + imageId + '"]');
    if (!sourceImage) return null;
    var figure = document.createElement("figure");
    figure.className = className || "somos-reflow-source-figure";
    var image = document.createElement("img");
    image.src = sourceImage.getAttribute("src");
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    figure.appendChild(image);
    return figure;
  }

  function appendTimelineIllustration(card, root, imageId, extraClass) {
    var figure = makeSourceFigure(root, imageId, "somos-reflow-timeline-illustration" +
      (extraClass ? " " + extraClass : ""));
    if (figure) card.appendChild(figure);
  }

  function composeGregariousSection(section, root) {
    section.classList.add("somos-reflow-gregarious");
    var titleNode = root.querySelector('[data-id="pg005_p013"]');
    if (titleNode) section.appendChild(makeSemanticText(titleNode, "h2", "somos-reflow-heading"));

    var origin = document.createElement("div");
    origin.className = "somos-reflow-gregarious-origin";
    var bees = makeSourceFigure(root, "pg005_im002", "somos-reflow-gregarious-bees");
    if (bees) origin.appendChild(bees);
    var originCopy = nodesById(root, ["pg005_p001"]);
    if (originCopy.length) origin.appendChild(makeCombinedCopy(originCopy));
    section.appendChild(origin);

    var gathering = document.createElement("div");
    gathering.className = "somos-reflow-gregarious-gathering";
    var gatheringLead = nodesById(root, ["pg005_p000"]);
    if (gatheringLead.length) gathering.appendChild(makeCombinedCopy(gatheringLead, "somos-reflow-gregarious-lead"));
    var groupImage = makeSourceFigure(root, "pg005_im003", "somos-reflow-gregarious-group-image");
    if (groupImage) gathering.appendChild(groupImage);
    section.appendChild(gathering);

    var callout = document.createElement("aside");
    callout.className = "somos-reflow-gregarious-callout";
    var person = makeSourceFigure(root, "pg005_im001", "somos-reflow-gregarious-person");
    if (person) callout.appendChild(person);
    var speech = document.createElement("div");
    speech.className = "somos-reflow-gregarious-speech";
    var speechNodes = nodesById(root, ["pg005_p010", "pg005_p012"]);
    if (speechNodes.length) speech.appendChild(makeCombinedCopy(speechNodes));
    callout.appendChild(speech);
    section.appendChild(callout);

    var conclusion = document.createElement("div");
    conclusion.className = "somos-reflow-gregarious-conclusion";
    nodesById(root, ["pg005_p005", "pg005_p008"]).forEach(function (node) {
      conclusion.appendChild(makeSemanticText(node));
    });
    section.appendChild(conclusion);
  }

  function appendTimelineCard(timeline, root, spec) {
    var card = document.createElement("section");
    card.className = "somos-reflow-timeline-card" +
      (spec.className ? " " + spec.className : "");
    var titleNode = root.querySelector('[data-id="' + spec.titleId + '"]');
    if (titleNode) card.appendChild(makeSemanticText(titleNode, "h3", "somos-reflow-subheading"));
    if (spec.imageId) appendTimelineIllustration(card, root, spec.imageId, spec.imageClass);
    var copyNodes = nodesById(root, spec.copyIds || []);
    if (copyNodes.length) card.appendChild(makeCombinedCopy(copyNodes, spec.copyClass));
    timeline.appendChild(card);
  }

  function composeCitizenshipTimeline(section, root) {
    var intro = nodesById(root, ["pg006_p000"]);
    if (intro.length) section.appendChild(makeCombinedCopy(intro, "somos-reflow-timeline-intro"));

    var timeline = document.createElement("div");
    timeline.className = "somos-reflow-timeline";
    appendTimelineCard(timeline, root, {
      titleId: "pg006_p004",
      copyIds: ["pg006_p006", "pg006_p007", "pg006_p008", "pg006_p009", "pg006_p010"]
    });
    appendTimelineCard(timeline, root, {
      titleId: "pg006_p005",
      copyIds: ["pg006_p011", "pg006_p014"]
    });
    appendTimelineCard(timeline, root, {
      titleId: "pg006_p003",
      imageId: "pg006_im003",
      className: "somos-reflow-timeline-card-illustrated",
      copyIds: ["pg006_p015", "pg006_p016", "pg006_p017", "pg006_p018", "pg006_p019", "pg006_p020", "pg006_p021", "pg006_p022"]
    });
    appendTimelineCard(timeline, root, {
      titleId: "pg006_p023",
      imageId: "pg006_im001",
      imageClass: "somos-reflow-timeline-person",
      className: "somos-reflow-timeline-card-illustrated somos-reflow-timeline-callout",
      copyIds: ["pg006_p024"],
      copyClass: "somos-reflow-timeline-quote"
    });
    section.appendChild(timeline);
  }

  function boxCenterInside(inner, outer) {
    var cx = inner.left + inner.width / 2;
    var cy = inner.top + inner.height / 2;
    return cx >= outer.left && cx <= outer.left + outer.width &&
      cy >= outer.top && cy <= outer.top + outer.height;
  }

  function collectBannerLabels(images, nodes, texts) {
    var byImageId = {};
    var labelIds = new Set();
    images.forEach(function (image) {
      var id = image.dataset.id || "";
      if (!id || normalizedText(texts[id])) return;
      var box = visualPosition(image);
      if (!(box.width > 0 && box.height > 0) || box.width * box.height > 30000) return;
      var labels = nodes.filter(function (node) {
        var pos = visualPosition(node);
        if (!(pos.width > 0 && pos.height > 0)) return false;
        if (pos.width * pos.height >= box.width * box.height) return false;
        return boxCenterInside(pos, box);
      });
      if (!labels.length) return;
      byImageId[id] = labels;
      labels.forEach(function (node) { labelIds.add(node.dataset.id); });
    });
    return { byImageId: byImageId, labelIds: labelIds };
  }

  function appendGallery(section, images, texts, usedIds, bannerLabels) {
    if (!images.length) return;
    var gallery = document.createElement("div");
    gallery.className = "somos-reflow-gallery";
    if (section.dataset.sectionId === "pg032033_sec001") {
      gallery.classList.add("somos-reflow-composite-person");
    }
    images.forEach(function (sourceImage) {
      var figure = document.createElement("figure");
      figure.className = "somos-reflow-figure";
      var image = document.createElement("img");
      image.src = sourceImage.getAttribute("src");
      var imageId = sourceImage.dataset.id || "";
      var labels = bannerLabels && bannerLabels[imageId];
      var description = normalizedText(texts[imageId]);
      image.alt = description || normalizedText(sourceImage.getAttribute("alt"));
      if (!image.alt) image.setAttribute("aria-hidden", "true");
      figure.appendChild(image);
      if (labels && labels.length) {
        figure.classList.add("somos-reflow-banner-figure");
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        var overlay = document.createElement("div");
        overlay.className = "somos-reflow-banner-label";
        labels.forEach(function (node, index) {
          if (index) overlay.appendChild(document.createTextNode(" "));
          var span = document.createElement("span");
          span.dataset.id = node.dataset.id;
          span.textContent = extractedText(node);
          if (sourceEmphasis(node)) span.dataset.sourceEmphasis = "true";
          overlay.appendChild(span);
          usedIds.add(node.dataset.id);
        });
        figure.appendChild(overlay);
      } else if (description && imageId && !usedIds.has(imageId)) {
        var caption = document.createElement("figcaption");
        caption.dataset.id = imageId;
        caption.textContent = description;
        figure.appendChild(caption);
        usedIds.add(imageId);
      }
      gallery.appendChild(figure);
    });
    if (images.length === 1
      && section.dataset.sectionId !== "pg001_sec001"
      && !gallery.classList.contains("somos-reflow-composite-person")) {
      var soloText = section.textContent.replace(/\s+/g, " ").trim();
      gallery.classList.add("somos-reflow-gallery-solo");
      if (section.childElementCount === 0) {
        gallery.classList.add("somos-reflow-gallery-solo-tall");
      } else if (soloText.length <= 120) {
        gallery.classList.add("somos-reflow-gallery-solo-inline");
      }
    }
    section.appendChild(gallery);
  }

  function appendUnusedImageDescriptions(section, root, texts, usedIds) {
    root.querySelectorAll("img[data-id]").forEach(function (image) {
      var id = image.dataset.id;
      var description = normalizedText(texts[id]);
      if (!description || usedIds.has(id)) return;
      var paragraph = document.createElement("p");
      paragraph.className = "somos-reflow-image-description";
      paragraph.dataset.id = id;
      paragraph.textContent = description;
      section.appendChild(paragraph);
      usedIds.add(id);
    });
  }

  function headingNode(nodes, title) {
    var titleKey = comparableText(title);
    var exact = nodes.find(function (node) {
      var key = comparableText(extractedText(node));
      return key === titleKey || key.indexOf(titleKey) === 0 || titleKey.indexOf(key) === 0;
    });
    if (exact) return exact;
    return nodes.slice().sort(function (a, b) { return sourceFontSize(b) - sourceFontSize(a); })[0] || null;
  }

  function composeRightsSection(section, nodes, titleNode, usedIds) {
    var grid = document.createElement("div");
    grid.className = "somos-reflow-rights-grid";
    [
      { title: "Mis derechos en el entorno digital", side: "left" },
      { title: "Mis deberes en el entorno digital", side: "right" }
    ].forEach(function (spec) {
      var card = document.createElement("section");
      card.className = "somos-reflow-rights-card";
      var heading = document.createElement("h3");
      heading.className = "somos-reflow-subheading";
      heading.textContent = spec.title;
      card.appendChild(heading);
      var list = document.createElement("ul");
      list.className = "somos-reflow-list";
      nodes.filter(function (node) {
        if (node === titleNode || usedIds.has(node.dataset.id)) return false;
        var pos = visualPosition(node);
        if (pos.top < 170) return false;
        return spec.side === "left" ? pos.left < 297 : pos.left >= 297;
      }).forEach(function (node) {
        var item = document.createElement("li");
        var copy = makeSemanticText(node, "span", "");
        item.appendChild(copy);
        list.appendChild(item);
        usedIds.add(node.dataset.id);
      });
      card.appendChild(list);
      grid.appendChild(card);
    });
    section.appendChild(grid);
  }

  function composeQuiz(source, sectionId) {
    var quiz = document.importNode(source, true);
    quiz.removeAttribute("id");
    quiz.classList.add("somos-reflow-section", "somos-reflow-quiz");
    quiz.dataset.sectionId = sectionId;
    return quiz;
  }

  function composeSection(doc, entry, tocEntry, texts) {
    var root = sourceRoot(doc, entry.section_id);
    if (!root) throw new Error("No se encontró la sección " + entry.section_id);
    if (root.matches('[data-section-type="activity_quiz"]')) return composeQuiz(root, entry.section_id);

    var section = document.createElement("section");
    section.className = "somos-reflow-section";
    section.dataset.sectionId = entry.section_id;
    section.dataset.sourceHref = entry.href;
    if (entry.section_id === "pg001_sec001") section.classList.add("somos-reflow-cover");
    var nodes = textNodes(root);
    var title = tocEntry && tocEntry.title ? tocEntry.title : "";
    var titleNode = title ? headingNode(nodes, title) : null;
    var usedIds = new Set();
    if (entry.section_id === "pg005_sec001") {
      composeGregariousSection(section, root);
      return section;
    }
    if (entry.section_id === "pg006_sec001") {
      composeCitizenshipTimeline(section, root);
      return section;
    }
    if (entry.section_id === "pg001_sec001") {
      if (titleNode) usedIds.add(titleNode.dataset.id);
    } else if (titleNode) {
      section.appendChild(makeSemanticText(titleNode, "h2", "somos-reflow-heading"));
      usedIds.add(titleNode.dataset.id);
    } else if (title) {
      var generated = document.createElement("h2");
      generated.className = "somos-reflow-heading";
      generated.textContent = title;
      section.appendChild(generated);
    }

    var galleryImages = imageNodes(root, entry.section_id);
    var bannerLabels = collectBannerLabels(galleryImages, nodes, texts);

    if (entry.section_id === "pg026027_sec001") {
      composeRightsSection(section, nodes, titleNode, usedIds);
    } else {
      nodes.forEach(function (node) {
        if (usedIds.has(node.dataset.id)) return;
        if (bannerLabels.labelIds.has(node.dataset.id)) return;
        section.appendChild(makeSemanticText(node));
        usedIds.add(node.dataset.id);
      });
    }

    appendGallery(section, galleryImages, texts, usedIds, bannerLabels.byImageId);
    appendUnusedImageDescriptions(section, root, texts, usedIds);
    return section;
  }

  function pageWidth() { return Math.max(1, window.innerWidth); }

  function syncPrimaryToolbar() {
    var counter = document.getElementById("somos-page-status");
    var previous = document.getElementById("somos-previous");
    var next = document.getElementById("somos-next");
    if (counter) counter.textContent = (state.current + 1) + " / " + state.total;
    if (previous) previous.disabled = state.current <= 0;
    if (next) next.disabled = state.current >= state.total - 1;
  }

  function syncActiveQuizFlag() {
    var activeSection = null;
    for (var i = 0; i < state.sections.length; i++) {
      if (state.sections[i].dataset.sectionId === state.currentSectionId) {
        activeSection = state.sections[i];
        break;
      }
    }
    var isQuiz = !!(activeSection && (
      activeSection.classList.contains("somos-reflow-quiz") ||
      activeSection.matches('[data-section-type="activity_quiz"]')
    ));
    if (isQuiz) {
      document.documentElement.dataset.somosActiveQuiz = "true";
    } else {
      delete document.documentElement.dataset.somosActiveQuiz;
    }
  }

  function updatePagination() {
    if (!state.active || !content) return;
    state.total = Math.max(1, Math.ceil((content.scrollWidth - 1) / pageWidth()));
    state.current = Math.max(0, Math.min(state.total - 1, Math.round(content.scrollLeft / pageWidth())));
    document.documentElement.dataset.somosReflowCurrent = String(state.current + 1);
    document.documentElement.dataset.somosReflowTotal = String(state.total);
    syncPrimaryToolbar();
    if (!state.resizeAnchorId) {
      var currentSection = state.sections.filter(function (section) {
        return Array.prototype.some.call(section.getClientRects(), function (rect) {
          return rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0;
        });
      }).pop() || state.sections.reduce(function (match, section) {
        var firstRect = section.getClientRects()[0];
        var firstPage = firstRect
          ? Math.floor((firstRect.left + content.scrollLeft) / pageWidth())
          : 0;
        return firstPage <= state.current ? section : match;
      }, state.sections[0]);
      if (currentSection && currentSection.dataset.sectionId) {
        state.currentSectionId = currentSection.dataset.sectionId;
        history.replaceState(null, "", "#" + encodeURIComponent(currentSection.dataset.sectionId));
      }
    }
    syncActiveQuizFlag();
    window.dispatchEvent(new CustomEvent("somos:reflow-pagechange", {
      detail: { current: state.current + 1, total: state.total }
    }));
  }

  function goToPage(index, instant) {
    if (!state.active || !content) return;
    state.current = Math.max(0, Math.min(state.total - 1, index));
    if (instant) {
      var previousBehavior = content.style.scrollBehavior;
      content.style.scrollBehavior = "auto";
      content.scrollLeft = state.current * pageWidth();
      updatePagination();
      requestAnimationFrame(function () {
        content.style.scrollBehavior = previousBehavior;
      });
    } else {
      content.scrollTo({ left: state.current * pageWidth(), behavior: "smooth" });
      window.setTimeout(updatePagination, 260);
    }
  }

  function goToSection(sectionId, instant) {
    var section = state.sections.find(function (item) { return item.dataset.sectionId === sectionId; });
    if (!section) return;
    var firstRect = section.getClientRects()[0];
    var absoluteLeft = firstRect ? firstRect.left + content.scrollLeft : section.offsetLeft;
    goToPage(Math.floor(absoluteLeft / pageWidth()), instant);
  }

  function installApi() {
    window.__somosReflow = {
      active: true,
      get current() { return state.current + 1; },
      get total() { return state.total; },
      previous: function () { goToPage(state.current - 1, true); },
      next: function () { goToPage(state.current + 1, true); },
      goToSection: function (id) { goToSection(id, false); },
      refresh: updatePagination
    };
    document.addEventListener("somos:reflow-previous", function () {
      goToPage(state.current - 1, true);
    });
    document.addEventListener("somos:reflow-next", function () {
      goToPage(state.current + 1, true);
    });
  }

  function installKeyboardNavigation() {
    document.addEventListener("keydown", function (event) {
      if (!state.active || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var target = event.target && event.target.closest ? event.target : null;
      if (target && target.closest([
        "input", "textarea", "select", "button", "form",
        "[contenteditable='true']", "[data-activity-item]",
        "[role='radio']", "[role='slider']",
        "#somos-primary-toolbar", "#somos-tts-player",
        ".somos-native-menu-panel", "[role='dialog']", "[role='menu']"
      ].join(", "))) return;
      if (document.querySelector(".somos-native-menu-panel")) return;

      var destination = null;
      if (event.key === "ArrowRight" || event.key === "PageDown") destination = state.current + 1;
      else if (event.key === "ArrowLeft" || event.key === "PageUp") destination = state.current - 1;
      else if (event.key === "Home") destination = 0;
      else if (event.key === "End") destination = state.total - 1;
      else return;

      event.preventDefault();
      event.stopImmediatePropagation();
      goToPage(destination, true);
    }, true);
  }

  function installResponsiveExit(pages) {
    reflowMedia.addEventListener("change", function (event) {
      if (event.matches) return;
      var id = state.currentSectionId || initialSectionId;
      location.replace(directPageUrl(id, pages));
    });
  }

  function installResponsiveEntry() {
    reflowMedia.addEventListener("change", function (event) {
      if (!event.matches || state.active) return;
      setResponsiveViewport();
      if (isIndex) location.reload();
      else location.replace("./index.html#" + encodeURIComponent(initialSectionId));
    });
  }

  async function bootReflow() {
    state.active = true;
    setResponsiveViewport();
    document.documentElement.dataset.somosReflow = "true";
    document.documentElement.dataset.somosReflowBuild = SCRIPT_VERSION;
    document.body.classList.add("somos-reflow-book");
    var loading = document.createElement("div");
    loading.id = "somos-reflow-loading";
    loading.setAttribute("role", "status");
    loading.textContent = "Preparando el libro adaptable…";
    document.body.appendChild(loading);

    var catalogues = await Promise.all([
      fetch("./content/pages.json?v=" + SCRIPT_VERSION).then(function (response) { return response.json(); }),
      fetch("./content/toc.json?v=" + SCRIPT_VERSION).then(function (response) { return response.json(); }),
      fetch("./content/i18n/es-UY/texts.json?v=" + SCRIPT_VERSION).then(function (response) { return response.json(); })
    ]);
    var pages = catalogues[0];
    var toc = catalogues[1];
    var texts = catalogues[2];
    var hashId = decodeURIComponent(location.hash.slice(1)) || initialSectionId;
    state.initialTarget = hashId;
    var sources = await Promise.all(pages.map(function (entry) {
      return fetch("./" + entry.href + "?v=" + SCRIPT_VERSION).then(function (response) {
        if (!response.ok) throw new Error("No se pudo cargar " + entry.href);
        return response.text();
      }).then(function (html) { return new DOMParser().parseFromString(html, "text/html"); });
    }));

    content = document.getElementById("content");
    content.replaceChildren();
    pages.forEach(function (entry, index) {
      var tocEntry = toc.find(function (item) { return item.section_id === entry.section_id; });
      content.appendChild(composeSection(sources[index], entry, tocEntry, texts));
    });
    state.sections = Array.prototype.slice.call(content.children);
    installApi();
    installKeyboardNavigation();
    installResponsiveExit(pages);
    function reanchorReflow(anchorId) {
      var anchor = anchorId || state.currentSectionId || decodeURIComponent(location.hash.slice(1));
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          state.total = Math.max(1, Math.ceil((content.scrollWidth - 1) / pageWidth()));
          document.documentElement.dataset.somosReflowTotal = String(state.total);
          if (anchor) goToSection(anchor, true);
          updatePagination();
        });
      });
    }
    var ttsReserveState = document.documentElement.getAttribute("data-somos-tts-active");
    new MutationObserver(function () {
      var next = document.documentElement.getAttribute("data-somos-tts-active");
      if (next === ttsReserveState) return;
      ttsReserveState = next;
      var anchor = state.currentSectionId || decodeURIComponent(location.hash.slice(1));
      window.clearTimeout(state.ttsReserveTimer);
      state.ttsReserveTimer = window.setTimeout(function () { reanchorReflow(anchor); }, 60);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-somos-tts-active"] });
    if (typeof ResizeObserver === "function") {
      var sectionResizeObserver = new ResizeObserver(function () {
        if (!state.reflowReady || state.resizeAnchorId) return;
        window.clearTimeout(state.contentResizeTimer);
        state.contentResizeTimer = window.setTimeout(function () {
          reanchorReflow(state.currentSectionId);
        }, 90);
      });
      state.sections.forEach(function (section) {
        if (section.classList.contains("somos-reflow-quiz")) sectionResizeObserver.observe(section);
      });
    }
    content.addEventListener("scroll", function () {
      window.clearTimeout(state.scrollTimer);
      state.scrollTimer = window.setTimeout(updatePagination, 80);
    }, { passive: true });
    window.addEventListener("resize", function () {
      if (!state.resizeAnchorId) {
        state.resizeAnchorId = state.currentSectionId || decodeURIComponent(location.hash.slice(1));
      }
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(function () {
        var anchor = state.resizeAnchorId;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            state.total = Math.max(1, Math.ceil((content.scrollWidth - 1) / pageWidth()));
            if (anchor) goToSection(anchor, true);
            state.resizeAnchorId = "";
            updatePagination();
          });
        });
      }, 180);
    });
    loading.remove();
    await new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); });
    state.total = Math.max(1, Math.ceil((content.scrollWidth - 1) / pageWidth()));
    document.documentElement.dataset.somosReflowTotal = String(state.total);
    goToSection(hashId, true);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { state.reflowReady = true; });
    });
    return pages;
  }

  async function boot() {
    try {
      installResponsiveEntry();
      if (reflowMedia.matches && !isIndex) {
        setResponsiveViewport();
        location.replace("./index.html#" + encodeURIComponent(initialSectionId));
        return;
      }
      if (reflowMedia.matches && isIndex) await bootReflow();
      await loadScript(projectScript);
      await loadScript(runtimeScript);
      if (state.active) {
        window.setTimeout(function () {
          updatePagination();
          if (state.initialTarget) goToSection(state.initialTarget, true);
        }, 160);
      }
    } catch (error) {
      console.error("No se pudo preparar el lector adaptable.", error);
      var loading = document.getElementById("somos-reflow-loading");
      if (loading) loading.textContent = "No se pudo preparar el libro adaptable.";
      await loadScript(projectScript).catch(function () {});
      await loadScript(runtimeScript).catch(function () {});
    }
  }

  boot();
})();
