// 解説動画・トレーラーの埋め込み（data-yt に YouTube の動画IDを入れると表示される）と、不具合報告フォーム
(function () {
  var REPO = 'soumakonagai-dev/soumakonagai-dev.github.io';

  document.querySelectorAll('.video').forEach(function (box) {
    var id = (box.dataset.yt || '').trim(), src = (box.dataset.src || '').trim();
    var game = box.closest('.game');
    var title = box.dataset.title || ((game && game.querySelector('.game-title').textContent) || '') + ' 解説動画';
    if (src) {
      // サイト内の動画ファイル（videos/xxx.mp4）。折りたたみ式で、開いたときにはじめて読み込む
      var isTr = !!box.closest('.trailer'), p = box.dataset.poster ? ' poster="' + box.dataset.poster + '"' : '';
      box.innerHTML = '<details class="vdetails"><summary>' + (isTr ? 'トレーラーを見る' : '解説動画を見る') + '</summary>' +
        '<div class="video-frame"><video controls playsinline preload="none"' + p + ' title="' + title + '"></video></div>' +
        '<p class="video-err" hidden>この端末では動画を再生できませんでした。<a href="' + src + '" target="_blank" rel="noopener">動画ファイルを直接開く</a></p></details>';
      var d = box.querySelector('details'), v = box.querySelector('video'), er = box.querySelector('.video-err');
      d.addEventListener('toggle', function () {
        if (d.open) { if (!v.getAttribute('src')) v.src = src; }
        else v.pause();
      });
      v.addEventListener('error', function () { er.hidden = false; });
      v.addEventListener('play', function () { document.dispatchEvent(new CustomEvent('sgl-video', { detail: true })); });
      v.addEventListener('pause', function () { document.dispatchEvent(new CustomEvent('sgl-video', { detail: false })); });
      return;
    }
    if (!id) {
      if (box.closest('.trailer')) { box.remove(); return; }
      box.innerHTML = '<div class="video-empty">解説動画は準備中</div>';
      return;
    }
    box.innerHTML = '<p class="video-label">' + (box.closest('.trailer') ? 'TRAILER' : '解説動画') + '</p>' +
      '<div class="video-frame"><img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy">' +
      '<button type="button" aria-label="' + title + ' を再生"><span>▶ 再生する</span></button></div>';
    box.querySelector('button').addEventListener('click', function () {
      // クリックされるまで YouTube を読み込まない（ページを軽く、プライバシー重視の youtube-nocookie）
      box.querySelector('.video-frame').innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id +
        '?autoplay=1&rel=0&playsinline=1" title="' + title + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    });
  });

  var trailers = document.querySelectorAll('.trailer');
  if (trailers.length) document.getElementById('upcoming').hidden = false;

  var form = document.getElementById('bugform');
  if (!form) return;
  var sel = form.elements.game;
  document.querySelectorAll('.game-title').forEach(function (t) {
    var o = document.createElement('option'); o.textContent = t.textContent; sel.appendChild(o);
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var body = '## 起きたこと\n' + f.what.value + '\n\n## 再現手順\n' + (f.steps.value || '（未記入）') +
      '\n\n## 端末\n' + (f.env.value || '（未記入）') + '\n\n---\nUA: ' + navigator.userAgent;
    var url = 'https://github.com/' + REPO + '/issues/new?title=' + encodeURIComponent('[不具合] ' + f.game.value) +
      '&body=' + encodeURIComponent(body);
    window.open(url, '_blank', 'noopener');
  });
})();
