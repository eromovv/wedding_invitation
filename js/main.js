(function () {
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  function scrollToTop() {
    window.scrollTo(0, 0);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scrollToTop);
  } else {
    scrollToTop();
  }
  window.addEventListener("load", scrollToTop);
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) scrollToTop();
  });
})();

(function () {
  var btn = document.getElementById("musicBtn");
  var audio = document.getElementById("bgMusic");
  if (!btn || !audio) return;

  var sources = audio.querySelectorAll("source");
  var hasSrc = false;
  for (var i = 0; i < sources.length; i++) {
    if (sources[i].getAttribute("src")) {
      hasSrc = true;
      break;
    }
  }

  if (!hasSrc) {
    btn.disabled = true;
    btn.setAttribute("aria-label", "Музыка: добавьте файл в audio source в index.html");
    btn.style.opacity = "0.45";
    btn.style.cursor = "not-allowed";
    return;
  }

  var STORAGE_KEY = "card-bg-music-t";
  var lastPersistMs = 0;
  var resumeOnInput = null;
  var ignoreNextButtonClick = false;

  function removeResumeOnInput() {
    if (resumeOnInput) {
      window.removeEventListener("pointerdown", resumeOnInput, true);
      resumeOnInput = null;
    }
  }

  function registerResumeOnInput() {
    if (resumeOnInput) return;
    resumeOnInput = function (e) {
      var onBtn = btn && (e.target === btn || (btn.contains && btn.contains(e.target)));
      removeResumeOnInput();
      var p = audio.play();
      if (p !== undefined) {
        p.then(function () {
          btn.setAttribute("aria-pressed", "true");
          if (onBtn) ignoreNextButtonClick = true;
        }).catch(function () {
          btn.setAttribute("aria-pressed", "false");
          registerResumeOnInput();
        });
      } else {
        registerResumeOnInput();
      }
    };
    window.addEventListener("pointerdown", resumeOnInput, true);
  }

  function isPageReload() {
    var list = performance.getEntriesByType && performance.getEntriesByType("navigation");
    var nav = list && list[0];
    if (nav && nav.type) return nav.type === "reload";
    if (performance.navigation) return performance.navigation.type === 1;
    return false;
  }

  function readSavedTime() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw == null) return NaN;
      return parseFloat(raw);
    } catch (e) {
      return NaN;
    }
  }

  function persistTime() {
    if (audio.ended) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(audio.currentTime));
    } catch (e) {}
  }

  function persistTimeThrottled() {
    var now = Date.now();
    if (now - lastPersistMs < 800) return;
    lastPersistMs = now;
    persistTime();
  }

  function applyStartPosition(then) {
    function go() {
      if (isPageReload()) {
        var t = readSavedTime();
        if (!isNaN(t) && t > 0) {
          var d = audio.duration;
          if (!isNaN(d) && d > 0) t = Math.min(t, Math.max(0, d - 0.2));
          audio.currentTime = t;
        } else {
          audio.currentTime = 0;
        }
      } else {
        audio.currentTime = 0;
      }
      if (then) then();
    }
    if (audio.readyState >= 1) {
      go();
    } else {
      audio.addEventListener("loadedmetadata", go, { once: true });
    }
  }

  btn.addEventListener("click", function () {
    removeResumeOnInput();
    if (ignoreNextButtonClick) {
      ignoreNextButtonClick = false;
      return;
    }
    var pressed = btn.getAttribute("aria-pressed") === "true";
    if (pressed) {
      audio.pause();
      btn.setAttribute("aria-pressed", "false");
    } else {
      audio.play().then(function () {
        btn.setAttribute("aria-pressed", "true");
      }).catch(function () {
        btn.setAttribute("aria-pressed", "false");
        registerResumeOnInput();
      });
    }
  });

  audio.addEventListener("pause", function () {
    if (!audio.ended) {
      persistTime();
      if (typeof document === "undefined" || !document.hidden) {
        btn.setAttribute("aria-pressed", "false");
      }
    }
  });

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) return;
      btn.setAttribute("aria-pressed", audio.ended || audio.paused ? "false" : "true");
    });
  }

  audio.addEventListener("play", function () {
    btn.setAttribute("aria-pressed", "true");
  });

  audio.addEventListener("timeupdate", persistTimeThrottled);

  audio.addEventListener("ended", function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  });

  window.addEventListener("pagehide", function () {
    if (!audio.ended) persistTime();
  });

  function tryPlayAfterStart() {
    try {
      audio.muted = false;
    } catch (e) {}
    var p = audio.play();
    if (p !== undefined) {
      p.then(function () {
        btn.setAttribute("aria-pressed", "true");
        removeResumeOnInput();
      }).catch(function () {
        btn.setAttribute("aria-pressed", "false");
        registerResumeOnInput();
      });
    } else {
      registerResumeOnInput();
    }
  }

  function startMusic() {
    applyStartPosition(tryPlayAfterStart);
  }

  if (document.readyState === "complete") {
    startMusic();
  } else {
    window.addEventListener("load", startMusic);
  }
})();

