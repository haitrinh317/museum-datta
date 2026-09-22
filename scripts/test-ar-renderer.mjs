import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createArRenderer } from '../src/ar-renderer.js';
function fixture(fail) {
  const released=[];
  const calls=[];
  return { released, calls, make:()=>({remove(){},getContext(backend){
    calls.push(backend);
    return {VERTEX_SHADER:1,FRAGMENT_SHADER:2,HIGH_FLOAT:3,MEDIUM_FLOAT:4,
      isContextLost:()=>false,getShaderPrecisionFormat:()=>fail(backend)?null:{precision:23},
      getExtension:()=>({loseContext:()=>released.push(backend)})};
  }})};
}
class Renderer {constructor(options){this.options=options;}}
test('null precision releases WebGL2 and selects real WebGL1',()=>{
 const f=fixture(b=>b==='webgl2'); const r=createArRenderer(Renderer,f.make);
 assert.equal(r.arBackend,'webgl');assert.deepEqual(f.released,['webgl2']);
});
test('both invalid contexts fail explicitly and release both',()=>{
 const f=fixture(()=>true);assert.throws(()=>createArRenderer(Renderer,f.make),/AR_WEBGL_UNAVAILABLE/);
 assert.deepEqual(f.released,['webgl2','webgl']);
});
test('constructor failure releases context before fallback',()=>{
 const f=fixture(()=>false);let calls=0;
 class BrokenOnce {constructor(){if(++calls===1)throw Error('GPU failure');}}
 assert.equal(createArRenderer(BrokenOnce,f.make).arBackend,'webgl');
 assert.deepEqual(f.released,['webgl2']);
});
