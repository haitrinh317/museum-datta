(() => {
  'use strict';
  const run = document.querySelector('#run');
  const copy = document.querySelector('#copy');
  const output = document.querySelector('#result');
  const status = document.querySelector('#status');
  function probe(backend) {
    const result = { backend, context: false, contextLost: null, creationError: null, precision: {}, draw: false };
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 8;
    let gl, program, buffer;
    const shaders = [];
    canvas.addEventListener('webglcontextcreationerror', event => { result.creationError = event.statusMessage || 'creation error'; });
    try {
      gl = canvas.getContext(backend, { alpha: true, antialias: false });
      result.context = !!gl;
      if (!gl) return result;
      result.contextLost = gl.isContextLost();
      if (result.contextLost) return result;
      result.version = gl.getParameter(gl.VERSION);
      result.attributes = gl.getContextAttributes();
      for (const kind of ['VERTEX_SHADER', 'FRAGMENT_SHADER']) {
        result.precision[kind] = {};
        for (const level of ['HIGH_FLOAT', 'MEDIUM_FLOAT', 'LOW_FLOAT']) {
          const value = gl.getShaderPrecisionFormat(gl[kind], gl[level]);
          result.precision[kind][level] = value ? { precision: value.precision, rangeMin: value.rangeMin, rangeMax: value.rangeMax } : null;
        }
      }
      const modern = backend === 'webgl2';
      const vertex = modern ? '#version 300 es\nin vec2 p; void main(){gl_Position=vec4(p,0.,1.);}' : 'attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}';
      const fragment = modern ? '#version 300 es\nprecision mediump float; out vec4 color; void main(){color=vec4(0.,1.,0.,1.);}' : 'precision mediump float; void main(){gl_FragColor=vec4(0.,1.,0.,1.);}';
      program = gl.createProgram();
      if (!program) throw new Error('createProgram returned null');
      for (const [kind, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
        const shader = gl.createShader(kind);
        if (!shader) throw new Error('createShader returned null');
        shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('compile: ' + gl.getShaderInfoLog(shader));
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(program));
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'p');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, 8, 8); gl.drawArrays(gl.TRIANGLES, 0, 3);
      const pixel = new Uint8Array(4); gl.readPixels(4, 4, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      result.pixel = Array.from(pixel); result.glError = gl.getError();
      result.contextLost = gl.isContextLost();
      result.draw = !result.contextLost && result.glError === gl.NO_ERROR && pixel[0] < 5 && pixel[1] > 250 && pixel[2] < 5 && pixel[3] > 250;
    } catch (error) { result.error = String(error.message || error); }
    finally {
      if (gl) {
        try { shaders.forEach(shader => gl.deleteShader(shader)); if (program) gl.deleteProgram(program); if (buffer) gl.deleteBuffer(buffer); } catch {}
        try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
      }
      canvas.remove();
    }
    return result;
  }
  run.addEventListener('click', async () => {
    run.disabled = copy.disabled = true;
    status.textContent = 'Đang kiểm tra WebGL độc lập…';
    try {
      const report = { build: 'GL-diagnostic-20260922-1', time: new Date().toISOString(), secure: isSecureContext, userAgent: navigator.userAgent, standalone: matchMedia('(display-mode: standalone)').matches, serviceWorkerControlled: !!navigator.serviceWorker?.controller, tests: [] };
      for (const backend of ['webgl2', 'webgl']) {
        await new Promise(resolve => setTimeout(resolve, 100));
        report.tests.push(probe(backend));
        output.value = JSON.stringify(report, null, 2);
      }
      const count = report.tests.filter(test => test.draw).length;
      status.textContent = `${count}/2 phép thử vẽ thành công. Bấm Sao chép kết quả và gửi lại để đối chiếu. Đây chưa phải kiểm thử nhận diện AR.`;
    } catch (error) { status.textContent = 'Kiểm tra gặp lỗi: ' + error.message; }
    finally { run.disabled = false; copy.disabled = !output.value; }
  });
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(output.value); status.textContent = 'Đã sao chép kết quả. Có thể dán vào cuộc trò chuyện.'; }
    catch { output.focus(); output.select(); status.textContent = 'Không sao chép tự động được. Chọn văn bản trong ô kết quả để sao chép thủ công.'; }
  });
})();