(function () {
  var section = document.getElementById("timeline");
  if (!section) return;

  var supportsView =
    typeof CSS !== "undefined" &&
    CSS.supports &&
    (CSS.supports("animation-timeline: view()") || CSS.supports("animation-timeline", "view()"));

  if (supportsView) return;

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          section.classList.add("timeline--fallback-inview");
          io.disconnect();
        }
      });
    },
    { root: null, threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  io.observe(section);
})();

(function () {
  var root = document.getElementById("pageHearts");
  if (!root) return;

  var heartSvg =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" d="M12 21.5c-4.2-3.8-7-6.6-7-10.2 0-2.8 2.1-5 4.8-5 1.9 0 3.4 1 4.2 2.4.8-1.4 2.3-2.4 4.2-2.4 2.7 0 4.8 2.2 4.8 5 0 3.6-2.8 6.4-7 10.2z"/></svg>'
    );

  var count = 44 + Math.floor(Math.random() * 17);
  var i;
  for (i = 0; i < count; i++) {
    var el = document.createElement("span");
    el.className = "page-heart";
    el.setAttribute("aria-hidden", "true");
    el.style.left = 2 + Math.random() * 96 + "%";
    el.style.top = 0.5 + Math.random() * 99 + "%";
    el.style.width = 9 + Math.random() * 12 + "px";
    el.style.height = el.style.width;
    el.style.backgroundImage = 'url("' + heartSvg + '")';
    el.style.opacity = String(0.09 + Math.random() * 0.16);
    el.style.transform =
      "translate(-50%,-50%) rotate(" + (Math.random() * 40 - 20).toFixed(1) + "deg) scale(" + (0.55 + Math.random() * 0.55).toFixed(2) + ")";
    root.appendChild(el);
  }
})();

(function () {
  var reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function reveal(el) {
    if (!el || el.classList.contains("is-revealed")) return;
    el.classList.add("is-revealed");
  }

  function setupScrollReveals() {
    if (reduce) {
      document.querySelectorAll(".scrollfx").forEach(reveal);
      return;
    }

    var list = document.querySelectorAll(".scrollfx[data-scrollfx]");
    if (!list.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { root: null, threshold: 0.14, rootMargin: "0px 0px -5% 0px" }
    );

    list.forEach(function (el) {
      io.observe(el);
    });
  }

  if (document.documentElement.classList.contains("is-intro")) {
    document.addEventListener("pageintroend", function onIntro() {
      document.removeEventListener("pageintroend", onIntro);
      setupScrollReveals();
    });
  } else {
    setupScrollReveals();
  }
})();

(function () {
  var main = document.querySelector("main.page");
  if (!main) {
    if (document.documentElement.classList.contains("is-intro")) {
      document.documentElement.classList.remove("is-intro");
    }
    document.dispatchEvent(new CustomEvent("pageintroend", { bubbles: true }));
    return;
  }

  var reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var kids = main.children;
  var n = kids.length;
  if (!n) {
    document.documentElement.classList.remove("is-intro");
    document.dispatchEvent(new CustomEvent("pageintroend", { bubbles: true }));
    return;
  }

  var baseMs = 820;
  var stepMs = 420;
  var tailMs = 2500;

  function endIntro() {
    document.documentElement.classList.remove("is-intro");
    document.dispatchEvent(new CustomEvent("pageintroend", { bubbles: true }));
  }

  if (reduce) {
    for (var r = 0; r < n; r++) {
      var w = kids[r];
      w.classList.add("is-intro-in");
      if (w.classList.contains("scrollfx")) w.classList.add("is-revealed");
    }
    endIntro();
    return;
  }

  for (var i = 0; i < n; i++) {
    (function (index) {
      setTimeout(function () {
        var el = kids[index];
        el.classList.add("is-intro-in");
        if (el.classList.contains("scrollfx")) el.classList.add("is-revealed");
        if (index === n - 1) {
          setTimeout(endIntro, tailMs);
        }
      }, baseMs + index * stepMs);
    })(i);
  }
})();
