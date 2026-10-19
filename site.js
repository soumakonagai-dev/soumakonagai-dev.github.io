// 解説動画・トレーラーの埋め込み（data-yt に YouTube の動画IDを入れると表示される）と、不具合報告フォーム
(function () {
  var REPO = 'soumakonagai-dev/soumakonagai-dev.github.io';

  document.querySelectorAll('.video').forEach(function (box) {
    var id = (box.dataset.yt || '').trim();
    var game = box.closest('.game');
    var title = box.dataset.title || ((game && game.querySelector('.game-title').textContent) || '') + ' 解説動画';
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
