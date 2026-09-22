// Use a fresh canvas per backend; never fabricate GPU capabilities.
export function createArRenderer(Renderer, makeCanvas = () => document.createElement('canvas')) {
  const failures = [];
  for (const backend of ['webgl2', 'webgl']) {
    const canvas = makeCanvas();
    let gl;
    try {
      gl = canvas.getContext(backend, { alpha: true, antialias: false });
      if (!gl || gl.isContextLost()) throw new Error('context unavailable');
      for (const shader of [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER]) {
        for (const precision of [gl.HIGH_FLOAT, gl.MEDIUM_FLOAT]) {
          if (!gl.getShaderPrecisionFormat(shader, precision)) throw new Error('precision query returned null');
        }
      }
      const renderer = new Renderer({ canvas, context: gl, alpha: true, antialias: false });
      renderer.arBackend = backend;
      return renderer;
    } catch (error) {
      failures.push(`${backend}: ${error.message}`);
      try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
      canvas.remove();
    }
  }
  throw new Error(`AR_WEBGL_UNAVAILABLE (${failures.join('; ')})`);
}
