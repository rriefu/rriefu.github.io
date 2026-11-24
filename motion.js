/* =========================================================
   motion.js — 健康服務評估及抗生素流行病學研究室網站的動態層（搭配 motion.css）
   效果配方取自 Motion Library（motion-library.html），依本站元素改寫；
   註解括號內是動態庫裡的 id。
   html.motion 不在時（使用者開啟了減少動態），只啟用功能性的「目錄跟讀」與「回頂按鈕」。
   ========================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  var motion = root.classList.contains('motion');
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var run = function (name, fn) { try { fn(); } catch (err) { console.error('[motion] ' + name, err); } };

  /* 和捲動有關的工作共用一個 requestAnimationFrame，每幀最多算一次 */
  var tasks = [], queued = 0;
  function flush() { queued = 0; tasks.forEach(function (f) { run('frame', f); }); }
  function request() { if (!queued) queued = requestAnimationFrame(flush); }
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);

  /* ---------- 先藏後現（lay-section-fadeup／crd-grid-cascade） ---------- */
  /* 清單要和 motion.css「先藏後現」那條規則一致 */
  var REVEAL = '.sec .label,.sec .title,.sec .desc,.about-grid>div>.card,.about-body>p,.about-body h3,.tl li,.chip,' +
    '.r-grid>*,.team-grid>*,#grants .card,.sub-label,.pub-item,.more-btn,.c-block,#contact>.xb-dog';

  function reveal() {
    /* 主視覺分三組，各自進畫面才播（手機上立牌與腳印在第一屏下方） */
    $$('#home .badge').forEach(function (el, i) { el.style.setProperty('--i', i); });
    $$('#home .paws img').forEach(function (el, i) { el.style.setProperty('--i', i); });
    var hero = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('m-on'); hero.unobserve(e.target); }
      });
    });
    $$('#home, #home .hero-visual, #home .paws').forEach(function (el) { hero.observe(el); });

    /* 同一批進畫面的元素依列、欄名次錯開 80ms（最多 480ms），只播一次 */
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      if (!batch.length) return;
      var rows = ranks(batch.map(function (e) { return e.boundingClientRect.top; }));
      var cols = ranks(batch.map(function (e) { return e.boundingClientRect.left; }));
      batch.forEach(function (e, i) {
        var el = e.target, d = Math.min(480, (rows[i] + cols[i]) * 80);
        io.unobserve(el);
        el.style.setProperty('--d', d + 'ms');
        el.classList.add('m-in');
        var year = el.classList.contains('pub-item') && el.querySelector('.pub-year');
        if (year) setTimeout(function () { run('flip', function () { flip(year); }); }, d + 220);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$(REVEAL).forEach(function (el) { io.observe(el); });
  }

  /* 位置相差 10px 內算同一列（欄），回傳每個值的名次 */
  function ranks(values) {
    var order = values.map(function (v, i) { return i; }).sort(function (a, b) { return values[a] - values[b]; });
    var out = [], rank = -1, prev = -Infinity;
    order.forEach(function (i) { if (values[i] - prev > 10) rank++; prev = values[i]; out[i] = rank; });
    return out;
  }

  /* ---------- 機場翻板（txt-solari-board）：年份每格先翻過幾個數字才停 ---------- */
  function flip(pill) {
    var text = pill.textContent, flap = document.createElement('span'), cells = [];
    flap.className = 'm-flap';
    flap.setAttribute('aria-hidden', 'true');   /* 原本的年份文字留在原處，讀屏軟體讀到的一直是正確年份 */
    for (var k = 0; k < text.length; k++) {
      var s = document.createElement('span');
      s.textContent = text[k];
      flap.appendChild(s);
      if (/\d/.test(text[k])) cells.push({ el: s, digit: text[k] });
    }
    if (!cells.length) return;
    pill.classList.add('m-flipping');
    pill.appendChild(flap);
    var left = cells.length;
    cells.forEach(function (c, k) {
      var flips = 3 + k % 3;
      c.el.textContent = String((+c.digit + 5) % 10);
      function step(n) {
        var last = n === flips;
        c.el.textContent = last ? c.digit : String(Math.floor(Math.random() * 10));
        if (c.el.animate) c.el.animate([{ transform: 'rotateX(-90deg)' }, { transform: 'none' }], { duration: 90, easing: 'ease-out' });
        if (!last) setTimeout(function () { step(n + 1); }, 90);
        else if (--left === 0) setTimeout(function () { flap.remove(); pill.classList.remove('m-flipping'); }, 120);
      }
      setTimeout(function () { step(1); }, k * 70);
    });
  }

  /* ---------- 螢光筆跟捲（txt-scroll-highlighter） ---------- */
  function highlight() {
    var marks = $$('.about-body strong'), seen = marks.map(function () { return 0; });
    tasks.push(function () {
      var vh = innerHeight;
      marks.forEach(function (m, i) {
        if (seen[i] >= 1) return;
        /* 重點字的第一行從畫面 82% 高處捲到 40% 的過程中，由左往右塗滿；塗過就保留 */
        var p = Math.max(0, Math.min(1, (vh * 0.82 - m.getBoundingClientRect().top) / (vh * 0.42)));
        if (p > seen[i]) { seen[i] = p; m.style.setProperty('--hl', p.toFixed(3)); }
      });
    });
  }

  /* ---------- 視線追蹤（shp-watch-eyes）：每隻小白的眼睛跟著游標 ---------- */
  function eyes() {
    var dogs = $$('.xb-dog, .xb-face').map(function (svg) {
      var dots = $$('.xb-eyes circle', svg);
      return {
        svg: svg, dots: dots, x: 0, y: 0, tx: 0, ty: 0, seen: false,
        home: dots.map(function (c) { return [+c.getAttribute('cx'), +c.getAttribute('cy')]; })
      };
    }).filter(function (d) { return d.dots.length === 2; });
    if (!dogs.length) return;

    var px = null, py = null, raf = 0, last = 0;
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { dogs.forEach(function (d) { if (d.svg === e.target) d.seen = e.isIntersecting; }); });
      kick();
    });
    dogs.forEach(function (d) { watch.observe(d.svg); });

    function aim(d) {
      if (px === null) { d.tx = d.ty = 0; return; }
      var r = d.svg.getBoundingClientRect(), vb = d.svg.viewBox.baseVal;
      /* 兩眼中點在小白圖的座標 (130, 104) */
      var dx = px - (r.left + r.width * (130 - vb.x) / vb.width);
      var dy = py - (r.top + r.height * (104 - vb.y) / vb.height);
      var dist = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, dist / 140);
      d.tx = dx / dist * 7 * k;
      d.ty = dy / dist * 4.5 * k;
    }
    function tick(t) {
      raf = 0;
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60, ease = 1 - Math.exp(-dt * 12), moving = false;
      last = t;
      dogs.forEach(function (d) {
        if (!d.seen) return;
        aim(d);
        d.x += (d.tx - d.x) * ease;
        d.y += (d.ty - d.y) * ease;
        if (Math.abs(d.tx - d.x) > 0.05 || Math.abs(d.ty - d.y) > 0.05) moving = true;
        d.dots.forEach(function (c, i) {
          c.setAttribute('cx', (d.home[i][0] + d.x).toFixed(2));
          c.setAttribute('cy', (d.home[i][1] + d.y).toFixed(2));
        });
      });
      if (moving) raf = requestAnimationFrame(tick); else last = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }
    /* 觸控只在點按時看過去，不跟著滑動手勢跑 */
    addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') { px = e.clientX; py = e.clientY; kick(); } }, { passive: true });
    addEventListener('pointerdown', function (e) { px = e.clientX; py = e.clientY; kick(); }, { passive: true });
    root.addEventListener('mouseleave', function () { px = py = null; kick(); });
    addEventListener('scroll', kick, { passive: true });
  }

  /* ---------- 愛心迸發（btn-heart-burst）：點小白冒出愛心 ---------- */
  /* Font Awesome Free 7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2026 Fonticons, Inc. — solid/heart */
  var HEART = '<svg viewBox="0 0 512 512"><path d="M241 87.1l15 20.7 15-20.7C296 52.5 336.2 32 378.9 32 452.4 32 512 91.6 512 165.1l0 2.6c0 112.2-139.9 242.5-212.9 298.2-12.4 9.4-27.6 14.1-43.1 14.1s-30.8-4.6-43.1-14.1C139.9 410.2 0 279.9 0 167.7l0-2.6C0 91.6 59.6 32 133.1 32 175.8 32 216 52.5 241 87.1z"/></svg>';
  function hearts() {
    $$('.xb-dog').forEach(function (svg) { svg.addEventListener('click', function () { burst(svg); }); });
  }
  function burst(svg) {
    var r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, box = document.createElement('div'), html = '<i></i>';
    box.className = 'm-burst';
    box.setAttribute('aria-hidden', 'true');
    box.style.left = (scrollX + r.left + r.width * (130 - vb.x) / vb.width) + 'px';
    box.style.top = (scrollY + r.top + r.height * (80 - vb.y) / vb.height) + 'px';
    for (var k = 0; k < 8; k++) {
      var a = (k * 45 - 90 + (k % 2 ? 10 : -10)) * Math.PI / 180, dist = 48 + (k % 3) * 12;
      html += '<span style="--x:' + (Math.cos(a) * dist).toFixed(1) + 'px;--y:' + (Math.sin(a) * dist - 12).toFixed(1) +
        'px;color:' + (k % 2 ? '#E8707E' : '#B42A23') + '">' + HEART + '</span>';
    }
    box.innerHTML = html;
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 900);
    if (svg.animate) svg.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(.9,1.1)' }, { transform: 'scale(1.06,.95)' }, { transform: 'scale(1,1)' }], { duration: 460, easing: 'ease-out' });
  }

  /* ---------- 目錄跟讀（lay-scrollspy）：導覽列亮出目前讀到的段落 ---------- */
  function scrollspy() {
    var nav = document.querySelector('.nav-links');
    if (!nav) return;
    var links = $$('a[href^="#"]', nav).filter(function (a) { return document.getElementById(a.hash.slice(1)); });
    if (!links.length) return;
    var targets = links.map(function (a) { return document.getElementById(a.hash.slice(1)); });
    /* 導覽順序和頁面順序不一定相同，判斷讀到哪裡時照頁面順序 */
    var inPage = targets.slice().sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
    var bar = document.createElement('span'), current = null;
    bar.className = 'm-nav-ind';
    bar.setAttribute('aria-hidden', 'true');
    nav.insertBefore(bar, nav.firstChild);
    nav.classList.add('m-spy');

    function place(jump) {
      if (!current) { bar.classList.remove('on'); return; }
      if (jump || !bar.classList.contains('on')) bar.style.transition = 'none';
      bar.style.width = current.offsetWidth + 'px';
      bar.style.height = current.offsetHeight + 'px';
      bar.style.transform = 'translate(' + current.offsetLeft + 'px,' + current.offsetTop + 'px)';
      if (bar.style.transition) { bar.getBoundingClientRect(); bar.style.transition = ''; }
      bar.classList.add('on');
    }
    /* 手機版導覽可以橫向捲動：把目前項目捲到中間 */
    function centre(a) {
      if (nav.scrollWidth <= nav.clientWidth + 4) return;
      nav.scrollTo({ left: a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2, behavior: motion ? 'smooth' : 'auto' });
    }
    tasks.push(function () {
      var line = innerHeight * 0.38, active = null;
      if (innerHeight + scrollY >= root.scrollHeight - 2) active = inPage[inPage.length - 1];   /* 捲到底就算最後一段 */
      else inPage.forEach(function (s) { if (s.getBoundingClientRect().top <= line) active = s; });
      var link = active ? links[targets.indexOf(active)] : null;
      if (link === current) return;
      if (current) current.removeAttribute('aria-current');
      current = link;
      if (current) { current.setAttribute('aria-current', 'true'); centre(current); }
      else if (nav.scrollLeft) nav.scrollTo({ left: 0, behavior: motion ? 'smooth' : 'auto' });   /* 回到主視覺時導覽也回到開頭 */
      place(false);
    });
    /* 字型載入或視窗改變時，導覽項目的寬度會變 */
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { place(true); });
      ro.observe(nav);
      links.forEach(function (a) { ro.observe(a); });
    }
  }

  /* ---------- 回頂按鈕（lay-back-top）：外圈紅環是閱讀進度 ---------- */
  function toTop() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'm-totop';
    btn.setAttribute('aria-label', '回到頁首');
    btn.innerHTML = '<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="22"/></svg><img src="images/paw.svg" alt="">';
    document.body.appendChild(btn);
    var ring = btn.querySelector('circle'), len = 2 * Math.PI * 22;
    ring.style.strokeDasharray = len.toFixed(2);
    tasks.push(function () {
      var max = root.scrollHeight - innerHeight, p = max > 0 ? Math.min(1, scrollY / max) : 0;
      ring.style.strokeDashoffset = (len * (1 - p)).toFixed(2);
      btn.classList.toggle('show', scrollY > innerHeight * 0.9);
    });
    btn.addEventListener('click', function () {
      scrollTo({ top: 0, behavior: motion ? 'smooth' : 'auto' });
      var logo = document.querySelector('.nav-logo');
      if (logo) logo.focus({ preventScroll: true });
    });
  }

  if (motion) {
    /* 先藏後現若設定失敗，拿掉 html.motion，內容直接全部顯示 */
    run('reveal', function () {
      try { reveal(); } catch (err) { root.classList.remove('motion'); throw err; }
    });
    run('highlight', highlight);
    run('eyes', eyes);
    run('hearts', hearts);
  }
  run('scrollspy', scrollspy);
  run('totop', toTop);
  request();
})();
