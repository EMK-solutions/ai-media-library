/**
 * Self-contained TV broadcast client (PIN gate + slideshow).
 * Served inline by the local HTTP server so it works in `pnpm dev`
 * without a Vite build, and on Smart TV browsers that struggle with ES modules.
 */
export function buildTvBroadcastClientHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TV Broadcast</title>
  <style>
    :root {
      --bg: #0b1220;
      --fg: #e2e8f0;
      --muted: #94a3b8;
      --card: rgba(15, 23, 42, 0.95);
      --border: rgba(148, 163, 184, 0.35);
      --primary: #3b82f6;
      --danger: #f87171;
      --rail: 280px;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      background: var(--bg);
      color: var(--fg);
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }
    #app { width: 100%; height: 100%; }
    .pin-wrap {
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
    }
    .card {
      width: min(480px, 100%);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      background: var(--card);
    }
    h1 { margin: 0; font-size: 28px; }
    .hint { margin-top: 12px; line-height: 1.5; color: var(--muted); }
    label { display: block; margin-top: 20px; }
    label span { display: block; margin-bottom: 8px; }
    #pin {
      width: 100%;
      font-size: 28px;
      letter-spacing: 8px;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid #475569;
      background: #0f172a;
      color: #f8fafc;
    }
    #openBtn {
      margin-top: 20px;
      width: 100%;
      min-height: 52px;
      font-size: 18px;
      border-radius: 10px;
      border: none;
      background: var(--primary);
      color: #fff;
      cursor: pointer;
    }
    #openBtn:focus, #pin:focus, button:focus {
      outline: 3px solid #93c5fd;
      outline-offset: 2px;
    }
    .error { margin-top: 16px; color: var(--danger); }
    .viewer {
      display: none;
      width: 100%;
      height: 100%;
      grid-template-columns: var(--rail) 1fr;
    }
    .viewer.on { display: grid; }
    .rail {
      height: 100%;
      overflow: auto;
      padding: 10px;
      border-right: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.7);
    }
    .thumb {
      position: relative;
      display: block;
      width: 100%;
      height: 160px;
      margin-bottom: 8px;
      border: none;
      padding: 0;
      border-radius: 6px;
      overflow: hidden;
      background: #1e293b;
      cursor: pointer;
      opacity: 0.75;
    }
    .thumb.active {
      opacity: 1;
      box-shadow: 0 0 0 2px var(--primary);
    }
    .thumb img, .thumb video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      image-orientation: from-image;
    }
    .thumb-play {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 44px;
      height: 44px;
      margin: -22px 0 0 -22px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      box-shadow: 0 0 0 2px rgba(226, 232, 240, 0.35);
    }
    .thumb-play svg {
      width: 18px;
      height: 18px;
      margin-left: 2px;
      fill: #f8fafc;
      stroke: none;
    }
    .main {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      min-width: 0;
      min-height: 0;
      width: 100%;
      height: 100%;
      background: var(--bg);
    }
    #stage {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      min-width: 0;
      min-height: 0;
    }
    .stage-layer {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.8s ease-in-out;
      /* Never steal clicks from the overlay chrome (Play/Pause, nav). */
      pointer-events: none;
      z-index: 1;
    }
    .stage-layer.visible {
      opacity: 1;
      z-index: 2;
    }
    .stage-layer.leaving {
      opacity: 0;
      z-index: 1;
    }
    .stage-layer.no-anim {
      transition: none;
    }
    .media {
      display: block;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      image-orientation: from-image;
    }
    .media.fit-cover {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .media.fit-contain {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .video-shell {
      position: relative;
      flex-shrink: 0;
      overflow: hidden;
      background: #000;
      /* Video element needs hit-testing for native controls. */
      pointer-events: auto;
      z-index: 1;
    }
    .video-shell > video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      background: #000;
    }
    .controls {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 30;
    }
    .topbar {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: auto;
      gap: 8px;
    }
    .topbar-left, .topbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ctrl {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      min-height: 48px;
      padding: 0;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.85);
      color: var(--fg);
      cursor: pointer;
      pointer-events: auto;
    }
    .ctrl svg {
      width: 18px;
      height: 18px;
      display: block;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      min-width: 56px;
      min-height: 56px;
    }
    .nav svg { width: 22px; height: 22px; }
    .nav.prev { left: 12px; }
    .nav.next { right: 12px; }
    .hidden { display: none !important; }
    .playing .rail { display: none; }
    .playing .viewer { grid-template-columns: 1fr; }
    .playing .nav,
    .playing .fullscreen-btn,
    .playing #counter { display: none !important; }
  </style>
