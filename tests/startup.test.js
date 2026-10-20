// This tests scene construction and real UI handlers with a deliberately stubbed
// GPU renderer. It is NOT visual QA or evidence of browser GPU performance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Window} from 'happy-dom';
import * as RealThree from 'three';
import * as rules from '../src/state.js';
test('scene boots, menus operate, state persists, and frames run (GPU stubbed)',()=>{
  const window=new Window({url:'http://localhost/'});const document=window.document;
  document.body.innerHTML=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  window.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},strokeRect(){},fillText(){}});
  class FakeRenderer {constructor(){this.domElement=document.createElement('canvas');this.shadowMap={};this.info={render:{calls:0,triangles:0}};}setPixelRatio(){}setSize(){}render(){}}
  const sandbox={console,THREE:{...RealThree,WebGLRenderer:FakeRenderer},GLTFLoader:class{},...rules,window,document,localStorage:window.localStorage,innerWidth:1280,innerHeight:720,devicePixelRatio:1,performance,requestAnimationFrame(){},setTimeout(){},clearTimeout(){},setInterval(){},confirm(){return false;},location:{reload(){}},URL,Blob,structuredClone};
  const code=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  const ctx=vm.createContext(sandbox);vm.runInContext(code,ctx);
  assert.equal(document.getElementById('loading'),null);
  assert.equal(document.getElementById('coinText').textContent,'50');
  document.querySelector('[data-action="bag"]').click();
  let buttons=[...document.querySelectorAll('#activityPanel button')];
  buttons.find(b=>b.textContent.includes('Buy 3 seeds')).click();
  assert.equal(document.getElementById('coinText').textContent,'44');
  assert.equal(JSON.parse(window.localStorage.getItem(rules.SAVE_KEY)).inventory.seeds,6);
  vm.runInContext("state.inventory.carrot=1;openBag();",ctx);
  [...document.querySelectorAll('#activityPanel button')].find(b=>b.textContent.startsWith('Carrot ×')).click();
  assert.equal(document.getElementById('coinText').textContent,'49');
  vm.runInContext("setPanel(null);player.position.set(50,0,25);state.coins=500;renderBuild();",ctx);
  for(let i=0;i<6;i++)document.querySelector('#buildList button:not(:disabled)').click();
  assert.equal(vm.runInContext('state.restaurantStage',ctx),6);
  vm.runInContext("setPanel(null);updateRestaurant(.016);state.restaurant.order.at=0;updateRestaurant(.016);openRestaurant();",ctx);
  [...document.querySelectorAll('#activityPanel button')].find(b=>b.textContent==='Prepare bento').click();
  vm.runInContext('state.restaurant.order.readyAt=0;updateRestaurant(.016);openRestaurant();',ctx);
  [...document.querySelectorAll('#activityPanel button')].find(b=>b.textContent==='Serve guest').click();
  [...document.querySelectorAll('#activityPanel button')].find(b=>b.textContent==='Collect 18 coins').click();
  assert.equal(vm.runInContext('state.restaurant.served',ctx),1);
  vm.runInContext('setPanel(null);for(let i=0;i<100;i++)animate(performance.now()+i*16);',ctx);
  window.happyDOM.abort();
});
