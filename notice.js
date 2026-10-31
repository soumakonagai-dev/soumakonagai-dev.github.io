// 学校の端末での利用についての注意（サイトを開くたびに表示する）
(function () {
  var KEY = 'sgl-notice-shown', isTop = !!document.getElementById('school-note');
  try { if (!isTop && sessionStorage.getItem(KEY)) return; } catch (e) {}
  function show() {
    var o = document.createElement('div');
    o.setAttribute('role', 'alertdialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'sgl-n-t');
    o.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(5,8,20,.94);display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Hiragino Kaku Gothic ProN","Yu Gothic UI","Meiryo",sans-serif';
    o.innerHTML = '<div style="max-width:30em;width:100%;background:#151d3a;color:#e8ecff;border:3px solid #ffd34d;box-shadow:6px 6px 0 #000;padding:24px 22px;line-height:1.8;text-align:center">' +
      '<p id="sgl-n-t" style="margin:0 0 10px;font-size:22px;font-weight:bold;color:#ffd34d">⚠ 学校の端末では遊ばないでください</p>' +
      '<p style="margin:0 0 8px;font-size:16px">このサイトはゲームです。学校のタブレット・パソコンなど、学習に関係のないものを使ってはいけない端末では、遊ばないでください。</p>' +
      '<p style="margin:0 0 10px;font-size:14px;color:#a8b2d8">おうちの端末や、使ってよい時間・場所で遊んでね。</p>' +
      '<p style="margin:0 0 18px;font-size:12px;color:#8793c4">※ このサイトでは、遊んだゲームと日時を、ランダムなID（名前などは集めません）で記録しています。</p>' +
      '<button type="button" style="font:bold 17px inherit;font-family:inherit;color:#0b1020;background:#ffd34d;border:0;padding:10px 22px;cursor:pointer;box-shadow:3px 3px 0 #000">わかりました（学校の端末ではやりません）</button></div>';
    document.body.appendChild(o);
    var b = o.querySelector('button'); b.focus();
    b.addEventListener('click', function () { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} o.remove(); document.dispatchEvent(new Event('sgl-notice-ok')); });
  }
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
