// ドローンカメラ風の映像フィルター。シーンを一度低解像度の画像に描いて、1本のシェーダーで荒らす
const Filter = (() => {
  let renderer, rt, mat, quadScene, quadCam, curW = 2, curH = 2;
  const isMobile = matchMedia('(pointer:coarse)').matches;

  const vert = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
  const frag = `
precision highp float;
uniform sampler2D tDiffuse; uniform vec2 resolution;
uniform float time, noise, glitch, vignette, night, scan, dark, droneMode, chroma, bright;
varying vec2 vUv;
float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  float g = glitch;
  // 横帯のずれ
  float line = floor(uv.y * 34.0);
  float on = step(0.72, rnd(vec2(line * 1.7, floor(time * 7.0))));
  uv.x += (rnd(vec2(line, floor(time * 13.0))) - 0.5) * 0.10 * g * on;
  // 大きな引き裂き
  float tear = step(1.0 - g * 0.10, rnd(vec2(floor(uv.y * 9.0), floor(time * 18.0))));
  uv.x += tear * (rnd(vec2(time, 3.0)) - 0.5) * 0.12;
  // 色ずれ
  float ca = 0.0015 + g * 0.012 + chroma;
  vec3 col;
  col.r = texture2D(tDiffuse, uv + vec2(ca, 0.0)).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - vec2(ca, 0.0)).b;
  col *= bright;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  // 暗視(緑)
  col = mix(col, vec3(0.05, lum * 1.7 + 0.03, 0.09), night);
  // ドローンカメラは色が抜ける
  col = mix(col, vec3(lum) * vec3(0.95, 1.0, 1.0), 0.40 * droneMode * (1.0 - night));
  // ノイズ
  float n = rnd(uv * resolution + fract(time) * 71.0);
  col += (n - 0.5) * noise;
  // 走査線
  col *= 1.0 - scan * 0.20 * (0.5 + 0.5 * sin(uv.y * resolution.y * 1.6));
  // 周辺減光
  float d = length(vUv - 0.5);
  col *= mix(1.0, smoothstep(0.95 + vignette * 0.2, 0.18, d), 0.9);
  // バッテリー切れ間際の明滅
  col *= 1.0 - dark * (0.35 + 0.35 * rnd(vec2(floor(time * 16.0), 1.0)));
  // 乱れが大きいときは砂嵐が混ざる
  col = mix(col, vec3(rnd(uv * 91.0 + time)), clamp((g - 0.8) * 2.5, 0.0, 0.55));
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(0.85)), 1.0);
}`;

  function init(r) {
    renderer = r;
    mat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(2, 2) }, time: { value: 0 },
        noise: { value: 0.1 }, glitch: { value: 0 }, vignette: { value: 0.4 }, night: { value: 0 },
        scan: { value: 0.6 }, dark: { value: 0 }, droneMode: { value: 1 }, chroma: { value: 0 }, bright: { value: 1 },
      },
      vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false,
    });
    quadScene = new THREE.Scene();
    quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  }

  function resize(w, h) {
    const s = isMobile ? 0.55 : 0.75;
    curW = Math.max(2, Math.floor(w * s)); curH = Math.max(2, Math.floor(h * s));
    if (rt) rt.dispose();
    rt = new THREE.WebGLRenderTarget(curW, curH, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
    mat.uniforms.resolution.value.set(curW, curH);
  }

  function render(scene, camera, p) {
    const u = mat.uniforms;
    u.time.value = performance.now() / 1000 % 500;
    for (const k in p) if (u[k]) u[k].value = p[k];
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    u.tDiffuse.value = rt.texture;
    renderer.render(quadScene, quadCam);
  }
  return { init, resize, render };
})();