</head>
<body>
  <div id="app">
    <div id="pinScreen" class="pin-wrap">
      <div class="card">
        <h1>TV Broadcast</h1>
        <p class="hint" id="pinHint">Enter the 4-digit PIN shown in AI Media Library on your computer.</p>
        <label>
          <span>PIN</span>
          <input id="pin" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="one-time-code" aria-label="Broadcast PIN" autofocus />
        </label>
        <button id="openBtn" type="button">Open album</button>
        <p id="pinError" class="error" role="alert" hidden></p>
      </div>
    </div>
    <div id="viewer" class="viewer" aria-live="polite">
      <div class="rail" id="rail"></div>
      <div class="main">
        <div id="stage"></div>
        <div class="controls">
          <div class="topbar">
            <div class="topbar-left">
              <button class="ctrl" id="playBtn" type="button" aria-label="Play slideshow"></button>
              <button class="ctrl fullscreen-btn" id="fullscreenBtn" type="button" aria-label="Enter fullscreen"></button>
            </div>
            <div class="topbar-right">
              <span id="counter" style="color:var(--muted)"></span>
            </div>
          </div>
          <button class="ctrl nav prev" id="prevBtn" type="button" aria-label="Previous item"></button>
          <button class="ctrl nav next" id="nextBtn" type="button" aria-label="Next item"></button>
        </div>
      </div>
    </div>
  </div>
  <script>
(function () {
  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
  var ICON_MAX = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
  var ICON_MIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
  var ICON_PREV = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>';

  var items = [];
  var index = 0;
  var playing = false;
  var isFullscreen = false;
  var timer = null;
  var PHOTO_MS = 4000;
  var preloadCache = {};
  var renderToken = 0;

  var pinScreen = document.getElementById("pinScreen");
  var viewer = document.getElementById("viewer");
  var pinInput = document.getElementById("pin");
  var pinError = document.getElementById("pinError");
  var openBtn = document.getElementById("openBtn");
  var rail = document.getElementById("rail");
  var stage = document.getElementById("stage");
  var playBtn = document.getElementById("playBtn");
  var fullscreenBtn = document.getElementById("fullscreenBtn");
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");
  var counter = document.getElementById("counter");
  var appRoot = document.getElementById("app");

  playBtn.innerHTML = ICON_PLAY;
  fullscreenBtn.innerHTML = ICON_MAX;
  prevBtn.innerHTML = ICON_PREV;
  nextBtn.innerHTML = ICON_NEXT;

  function showError(msg) {
    pinError.hidden = !msg;
    pinError.textContent = msg || "";
  }

  function updateFullscreenButton() {
    isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    fullscreenBtn.innerHTML = isFullscreen ? ICON_MIN : ICON_MAX;
    fullscreenBtn.setAttribute(
      "aria-label",
      isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
    );
  }

  function toggleFullscreen() {
    var target = appRoot || document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      return;
    }
    if (target.requestFullscreen) target.requestFullscreen().catch(function () {});
    else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
  }

  function clearAdvanceTimer() {
    clearTimeout(timer);
    timer = null;
  }

  function stopStageVideoHandlers() {
    var video = stage.querySelector("video");
    if (!video) return;
    video.onended = null;
    try { video.pause(); } catch (e) {}
  }

  function setPlaying(next) {
    playing = next;
    document.body.classList.toggle("playing", playing);
    playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    playBtn.setAttribute("aria-label", playing ? "Pause slideshow" : "Play slideshow");
    clearAdvanceTimer();
    if (!playing) {
      stopStageVideoHandlers();
      return;
    }
    scheduleNext();
  }

  function scheduleNext() {
    clearAdvanceTimer();
    if (!playing) return;
    var item = items[index];
    if (!item) return;
    if (item.mediaKind === "video") {
      var video = stage.querySelector("video");
      if (video) {
        video.onended = function () { go(1); };
        video.play().catch(function () {});
      }
      return;
    }
    timer = setTimeout(function () { go(1); }, PHOTO_MS);
  }

  function go(delta) {
    if (!items.length) return;
    clearAdvanceTimer();
    stopStageVideoHandlers();
    index = (index + delta + items.length) % items.length;
    render();
    if (playing) scheduleNext();
  }

  function goTo(i) {
    if (!items.length) return;
    clearAdvanceTimer();
    stopStageVideoHandlers();
    index = i;
    render();
    if (playing) scheduleNext();
  }

  var MAX_UPSCALE = 1.5;
  var COVER_AR_THRESHOLD = 0.15;

  function getFrameSize() {
    var w = stage.clientWidth || 0;
    var h = stage.clientHeight || 0;
    if (w <= 0 || h <= 0) {
      var main = stage.parentElement;
      if (main) {
        w = main.clientWidth || 0;
        h = main.clientHeight || 0;
      }
    }
    return { width: w, height: h };
  }

  function applyVideoShellFit(shell, video) {
    var frame = getFrameSize();
    var displayW = video.videoWidth || 0;
    var displayH = video.videoHeight || 0;
    if (!frame.width || !frame.height || !displayW || !displayH) {
      shell.style.width = "100%";
      shell.style.height = "100%";
      return;
    }
    var scale = Math.min(frame.width / displayW, frame.height / displayH);
    if (scale > MAX_UPSCALE) scale = MAX_UPSCALE;
    shell.style.width = Math.round(displayW * scale) + "px";
    shell.style.height = Math.round(displayH * scale) + "px";
  }

  /** Same rules as packages/media-viewer resolveMainImageFit. */
  function applyImageFit(el, naturalWidth, naturalHeight) {
    var frame = getFrameSize();
    el.className = "media";
    el.style.width = "";
    el.style.height = "";
    el.style.maxWidth = "";
    el.style.maxHeight = "";
    el.style.objectFit = "";
    el.style.transform = "";

    if (!frame.width || !frame.height || !naturalWidth || !naturalHeight) {
      el.classList.add("fit-contain");
      return;
    }

    var containScale = Math.min(frame.width / naturalWidth, frame.height / naturalHeight);
    var imageAr = naturalWidth / naturalHeight;
    var frameAr = frame.width / frame.height;
    var mismatch = Math.abs(imageAr - frameAr) / frameAr;

    if (containScale > MAX_UPSCALE) {
      el.style.width = Math.round(naturalWidth * MAX_UPSCALE) + "px";
      el.style.height = Math.round(naturalHeight * MAX_UPSCALE) + "px";
      el.style.objectFit = "contain";
      return;
    }

    if (mismatch < COVER_AR_THRESHOLD) {
      el.classList.add("fit-cover");
      return;
    }

    el.classList.add("fit-contain");
  }

  function stageImageUrl(item) {
    return item.previewUrl || item.mediaUrl;
  }

  function preloadImageUrl(url) {
    if (!url || preloadCache[url]) return preloadCache[url] || null;
    var im = new Image();
    im.decoding = "async";
    im.src = url;
    preloadCache[url] = im;
    return im;
  }

  function preloadAround(center) {
    if (!items.length) return;
    for (var d = -1; d <= 2; d++) {
      var i = (center + d + items.length) % items.length;
      var item = items[i];
      if (item && item.mediaKind === "image") {
        preloadImageUrl(stageImageUrl(item));
      }
    }
  }

  function pruneStageLayers(keepEl) {
    var layers = stage.querySelectorAll(".stage-layer");
    for (var i = 0; i < layers.length; i++) {
      if (layers[i] !== keepEl) layers[i].parentNode.removeChild(layers[i]);
    }
  }

  function showImageSmooth(item) {
    var token = ++renderToken;
    var url = stageImageUrl(item);
    var layer = document.createElement("div");
    layer.className = "stage-layer";
    var img = document.createElement("img");
    img.className = "media fit-contain";
    img.alt = item.name || "Image";
    img.src = url;
    layer.appendChild(img);
    stage.appendChild(layer);
    preloadAround(index);

    function reveal() {
      if (token !== renderToken) return;
      applyImageFit(img, img.naturalWidth || 0, img.naturalHeight || 0);
      var previous = stage.querySelectorAll(".stage-layer.visible");
      if (!previous.length) {
        layer.classList.add("no-anim");
        layer.classList.add("visible");
        pruneStageLayers(layer);
        layer.classList.remove("no-anim");
        return;
      }
      for (var p = 0; p < previous.length; p++) {
        previous[p].classList.remove("visible");
        previous[p].classList.add("leaving");
      }
      void layer.offsetWidth;
      layer.classList.add("visible");
      window.setTimeout(function () {
        if (token !== renderToken) return;
        pruneStageLayers(layer);
      }, 850);
    }

    var cached = preloadCache[url];
    if ((cached && cached.complete && cached.naturalWidth) || (img.complete && img.naturalWidth)) {
      reveal();
    } else {
      img.onload = reveal;
      img.onerror = function () {
        if (token !== renderToken) return;
        // Fall back to full media URL once if preview fails.
        if (url !== item.mediaUrl) {
          img.src = item.mediaUrl;
          return;
        }
        layer.classList.add("visible");
      };
    }
  }

  function mountVideo(item) {
    renderToken += 1;
    stage.innerHTML = "";
    var shell = document.createElement("div");
    shell.className = "video-shell";
    var video = document.createElement("video");
    // Server bakes MP4 rotation into upright pixels for Smart TVs that ignore CSS transforms.
    video.src = item.mediaUrl;
    video.controls = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("aria-label", item.name || "Video");
    shell.appendChild(video);
    stage.appendChild(shell);

    function fit() {
      applyVideoShellFit(shell, video);
    }
    if (video.readyState >= 1 && video.videoWidth) fit();
    else video.onloadedmetadata = fit;

    if (playing) {
      video.play().catch(function () {});
      video.onended = function () { go(1); };
    }
  }

  function updateRail() {
    var thumbs = rail.querySelectorAll(".thumb");
    for (var t = 0; t < thumbs.length; t++) {
      thumbs[t].classList.toggle("active", t === index);
    }
    if (!playing && thumbs[index]) {
      thumbs[index].scrollIntoView({ block: "nearest" });
    }
  }

  function render() {
    if (!items.length) return;
    var item = items[index];
    counter.textContent = (index + 1) + " / " + items.length;
    if (item.mediaKind === "video") {
      mountVideo(item);
    } else {
      // Keep the previous image visible until the next layer has loaded (no black flash).
      showImageSmooth(item);
    }
    updateRail();
  }

  window.addEventListener("resize", function () {
    var item = items[index];
    if (!item) return;
    if (item.mediaKind === "video") {
      var shell = stage.querySelector(".video-shell");
      var video = stage.querySelector("video");
      if (shell && video) applyVideoShellFit(shell, video);
      return;
    }
    var imgs = stage.querySelectorAll(".stage-layer.visible .media");
    for (var i = 0; i < imgs.length; i++) {
      applyImageFit(imgs[i], imgs[i].naturalWidth || 0, imgs[i].naturalHeight || 0);
    }
  });

  var ICON_PLAY_BADGE = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';

  function buildRail() {
    rail.innerHTML = "";
    for (var i = 0; i < items.length; i++) {
      (function (i) {
        var item = items[i];
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "thumb" + (i === index ? " active" : "") + (item.mediaKind === "video" ? " video" : "");
        btn.setAttribute("aria-label", "Go to item " + (i + 1));
        var im = document.createElement("img");
        im.src = item.thumbUrl || item.mediaUrl;
        im.alt = "";
        im.loading = "lazy";
        im.decoding = "async";
        btn.appendChild(im);
        if (item.mediaKind === "video") {
          var badge = document.createElement("span");
          badge.className = "thumb-play";
          badge.setAttribute("aria-hidden", "true");
          badge.innerHTML = ICON_PLAY_BADGE;
          btn.appendChild(badge);
        }
        btn.onclick = function () {
          setPlaying(false);
          goTo(i);
        };
        rail.appendChild(btn);
      })(i);
    }
  }

  function openViewer(playlist) {
    items = playlist.items || [];
    index = 0;
    pinScreen.classList.add("hidden");
    viewer.classList.add("on");
    buildRail();
    preloadAround(0);
    render();
    setPlaying(true);
    // Match desktop TV mode: start slideshow in fullscreen when the album opens.
    // May be ignored by some browsers without a recent user gesture (e.g. PIN submit).
    toggleFullscreen();
  }

  function loadPlaylist() {
    return fetch("/api/playlist", { credentials: "include" })
      .then(function (res) {
        if (!res.ok) throw new Error("Could not load playlist.");
        return res.json();
      })
      .then(function (body) {
        if (!body.items || !body.items.length) throw new Error("Album is empty.");
        openViewer(body);
      });
  }

  function submitPin() {
    var pin = (pinInput.value || "").replace(/\\D/g, "").slice(0, 4);
    pinInput.value = pin;
    showError("");
    if (pin.length !== 4) {
      showError("Enter the 4-digit PIN.");
      return;
    }
    openBtn.disabled = true;
    openBtn.textContent = "Opening…";
    fetch("/api/auth", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pin })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Incorrect PIN. Try again.");
        return loadPlaylist();
      })
      .catch(function (err) {
        showError(err.message || "Could not reach the desktop app.");
        openBtn.disabled = false;
        openBtn.textContent = "Open album";
      });
  }

  openBtn.onclick = submitPin;
  pinInput.onkeydown = function (e) {
    if (e.key === "Enter") submitPin();
  };
  playBtn.onclick = function () { setPlaying(!playing); };
  fullscreenBtn.onclick = function () { toggleFullscreen(); };
  prevBtn.onclick = function () { setPlaying(false); go(-1); };
  nextBtn.onclick = function () { setPlaying(false); go(1); };

  document.addEventListener("fullscreenchange", updateFullscreenButton);
  document.addEventListener("webkitfullscreenchange", updateFullscreenButton);

  document.addEventListener("keydown", function (e) {
    if (!viewer.classList.contains("on")) return;
    if (e.key === "ArrowRight") { setPlaying(false); go(1); }
    if (e.key === "ArrowLeft") { setPlaying(false); go(-1); }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setPlaying(!playing);
    }
    if (e.key === "f" || e.key === "F") {
      toggleFullscreen();
    }
  });

  fetch("/api/status", { credentials: "include" })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (body) {
      if (!body) return;
      if (body.requirePin === false || body.authenticated) {
        return loadPlaylist().catch(function (err) {
          showError(err.message || "Could not load album.");
        });
      }
    })
    .catch(function () {});
})();
  </script>
</body>
</html>`;
}
