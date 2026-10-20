import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { migrate, award, purchase, plant, water, harvest, beginOrder, advanceOrder, collectOrder, prepareOrder, serveOrder, SAVE_KEY } from './state.js';

const state = migrate(null);
const colliders=[];
const materialCache=new Map();

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe3e8);
scene.fog = new THREE.FogExp2(0xcde9ea, 0.008);

const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 900);
camera.position.set(0, 7, 25);

let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(error){$('loadText').textContent='This browser could not start WebGL 2. Try Chrome or Edge with hardware acceleration enabled, then reload.';const retry=document.createElement('button');retry.className='wide-btn';retry.textContent='Reload';retry.onclick=()=>location.reload();$('loading').querySelector('.loading-card').append(retry);throw new Error('WebGL 2 unavailable. Try a browser with hardware acceleration.');}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('game').appendChild(renderer.domElement);

const clock = new THREE.Clock();
const world = new THREE.Group();
const city = new THREE.Group();
const actors = new THREE.Group();
const props = new THREE.Group();
const buildings = new THREE.Group();
const interactables = new THREE.Group();
const effects = new THREE.Group();
scene.add(world, city, actors, props, buildings, interactables, effects);

const systems = {
  fishCooldown: 0,
  interactionCooldown: 0,
  petCooldown: 0,
  vehicleSpeed: 0
};

const hemi = new THREE.HemisphereLight(0xfff6fb, 0x6b8190, 1.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4d8, 3.2);
sun.position.set(-80,100,40);
sun.castShadow = true;
sun.shadow.mapSize.set(1536,1536);
sun.shadow.camera.left=-120; sun.shadow.camera.right=120;
sun.shadow.camera.top=120; sun.shadow.camera.bottom=-120;
scene.add(sun);

const gltf = new GLTFLoader();
const assetCache = new Map();

function loadGLB(path, onLoaded, fallbackFactory){
  if(assetCache.has(path)){ onLoaded(assetCache.get(path).clone(true)); return; }
  gltf.load(path,
    g => {
      const root = g.scene;
      root.traverse(o => {
        if(o.isMesh){
          o.castShadow = true; o.receiveShadow = true;
          if(o.material) o.material.envMapIntensity = 0.65;
        }
      });
      assetCache.set(path, root);
      onLoaded(root.clone(true));
    },
    undefined,
    () => {
      if(fallbackFactory) onLoaded(fallbackFactory());
    }
  );
}

function mat(color, rough=.78, metal=0){
  const key=[color,rough,metal].join(',');
  if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal}));
  return materialCache.get(key);
}
function box(w,h,d,color,rough=.8){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,rough));
  m.castShadow=true; m.receiveShadow=true; return m;
}
function cyl(r,h,color,radial=20){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,radial),mat(color));
  m.castShadow=true; m.receiveShadow=true; return m;
}
function add(mesh,x,y,z,parent=world){
  mesh.position.set(x,y,z); parent.add(mesh); return mesh;
}

function createGround(){
  const g = new THREE.Mesh(new THREE.PlaneGeometry(270,270),mat(0xb9d9c3,.95));
  g.rotation.x=-Math.PI/2; g.receiveShadow=true; city.add(g);
  for(let x=-120;x<=120;x+=20){
    const road = box(7,.04,250,0xb6b2b8,1);
    road.position.x=x; city.add(road);
  }
  for(let z=-120;z<=120;z+=20){
    const road = box(250,.045,7,0xb6b2b8,1);
    road.position.z=z; city.add(road);
  }
  for(let x=-120;x<=120;x+=20) for(let z=-120;z<=120;z+=20){
    const tile=box(11,.06,11,0xc9e3d2,.95); tile.position.set(x,0.01,z); city.add(tile);
  }
}
function createSidewalks(){
  for(let x=-120;x<=120;x+=20){
    const s1=box(1.7,.09,250,0xe9dfd8,.95); s1.position.set(x-4.3,.06,0); city.add(s1);
    const s2=s1.clone(); s2.position.x=x+4.3; city.add(s2);
  }
  for(let z=-120;z<=120;z+=20){
    const s1=box(250,.09,1.7,0xe9dfd8,.95); s1.position.set(0,.06,z-4.3); city.add(s1);
    const s2=s1.clone(); s2.position.z=z+4.3; city.add(s2);
  }
}
function createRoadMarkings(){
  for(let x=-100;x<=100;x+=20){
    for(let z=-9;z<=9;z+=4.5){
      const m=box(.55,.03,2.2,0xf6f0e5,1); m.position.set(x,.11,z); city.add(m);
    }
  }
  for(let z=-100;z<=100;z+=20){
    for(let x=-9;x<=9;x+=4.5){
      const m=box(2.2,.03,.55,0xf6f0e5,1); m.position.set(x,.11,z); city.add(m);
    }
  }
}

function createFountain(){
  const g=new THREE.Group(); g.position.set(0,.1,0);
  const base=cyl(6,.5,0xf1ddd5,48); g.add(base);
  const water=cyl(4.7,.12,0x86d6e2,48); water.position.y=.3; g.add(water);
  const stem=cyl(.65,2.2,0xf5e4df,32); stem.position.y=1.3; g.add(stem);
  const top=cyl(1.7,.28,0xf7e8e1,32); top.position.y=2.35; g.add(top);
  for(let i=0;i<10;i++){
    const p=new THREE.Mesh(new THREE.SphereGeometry(.18,12,12),new THREE.MeshStandardMaterial({color:0xa9e8ee,transparent:true,opacity:.75}));
    const a=i/10*Math.PI*2; p.position.set(Math.cos(a)*1.2,2.65,Math.sin(a)*1.2); g.add(p);
  }
  world.add(g);
}

function building(x,z,w,d,h,color,name,sign=true){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const base=box(w,h,d,color,.72); base.position.y=h/2; g.add(base);
  const roof=box(w+.35,.45,d+.35,0xf7eee9,.68); roof.position.y=h+.2; g.add(roof);
  for(const sx of [-w*.28,w*.28]){
    for(let yy=2;yy<h-1;yy+=2.5){
      const win=box(w*.18,.95,.08,0x9ed9dc,.22); win.position.set(sx,yy,d/2+.05); g.add(win);
      const win2=win.clone(); win2.position.z=-d/2-.05; g.add(win2);
    }
  }
  const door=box(1.2,2.1,.12,0x7b596b,.5); door.position.set(0,1.05,d/2+.07); g.add(door);
  if(sign){
    const plate=box(Math.min(4,w*.65),.65,.12,0xffd9e7,.5); plate.position.set(0,h*.68,d/2+.1); g.add(plate);
  }
  g.userData.name=name;
  colliders.push({x,z,w:w+.7,d:d+.7});
  decorateBuilding(g,w,d,h,name);
  buildings.add(g);
  return g;
}

function tree(x,z,scale=1){
  const g=new THREE.Group(); g.position.set(x,0,z); g.scale.setScalar(scale);
  const trunk=cyl(.22,1.7,0x9b765d,10); trunk.position.y=.85; g.add(trunk);
  const c1=new THREE.Mesh(new THREE.SphereGeometry(1.2,14,12),mat(0x7fc49e,.9)); c1.position.y=2.0; c1.castShadow=true; g.add(c1);
  const c2=c1.clone(); c2.scale.set(.75,.75,.75); c2.position.set(.75,2.35,.1); g.add(c2);
  const c3=c1.clone(); c3.scale.set(.65,.65,.65); c3.position.set(-.65,2.3,.2); g.add(c3);
  props.add(g); return g;
}
function streetLamp(x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const pole=cyl(.09,3.5,0x59616c,10); pole.position.y=1.75; g.add(pole);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.28,12,10),new THREE.MeshStandardMaterial({color:0xfff2c4,emissive:0xffd58a,emissiveIntensity:.8}));
  lamp.position.y=3.55; g.add(lamp);
  props.add(g);
}

function createDistricts(){
  // City center
  building(-12,-12,7,7,7,0xf0b9cb,'Bakery');
  building(12,-12,7,7,6,0xb5dce1,'Boutique');
  building(-12,12,7,7,6.5,0xf0dfac,'Library');
  building(12,12,7,7,8,0xd3bde9,'Town Hall');

  // Restaurant street east
  building(50,0,13,9,7.5,0xf2b7c8,'Restaurant');
  building(50,-14,8,8,5.5,0xe5c6b3,'Cafe');
  building(64,0,7,8,6,0xb7d8ca,'Market');
  createRestaurantPlot();

  // Residential north
  for(let i=0;i<6;i++){
    if(i===3)continue;
    const x=-45+(i%3)*16, z=42+Math.floor(i/3)*15;
    building(x,z,10,9,5+((i%2)*1.3),[0xf4c8d6,0xd4e9e4,0xf0dfb0][i%3],'Home '+(i+1));
    tree(x-6,z-5,.8); tree(x+6,z+5,.75);
  }

  // Sakura district west
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2, r=38;
    const x=Math.cos(a)*r, z=Math.sin(a)*r;
    const t=tree(x,z,1.05);
    t.children.forEach((c,j)=>{if(j>0)c.material=mat(0xefadc9);});
  }
  building(-48,-30,14,10,7,0xe9b7c9,'Sakura Tea House');

  // Park / lake
  const lake=cyl(13,.2,0x88d7e2,48); lake.scale.z=.72; lake.position.set(-42,.12,-5); world.add(lake);
  for(let i=0;i<12;i++){ const a=i/12*Math.PI*2; tree(-42+Math.cos(a)*17,-5+Math.sin(a)*12,.75); }

  // Distant mountains
  for(let i=0;i<15;i++){
    const x=-130+i*18, z=-105+(i%3)*7;
    const m=new THREE.Mesh(new THREE.ConeGeometry(14+((i%4)*4),38+((i%5)*7),7),mat(0x9fb9b0,.98));
    m.position.set(x,m.geometry.parameters.height/2,z); world.add(m);
  }
}

let restaurantGroup=null;
const buildStages=[
  {name:'Foundation',cost:0},
  {name:'Walls + Entrance',cost:20},
  {name:'Windows',cost:15},
  {name:'Roof',cost:20},
  {name:'Kitchen',cost:25},
  {name:'Dining Room',cost:25},
  {name:'Service Counter',cost:30},
  {name:'Outdoor Seating',cost:35},
  {name:'Premium Sign',cost:40}
];

function createRestaurantPlot(){
  restaurantGroup=new THREE.Group(); restaurantGroup.position.set(50,0,15);
  const plot=box(22,.08,18,0xe6d7cd,.98); plot.position.y=.04; restaurantGroup.add(plot);
  const border=box(22,.12,.25,0xf0a9c6,.9); border.position.set(0,.1,8.9); restaurantGroup.add(border);
  const label=box(8,.35,.25,0xffd5e4,.7); label.position.set(0,.3,9.05); restaurantGroup.add(label);
  world.add(restaurantGroup);
}

function applyRestaurantStage(){
  if(!restaurantGroup) return;
  restaurantGroup.children.slice(2).forEach(c=>restaurantGroup.remove(c));
  const s=state.restaurantStage;
  if(s>=1){
    const f=box(18,.35,14,0xf3eee8,.85); f.position.y=.25; restaurantGroup.add(f);
  }
  if(s>=2){
    const walls=[
      [18,3.6,.4,0xf4c2d2,0,1.95,-7],
      [7.5,3.6,.4,0xf4c2d2,-5.25,1.95,7],
      [7.5,3.6,.4,0xf4c2d2,5.25,1.95,7],
      [.4,3.6,14,0xf4c2d2,-9,1.95,0],
      [.4,3.6,14,0xf4c2d2,9,1.95,0]
    ];
    walls.forEach(([w,h,d,c,x,y,z])=>{const m=box(w,h,d,c,.72);m.position.set(x,y,z);restaurantGroup.add(m);});
    const door=box(2.3,2.6,.45,0x7e5a70,.5);door.position.set(0,1.55,7.15);door.visible=false;restaurantGroup.add(door);
  }
  if(s>=3){
    for(const x of [-6,-2,2,6]){const w=box(2.2,1.5,.12,0x9edbe0,.2);w.position.set(x,2.5,7.2);restaurantGroup.add(w);}
  }
  if(s>=4){
    const roof=box(19,.55,15,0xf5dbe5,.65);roof.userData.roof=true;roof.position.y=3.95;restaurantGroup.add(roof);
  }
  if(s>=5){
    const kitchen=box(7,1.1,3,0xe3d2d6,.7);kitchen.position.set(-4,.8,-3);restaurantGroup.add(kitchen);
    for(let i=0;i<3;i++){const oven=box(1.3,1.1,.8,0x68707a,.4);oven.position.set(-6+i*2,1,-4.1);restaurantGroup.add(oven);}
  }
  if(s>=6){
    for(let x=-5;x<=5;x+=3.3){const t=box(2.4,.12,1.5,0xf4e3b2,.6);t.position.set(x,.65,2.5);restaurantGroup.add(t);}
  }
  if(s>=7){
    const c=box(8,1.1,.8,0xc68fa6,.5);c.position.set(2,1.1,-6);restaurantGroup.add(c);
  }
  if(s>=8){
    for(let x=-6;x<=6;x+=3){const chair=box(.65,.9,.65,0xa98b9a,.7);chair.position.set(x,.55,5);restaurantGroup.add(chair);}
  }
  if(s>=9){
    const sign=box(7,1,.25,0xffbdd7,.5);sign.position.set(0,4.7,7.4);restaurantGroup.add(sign);
  }
}

function createPlayer(){
  const root=new THREE.Group();
  root.position.set(0,0,18);
  const body=box(1.15,1.45,.72,0xf4b5cb,.75); body.position.y=1.35; root.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.65,24,18),mat(0xffeee9,.8));head.scale.set(1,.95,.9);head.position.y=2.45;head.castShadow=true;root.add(head);
  const ear1=new THREE.Mesh(new THREE.ConeGeometry(.18,.45,5),mat(0xffeee9,.8));ear1.position.set(-.35,2.95,.02);root.add(ear1);
  const ear2=ear1.clone();ear2.position.x=.35;root.add(ear2);
  const bow=new THREE.Mesh(new THREE.SphereGeometry(.22,12,8),mat(0xf08bb3,.65));bow.scale.set(1.5,.7,.5);bow.position.set(.52,2.55,.42);root.add(bow);
  root.traverse(o=>{if(o.isMesh)o.castShadow=true});
  actors.add(root);
  return root;
}
const player=createPlayer();

function npc(x,z,color,name){
  const g=new THREE.Group();g.position.set(x,0,z);
  const body=box(.9,1.2,.6,color,.8);body.position.y=1.05;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.48,18,14),mat(0xffeee9,.85));head.position.y=2;head.castShadow=true;g.add(head);
  g.userData={name,home:new THREE.Vector3(x,0,z),target:new THREE.Vector3(x,0,z),phase:Math.random()*6.28};
  actors.add(g);return g;
}
const npcs=[
  npc(5,6,0xd7b4e8,'Mimi'),
  npc(-8,5,0xb6dfd8,'Lulu'),
  npc(20,-3,0xf1b6c8,'Nono'),
  npc(43,5,0xf0d6a7,'Chef Coco')
];

function updateNPCs(dt){
  const t=performance.now()/1000;
  for(const n of npcs){
    const p=n.userData;
    const r=2.5;
    const target=new THREE.Vector3(
      p.home.x+Math.cos(t*.18+p.phase)*r,
      0,
      p.home.z+Math.sin(t*.18+p.phase)*r
    );
    const dir=target.clone().sub(n.position);dir.y=0;
    if(dir.length()>0.15){dir.normalize();n.position.addScaledVector(dir,dt*1.2);n.rotation.y=Math.atan2(dir.x,dir.z);}
  }
}

function createStreetDetails(){
  for(let x=-100;x<=100;x+=20){
    streetLamp(x+5,5); streetLamp(x-5,-5);
  }
  for(let z=-100;z<=100;z+=20){
    streetLamp(5,z+5); streetLamp(-5,z-5);
  }
  for(let i=0;i<55;i++){
    const x=(Math.random()*240)-120, z=(Math.random()*240)-120;
    if(Math.abs(x%20)<6 || Math.abs(z%20)<6)continue;
    if(colliders.some(c=>Math.abs(x-c.x)<c.w/2+2 && Math.abs(z-c.z)<c.d/2+2))continue;
    if(Math.abs(x)<12 && Math.abs(z)<12) continue;
    if(Math.abs(x-50)<13 && Math.abs(z-15)<11) continue;
    tree(x,z,.55+Math.random()*.45);
  }
}

function loadPlayerGLB(){
  loadGLB('/assets/models/character.glb',
    root=>{root.scale.setScalar(1.0); root.position.y=0; player.add(root);},
    null
  );
}

function saveGame(quiet=false){
  if(state.saveReadError){toast('Original unreadable save protected. Export current progress or start a new save.');return false;}
  state.player={x:player.position.x,z:player.position.z,rot:player.rotation.y};
  state.vehicle.x=vehicle.position.x;state.vehicle.z=vehicle.position.z;
  state.savedAt=Date.now();
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(state)); if(!quiet)toast('Saved ✓');$('saveStatus').textContent='Saved locally · '+new Date().toLocaleTimeString();return true;}
  catch(e){$('saveStatus').textContent='Save failed — export a backup';toast('Storage unavailable. Export your save in Settings.');return false;}
}
function loadGame(){
  try{const raw=localStorage.getItem(SAVE_KEY);const parsed=raw?JSON.parse(raw):null;if(raw&&(!parsed||typeof parsed!=='object'||Array.isArray(parsed)))throw Error('Invalid save');Object.assign(state,migrate(parsed));}
  catch(e){toast('Save could not be read. Original storage has not been removed.');state.saveReadError=true;}
}
function resetGame(){
  if(confirm('Start a NEW SAVE? Current local progress will be replaced.')){
    state.saveReadError=true;
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
}
function spend(cost){
  if(!Number.isFinite(cost)||cost<0||state.coins<cost){toast('Not enough coins');return false;}
  state.coins-=cost; return true;
}
function toast(msg){
  const el=$('toast');el.textContent=msg;el.classList.add('show');
  clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800);
}

function renderQuests(){
  const list=$('questList');list.innerHTML='';
  const data=[
    ['city_walk','First Steps','Walk around the city center.',20],
    ['restaurant_start','Dreamy Restaurant','Build the first restaurant foundation.',25],
    ['meet_friend','Meet a Friend','Visit any NPC and interact.',15],
    ['open_restaurant','Open the Restaurant','Build the kitchen and dining room.',40],
    ['adopt_pet','A New Friend','Adopt Mochi.',35],
    ['first_harvest','Green fingers','Harvest your first watered crop.',20],
    ['first_fish','Pearl of the sea','Reel in your first fish.',20],
    ['first_service','Grand opening','Collect payment from your first guest.',25]
  ];
  for(const [id,title,desc,reward] of data){
    const q=state.quests[id];
    const el=document.createElement('div');el.className='quest';
    el.innerHTML=`<div class="quest-title">${q.done?'✓ ':''}${title}</div><div class="quest-desc">${desc}</div><div class="quest-reward">Reward: ${reward} coins</div>`;
    list.appendChild(el);
  }
}
function renderBuild(){
  const list=$('buildList');list.innerHTML='';
  buildStages.forEach((s,i)=>{
    const row=document.createElement('div');row.className='build-row';
    const unlocked=i<=state.restaurantStage;
    row.innerHTML=`<div class="build-info"><div class="build-name">${i<state.restaurantStage?'✓ ':''}${s.name}</div><div class="build-cost">${s.cost===0?'FREE':s.cost+' coins'}</div></div>`;
    const btn=document.createElement('button');
    btn.textContent=i<state.restaurantStage?'BUILT':i===state.restaurantStage?'BUILD':'LOCKED';
    btn.disabled=i!==state.restaurantStage;
    btn.onclick=()=>{
      if(player.position.distanceTo(new THREE.Vector3(50,0,15))>15){toast('Go to your restaurant plot first.');return;}
      if(i!==state.restaurantStage)return;
      if(s.cost===0 || spend(s.cost)){
        state.restaurantStage++;
        applyRestaurantStage();
        updateHUD();renderBuild();saveGame();
        toast(s.name+' built!');
        if(i===0)completeQuest('restaurant_start',25);
        if(state.restaurantStage>=6)completeQuest('open_restaurant',40);
      }
    };
    row.appendChild(btn);list.appendChild(row);
  });
}

function updateHUD(){
  $('coinText').textContent=Math.floor(state.coins);
  $('locationLabel').textContent=state.location;
  renderQuests();renderBuild();
}

function setPanel(id){
  document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
  input.x=input.y=0;keys.clear();
  if(id) $(id).classList.remove('hidden');
}
$('menuBtn').onclick=()=>setPanel('menuPanel');
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('.panel').classList.add('hidden'));
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
  const a=b.dataset.action;
  if(a==='quest')setPanel('questPanel');
  else if(a==='build')setPanel('buildPanel');
  else if(a==='map')setPanel('mapPanel');
  else if(a==='bag')openBag();
  else if(a==='camera'){camDistance=camDistance===16?27:16;toast('Camera distance changed');}
  else if(a==='pet')togglePet();
  else if(a==='farm')waterFarm();
});
const extraActions=document.createElement('div');
extraActions.className='extra-actions';
extraActions.innerHTML='<button id="petBtn">🐾 PET</button><button id="farmBtn">🌱 FARM</button><button id="homeBtn">🏠 HOME</button><button id="carBtn">🚗 CAR</button>';
document.getElementById('actionBar').appendChild(extraActions);
document.getElementById('petBtn').onclick=togglePet;
document.getElementById('farmBtn').onclick=waterFarm;
document.getElementById('carBtn').onclick=buyVehicle;
document.getElementById('homeBtn').onclick=renderHouse;

document.querySelectorAll('.menu-item').forEach(b=>b.onclick=()=>{
  const m=b.dataset.menu;
  if(m==='settings'){ $('settings').classList.toggle('hidden'); return; }
  if(m==='quest')setPanel('questPanel');
  if(m==='build')setPanel('buildPanel');
  if(m==='map'){setPanel(null);mapPanel.classList.remove('hidden');}
});
$('quality').onchange=e=>setQuality(e.target.value);
$('saveBtn').onclick=saveGame;
$('resetBtn').onclick=resetGame;

function setQuality(q){
  state.quality=q;
  if(q==='low'){renderer.setPixelRatio(1);sun.shadow.mapSize.set(768,768);scene.fog.density=.010}
  if(q==='medium'){renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));sun.shadow.mapSize.set(1024,1024);scene.fog.density=.008}
  if(q==='high'){renderer.setPixelRatio(Math.min(devicePixelRatio,1.9));sun.shadow.mapSize.set(1536,1536);scene.fog.density=.0065}
  if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
  renderer.shadowMap.needsUpdate=true;
  toast('Quality set to '+q.toUpperCase());
}

const input={x:0,y:0};
let joystickActive=false;
function joystick(e){
  const r=$('joystick').getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  const px=e.clientX-cx, py=e.clientY-cy, max=40, len=Math.hypot(px,py);
  const k=Math.min(1,max/Math.max(len,1));
  input.x=px*k/max;input.y=py*k/max;
  $('stick').style.transform=`translate(${input.x*32}px,${input.y*32}px)`;
}
$('joystick').addEventListener('pointerdown',e=>{joystickActive=true;$('joystick').setPointerCapture(e.pointerId);joystick(e)});
$('joystick').addEventListener('pointermove',e=>{if(joystickActive)joystick(e)});
$('joystick').addEventListener('pointerup',()=>{joystickActive=false;input.x=input.y=0;$('stick').style.transform='translate(0,0)'});
$('joystick').addEventListener('pointercancel',()=>{joystickActive=false;input.x=input.y=0;$('stick').style.transform='translate(0,0)'});

let camYaw=0,camPitch=.55,camDistance=16;
function camButton(id,dx,dy){
  $(id).addEventListener('pointerdown',()=>{camYaw+=dx;camPitch=THREE.MathUtils.clamp(camPitch+dy,-.05,.8)});
}
camButton('camLeft',-.14,0);camButton('camRight',.14,0);camButton('camUp',0,-.08);camButton('camDown',0,.08);

$('interactBtn').onclick=useInteractable;

function updateLocation(){
  const p=player.position;
  let loc='CITY CENTER';
  if(p.distanceTo(new THREE.Vector3(-55,0,-48))<25)loc='SUNNY FARM';
  else if(p.x>42&&p.z<-35)loc='PEARL BEACH';
  else if(p.x>28 && p.x<80 && p.z>-25 && p.z<28)loc='RESTAURANT STREET';
  else if(p.x<-25 && p.z>25)loc='RESIDENTIAL';
  else if(p.x<-25 && p.z<-20)loc='SAKURA DISTRICT';
  else if(p.z<-65)loc='MOUNTAIN OUTSKIRTS';
  if(loc!==state.location){state.location=loc;updateHUD();toast(loc)}
}

function movePlayer(dt){
  if(state.vehicle.driving||panelOpen())return;
  const ix=joystickActive?input.x:((keys.has('d')||keys.has('arrowright'))?1:0)-((keys.has('a')||keys.has('arrowleft'))?1:0);
  const iy=joystickActive?input.y:((keys.has('s')||keys.has('arrowdown'))?1:0)-((keys.has('w')||keys.has('arrowup'))?1:0);
  const mag=Math.hypot(ix,iy);if(mag<.05)return;
  const dir=new THREE.Vector3(Math.cos(camYaw)*ix+Math.sin(camYaw)*iy,0,-Math.sin(camYaw)*ix+Math.cos(camYaw)*iy).normalize();
  const speed=keys.has('shift')?9:6.2;
  const old=player.position.clone();moveWithCollision(player,dir.x*dt*speed,dir.z*dt*speed,.45);
  player.rotation.y=Math.atan2(dir.x,dir.z);state.distance+=player.position.distanceTo(old);
  if(state.distance>=25)completeQuest('city_walk',20);
  updateLocation();
}

function updateCamera(dt){
  const target=player.position.clone().add(new THREE.Vector3(0,1.4,0));
  const dist=camDistance;
  const desired=new THREE.Vector3(target.x+Math.sin(camYaw)*dist,target.y+Math.sin(camPitch)*dist+3,target.z+Math.cos(camYaw)*dist);
  camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(target);
  if(restaurantGroup)restaurantGroup.children.forEach(c=>{if(c.userData.roof)c.visible=player.position.distanceTo(restaurantGroup.position)>14;});
  if(houseGroup)houseGroup.children.forEach(c=>{if(c.userData.roof)c.visible=player.position.distanceTo(houseGroup.position)>13;});
}

function updateTime(dt){
  state.time+=dt*.18;
  if(state.time>=24){state.time-=24;state.day++;}
  const angle=(state.time/24)*Math.PI*2-Math.PI/2;
  sun.position.set(Math.cos(angle)*100,Math.max(10,Math.sin(angle)*100),40);
  const dayFactor=THREE.MathUtils.clamp(Math.sin(angle)*.5+.5,.15,1);
  sun.intensity=1.0+2.4*dayFactor;
  hemi.intensity=.65+1.35*dayFactor;
  const sky=new THREE.Color().setHSL(.53,.36,.48+.12*dayFactor);
  scene.background.lerp(sky,.03);
  scene.fog.color.copy(sky);
}

let fpsFrames=0,fpsTime=0,fps=0;
function debugUpdate(dt){
  fpsFrames++;fpsTime+=dt;
  if(fpsTime>=.5){fps=fpsFrames/fpsTime;fpsFrames=0;fpsTime=0;}
  if(state.settings.debug)$('debug').textContent=`FPS ${fps.toFixed(0)}
DRAW ${renderer.info.render.calls}
TRI ${renderer.info.render.triangles}
NPC ${npcs.length}
ASSETS ${assetCache.size}
DISTRICT ${state.location}`;
}


function createFarm(){
  const g=new THREE.Group(); g.position.set(-55,0,-48); g.userData.type='farm';
  const field=box(34,.12,24,0xb98d62,.98); field.position.y=.06; g.add(field);
  for(let x=-13;x<=13;x+=6){
    for(let z=-8;z<=8;z+=6){
      const plot=box(4.2,.16,4.2,0x765a43,.98); plot.position.set(x,.16,z); plot.userData={crop:null,water:0}; g.add(plot);
    }
  }
  const shed=building(-55,-61,10,8,4.8,0xf0d6a7,'Farm Shed',true);
  // Shed remains in world coordinates.
  const sign=box(8,.9,.2,0xffd4a8,.55); sign.position.set(0,2,12.3); g.add(sign);
  world.add(g);
  return g;
}

function createBeach(){
  const g=new THREE.Group(); g.position.set(72,0,-65); g.userData.type='beach';
  const sand=box(58,.18,28,0xe9d7a6,.98); sand.position.y=.09; g.add(sand);
  const water=box(58,.25,48,0x72cbd5,.8); water.position.set(0,-.02,-25); g.add(water);
  for(let x=-25;x<=25;x+=10){
    const board=box(7,.22,18,0xc99d72,.9); board.position.set(x,.22,10); g.add(board);
  }
  for(let x=-25;x<=25;x+=12){
    const lamp=streetLamp; // architectural reference retained
    tree(x,4,.55);
  }
  const pier=box(16,.3,28,0x9c7358,.9); pier.position.set(0,.3,-24); g.add(pier);
  world.add(g);
  return g;
}

function createFishingSpots(){
  const g=new THREE.Group();
  const sign=box(5,1,.18,0xffd4e2,.6); sign.position.set(72,2,-42); g.add(sign);
  sign.userData.type='fishingSpot';
  interactables.add(g);
}

function createPet(){
  const g=new THREE.Group(); g.userData={type:'pet',name:'Mochi'};
  const body=new THREE.Mesh(new THREE.SphereGeometry(.65,20,16),mat(0xf4d7df,.78)); body.scale.set(1.25,.8,1); body.position.y=.72; g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.48,20,16),mat(0xffeee8,.82)); head.position.set(.48,1.15,0); g.add(head);
  const ear1=new THREE.Mesh(new THREE.ConeGeometry(.16,.35,6),mat(0xffeee8,.82)); ear1.position.set(.25,1.55,.28); g.add(ear1);
  const ear2=ear1.clone(); ear2.position.z=-.28; g.add(ear2);
  g.position.set(player.position.x+1,0,player.position.z+1.5);
  g.visible=false;
  actors.add(g);
  return g;
}
let activePet=createPet();

function createVehicle(){
  const g=new THREE.Group(); g.userData={type:'vehicle'};
  const body=box(2.4,.75,4.2,0xe9a8c5,.45); body.position.y=.65; g.add(body);
  const cabin=box(1.8,.8,2.1,0x9bd7dc,.22); cabin.position.set(0,1.2,-.15); g.add(cabin);
  for(const x of [-1.1,1.1]) for(const z of [-1.3,1.3]){
    const w=cyl(.35,.22,0x3e4148,20); w.rotation.z=Math.PI/2; w.position.set(x,.35,z); g.add(w);
  }
  g.position.set(5,0,20); g.visible=false; actors.add(g); return g;
}
let vehicle=createVehicle();

function createWorldStations(){
  const station=building(72,-5,16,10,6.5,0xd7c2e8,'TRAIN STATION',true);
  station.userData.type='trainStation';
  const park=building(-72,22,15,10,5.8,0xc5dfd2,'COMMUNITY CENTER',true);
  park.userData.type='community';
  const arcade=building(78,25,14,10,6,0xf1bfd4,'ARCADE',true);
  arcade.userData.type='arcade';
}

function harvestNearestCrop(){openFarm();}

function waterFarm(){openFarm();}

function fish(){
  if(player.position.distanceTo(new THREE.Vector3(72,0,-42))>18){toast('Find the fishing pier on the map.');return;}
  const now=performance.now();
  if(fishSession){
    if(now<fishSession.bite){toast('Too soon! The fish escaped.');fishSession=null;return;}
    if(now>fishSession.bite+1700){toast('The fish escaped. Cast again.');fishSession=null;return;}
    const rare=Math.random()<.16;state.inventory[rare?'fish_rare':'fish_common']++;
    state.fishing.catches++;fishSession=null;completeQuest('first_fish',20);updateHUD();saveGame(true);toast(rare?'Rare moonfish caught! Sell it in your bag.':'Fish caught! Sell it in your bag.');return;
  }
  state.fishing.casts++;fishSession={bite:now+1800+Math.random()*2300};toast('Wait… tap INTERACT when BITE appears!');
}

function togglePet(){
  if(!state.pets.owned){if(!spend(35))return;state.pets.owned=1;state.pets.active='Mochi';completeQuest('adopt_pet',35);}
  activePet.visible=true;
  const p=openPanel('Mochi · your companion');
  p.innerHTML+=`<p>Happiness: ${Math.round(state.pets.happiness)}% · Hunger: ${Math.round(state.pets.hunger)}%</p><p>Mochi follows you while exploring. Feed a carrot or play together.</p>`;
  action(p,'Feed carrot',()=>{if(!state.inventory.carrot){toast('Grow carrots at the farm first.');return;}state.inventory.carrot--;state.pets.hunger=Math.max(0,state.pets.hunger-30);state.pets.happiness=Math.min(100,state.pets.happiness+10);saveGame(true);togglePet();});
  action(p,'Play together',()=>{state.pets.happiness=Math.min(100,state.pets.happiness+5);toast('Mochi loves playing with you!');saveGame(true);togglePet();});
  updateHUD();saveGame(true);
}

function buyVehicle(){
  if(!state.vehicle.owned){if(!spend(100))return;state.vehicle.owned=true;}
  if(state.vehicle.driving){startDriving();return;}
  const x=player.position.x+3,z=player.position.z;
  if(blocked(x,z,1.4)){toast('Find open space to park your car.');return;}
  vehicle.position.set(x,0,z);vehicle.visible=true;saveGame(true);updateHUD();toast('Car ready nearby. Approach it and press INTERACT.');
}

function useInteractable(){
  if(panelOpen())return;
  if(systems.interactionCooldown>0)return;systems.interactionCooldown=.25;
  const p=player.position;
  if(state.vehicle.driving){startDriving();return;}
  if(p.distanceTo(new THREE.Vector3(50,0,15))<14){openRestaurant();return;}
  if(p.distanceTo(new THREE.Vector3(-55,0,-48))<25){openFarm();return;}
  if(p.distanceTo(new THREE.Vector3(72,0,-42))<18){fish();return;}
  if(p.distanceTo(new THREE.Vector3(-45,0,58))<13){renderHouse();return;}
  if(p.distanceTo(new THREE.Vector3(78,0,25))<12){openArcade();return;}
  if(p.distanceTo(new THREE.Vector3(72,0,-5))<13){openTravel();return;}
  if(state.vehicle.owned&&p.distanceTo(vehicle.position)<5){startDriving();return;}
  if(p.distanceTo(new THREE.Vector3(5,0,20))<5){buyVehicle();return;}
  let nearest=null,d=4;
  for(const n of npcs){const dd=n.position.distanceTo(p);if(dd<d){d=dd;nearest=n;}}
  if(nearest){talk(nearest.userData.name);return;}
  toast('Move nearer a character, restaurant, home, farm or pier.');
}

function updatePet(dt){
  if(!activePet.visible)return;
  const target=player.position.clone().add(new THREE.Vector3(-1.4,0,1.4));
  const dir=target.sub(activePet.position);dir.y=0;
  if(dir.length()>1.1){dir.normalize();activePet.position.addScaledVector(dir,dt*3.4);activePet.rotation.y=Math.atan2(dir.x,dir.z);}
  activePet.position.y=Math.abs(Math.sin(performance.now()*.006))*.08;
}

function updateVehicle(){}

function createMapPanel(){
  const panel=document.createElement('div');panel.id='mapPanel';panel.className='panel glass hidden';
  panel.innerHTML='<div class="panel-head"><b>ISLAND ATLAS</b><button class="close">×</button></div><p>Choose a destination to track. Travel tickets are available at the station.</p><div class="map-art"><span>🌸</span><span>🌾</span><span>⛰</span><span>🏠</span><span>⛲</span><span>🍜</span><span>🌲</span><span>🚉</span><span>🌊</span></div>';
  for(const [name,x,z] of destinations)action(panel,name,()=>{waypoint={name,x,z};setPanel(null);toast('Follow the destination indicator.');});
  document.body.appendChild(panel);panel.querySelector('.close').onclick=()=>setPanel(null);return panel;
}
let mapPanel=null;


let houseGroup=null;
let restaurantCustomers=[];
const recipes=[
  {name:'Strawberry Cake',cost:8,reward:20},
  {name:'Dreamy Bento',cost:12,reward:28},
  {name:'Rainbow Drink',cost:5,reward:16}
];

function createHousePlot(){
  houseGroup=new THREE.Group();
  houseGroup.position.set(-45,0,58);
  const plot=box(18,.08,16,0xdfe5d7,.98); plot.position.y=.04; houseGroup.add(plot);
  const sign=box(7,.55,.2,0xffd5e5,.6); sign.position.set(0,1,8.2); houseGroup.add(sign);
  const marker=cyl(1.1,.15,0xffc1d9,24); marker.position.y=.15; houseGroup.add(marker);
  world.add(houseGroup);
}

const houseStages=[
  ['Foundation',0],['Walls + Door',35],['Windows',25],['Roof',30],
  ['Kitchen',35],['Bedroom',35],['Garden',30],['Furniture Pack',45]
];

function applyHouseStage(){
  if(!houseGroup)return;
  houseGroup.children.slice(3).forEach(c=>houseGroup.remove(c));
  const s=state.house.stage;
  if(s>=1){const f=box(15,.35,13,0xf3eee7,.82);f.position.y=.25;houseGroup.add(f);}
  if(s>=2){
    [[15,.4,.4,0xf3c4d5,0,-6.5],[6,.4,.4,0xf3c4d5,-4.5,6.5],[6,.4,.4,0xf3c4d5,4.5,6.5],
     [.4,4,13,0xf3c4d5,-7.5,0],[.4,4,13,0xf3c4d5,7.5,0]].forEach(a=>{
      const m=box(a[0],4,a[2],a[3],.72);m.position.set(a[4],2,a[5]);houseGroup.add(m);
    });
    const door=box(2.1,2.7,.35,0x866277,.45);door.position.set(0,1.45,6.7);door.visible=false;houseGroup.add(door);
  }
  if(s>=3)for(const x of [-4,-1.3,1.3,4]){const w=box(1.8,1.2,.1,0x9ed9dc,.18);w.position.set(x,2.35,6.72);houseGroup.add(w);}
  if(s>=4){const roof=box(16,.55,14,0xf4d6e2,.65);roof.userData.roof=true;roof.position.y=4.2;houseGroup.add(roof);}
  if(s>=5){const k=box(5,1.9,3.8,0xe8d4d7,.7);k.position.set(-4,1.2,-2);houseGroup.add(k);}
  if(s>=6){const bed=box(4,.55,2.4,0xe7a8c4,.55);bed.position.set(3,1,-2);houseGroup.add(bed);}
  if(s>=7)for(let x=-6;x<=6;x+=3){const t=box(.35,1.5,.35,0x8e6c55,.9);t.position.set(x,.75,5);houseGroup.add(t);}
  if(s>=8){for(let x=-4;x<=4;x+=2.7){const chair=box(.65,.9,.65,0xa98b9a,.7);chair.position.set(x,.55,2);houseGroup.add(chair);}state.house.furniture=4;}
}

function renderHouse(){
  if(player.position.distanceTo(new THREE.Vector3(-45,0,58))>14){toast('Go to your home parcel. Track it on the map.');return;}
  const p=openPanel('My home');
  houseStages.forEach(([name,cost],i)=>action(p,`${i<state.house.stage?'✓ ':''}${name} · ${cost} coins`,()=>{if(i!==state.house.stage)return;if(purchase(state,cost,()=>state.house.stage++)){applyHouseStage();updateHUD();saveGame(true);renderHouse();}else toast('Not enough coins');},i!==state.house.stage));
  if(state.house.stage>=6)action(p,'Rest until morning',()=>{state.time=9;state.pets.hunger=Math.max(0,state.pets.hunger-10);saveGame(true);toast('A peaceful new morning.');});
}

function cookRecipe(){openRestaurant();}

function createRestaurantWorkers(){
  const cook=npc(47,11,0xf0b0c7,'Chef Helper'); cook.userData.role='cook';
  const waiter=npc(57,11,0xb7dce0,'Momo Waiter'); waiter.userData.role='waiter';
}

function createCustomers(){
  if(state.restaurantStage<6)return;
  for(let i=0;i<5;i++){
    const c=npc(43+i*4,20,[0xf3c7d5,0xd9c4ea,0xbdded7,0xf1d9a9][i%4],'Customer '+(i+1));
    c.userData.role='customer'; c.userData.phase=i*.7; restaurantCustomers.push(c);
  }
}

function updateRestaurant(dt){
  if(state.restaurantStage<6)return;
  if(!state.restaurant.order)beginOrder(state,Date.now());
  advanceOrder(state,Date.now());
  const order=state.restaurant.order;
  if(!customerActor){customerActor=npc(50,29,0xe9c478,'Guest');customerActor.userData.role='guest';}
  customerActor.visible=!!order;
  if(order){const target=new THREE.Vector3(53,0,17);const d=target.sub(customerActor.position);if(d.length()>.2){customerActor.position.addScaledVector(d.normalize(),dt*2);customerActor.rotation.y=Math.atan2(d.x,d.z);}}
  if(state.restaurant.staff&&order?.status==='ready'){
    if(!waiterActor){waiterActor=npc(47,12,0x9adacc,'Momo');}
    const d=customerActor.position.clone().sub(waiterActor.position);
    if(d.length()>1)waiterActor.position.addScaledVector(d.normalize(),dt*3);else{order.status='paid';saveGame(true);}
  }else if(waiterActor){const d=new THREE.Vector3(47,0,12).sub(waiterActor.position);if(d.length()>.2)waiterActor.position.addScaledVector(d.normalize(),dt*2);}
}

function startDriving(){
  if(!state.vehicle.owned){toast('Buy the car for 100 coins first.');return;}
  if(!state.vehicle.driving && player.position.distanceTo(vehicle.position)>5){toast('Get closer to your car. Use CAR to bring it nearby.');return;}
  state.vehicle.driving=!state.vehicle.driving;vehicle.visible=true;player.visible=!state.vehicle.driving;
  if(!state.vehicle.driving){player.position.copy(vehicle.position);moveWithCollision(player,2,0,.45);systems.vehicleSpeed=0;}
  toast(state.vehicle.driving?'Drive: W/S throttle · A/D steering · SPACE brake · E exit':'Car parked');saveGame(true);
}

function updateDriving(dt){
  if(!state.vehicle.driving||panelOpen())return;
  const steer=joystickActive?input.x:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  const throttle=joystickActive?-input.y:Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
  systems.vehicleSpeed=THREE.MathUtils.clamp(systems.vehicleSpeed+throttle*dt*12,-7,19);
  systems.vehicleSpeed*=Math.exp(-dt*(keys.has(' ')?12:throttle? .3:2.5));
  vehicle.rotation.y-=steer*dt*1.8*Math.min(1,Math.abs(systems.vehicleSpeed)/3)*Math.sign(systems.vehicleSpeed||1);
  const old=vehicle.position.clone();moveWithCollision(vehicle,Math.sin(vehicle.rotation.y)*systems.vehicleSpeed*dt,Math.cos(vehicle.rotation.y)*systems.vehicleSpeed*dt,1.4);
  if(old.distanceTo(vehicle.position)<.001)systems.vehicleSpeed=0;
  player.position.copy(vehicle.position);camYaw=THREE.MathUtils.lerp(camYaw,vehicle.rotation.y+Math.PI,dt*2);updateLocation();
}

function buildWorld(){
  createGround();
  createSidewalks();
  createRoadMarkings();
  createFountain();
  createDistricts();
  createFarm();
  createBeach();
  createWorldStations();
  createFishingSpots();
  createHousePlot();


  createStreetDetails();
  // All original procedural assets are bundled; no missing GLB network requests.
  mapPanel=createMapPanel();
  applyRestaurantStage();
}

function boot(){
  loadGame();$('quality').value=state.quality;
  $('loadText').textContent='Constructing the island…';buildWorld();applyHouseStage();
  player.position.set(state.player.x,0,state.player.z);player.rotation.y=state.player.rot;
  if(blocked(player.position.x,player.position.z,.45))player.position.set(0,0,18);
  vehicle.position.set(state.vehicle.x,0,state.vehicle.z);vehicle.visible=state.vehicle.owned;
  state.vehicle.driving=false;activePet.visible=!!state.pets.owned;
  updateHUD();setQuality(state.quality);setupExtras();
  $('loadBar').style.width='100%';$('loading').remove();
  toast('Welcome! Walk 25m, meet a friend, then build your café.');
}
const keys=new Set();
let waypoint=null,fishSession=null,customerActor=null,waiterActor=null,extraTick=0,autoSave=0,arcadeRound=null;
const destinations=[['City plaza',0,18],['Your restaurant',50,25],['Your home',-45,68],['Sunny farm',-55,-37],['Fishing pier',72,-42],['Sakura garden',-48,-18],['Train station',72,3],['Arcade',78,34]];
const cropVisuals=[];
const collectibles=[];
function panelOpen(){return !!document.querySelector('.panel:not(.hidden)');}
function blocked(x,z,r){
  if(Math.abs(x)>114-r||Math.abs(z)>114-r)return true;
  if(Math.hypot(x,z)<6+r)return true;
  if(((x+42)/14)**2+((z+5)/10)**2<1)return true;
  if(z<-67&&x>43&&x<101 && !(Math.abs(x-72)<6&&z>-100))return true;
  if(colliders.some(c=>Math.abs(x-c.x)<c.w/2+r&&Math.abs(z-c.z)<c.d/2+r))return true;
  for(const [cx,cz,w,d,stage] of [[50,15,18,14,state.restaurantStage],[-45,58,15,13,state.house.stage]]){
    if(stage<2)continue;
    const dx=Math.abs(x-cx),dz=z-cz;
    if(dx<w/2+r && Math.abs(dz+d/2)<r+.25)return true;
    if(Math.abs(dx-w/2)<r+.25 && Math.abs(dz)<d/2)return true;
    if(Math.abs(dz-d/2)<r+.25&&dx<w/2+r&&dx>1.5-r)return true;
  }
  return false;
}
function moveWithCollision(obj,dx,dz,r){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3));for(let i=0;i<steps;i++){if(!blocked(obj.position.x+dx/steps,obj.position.z,r))obj.position.x+=dx/steps;if(!blocked(obj.position.x,obj.position.z+dz/steps,r))obj.position.z+=dz/steps;}}
function completeQuest(id,amount){if(award(state,id,amount)){updateHUD();saveGame(true);toast('Quest complete +'+amount+' coins');}}
function openPanel(title){setPanel(null);let p=$('activityPanel');if(p)p.remove();p=document.createElement('div');p.id='activityPanel';p.className='panel glass';const head=document.createElement('div');head.className='panel-head';const b=document.createElement('b');b.textContent=title;head.append(b);const close=document.createElement('button');close.className='close';close.textContent='×';close.onclick=()=>setPanel(null);head.append(close);p.append(head);document.body.append(p);return p;}
function action(p,label,fn,disabled=false){const b=document.createElement('button');b.className='wide-btn';b.textContent=label;b.disabled=disabled;b.onclick=fn;p.append(b);return b;}
function openBag(){const p=openPanel('Inventory & market');for(const [key,name,price] of [['carrot','Carrot',5],['strawberry','Strawberry',8],['fish_common','Pearl fish',8],['fish_rare','Moonfish',30]])action(p,`${name} × ${state.inventory[key]} · Sell one +${price}`,()=>{if(state.inventory[key]<1)return;state.inventory[key]--;state.coins+=price;updateHUD();saveGame(true);openBag();},state.inventory[key]<1);const note=document.createElement('p');note.textContent=`Carrot seeds: ${state.inventory.seeds}. Carrots can also supply your kitchen or feed Mochi.`;p.append(note);action(p,'Buy 3 seeds · 6 coins',()=>{if(purchase(state,6,()=>state.inventory.seeds+=3)){updateHUD();saveGame(true);openBag();}else toast('Not enough coins');});}
function openFarm(){if(player.position.distanceTo(new THREE.Vector3(-55,0,-48))>25){toast('Visit Sunny Farm. Track it on the map.');return;}const p=openPanel('Sunny farm');p.innerHTML+='<p>Plant → water → grow for 45 seconds → harvest 3 carrots. Growth continues while away.</p>';state.farm.crops.forEach((c,i)=>{const ready=c&&c.watered&&Date.now()>=c.readyAt;const label=!c?'Plant seed':!c.watered?'Water':ready?'Harvest':`Growing · ${Math.ceil((c.readyAt-Date.now())/1000)}s`;action(p,`Plot ${i+1}: ${label}`,()=>{const ok=!c?plant(state,i,Date.now()):!c.watered?water(state,i,Date.now()):harvest(state,i,Date.now());if(!ok){toast(!c?'Buy seeds from BAG.':'Your crop needs more time.');return;}if(ready)completeQuest('first_harvest',20);saveGame(true);openFarm();},!!c?.watered&&!ready);});action(p,'Refresh growth',openFarm);action(p,'Seed shop / sell harvest',openBag);}
function openRestaurant(){if(state.restaurantStage<6){setPanel('buildPanel');return;}const p=openPanel('Dreamy café · kitchen');const o=state.restaurant.order;if(!o){p.innerHTML+='<p>A new guest is on the way.</p>';action(p,'Check guests',openRestaurant);return;}const text={arriving:'A guest is arriving and finding a seat.',ordered:'One garden bento, please!',cooking:'Cooking your garden bento…',ready:'Bento is ready. Bring it to the table.',paid:'Guest paid. Collect from the cash counter.'};p.innerHTML+=`<p>${text[o.status]}</p><p>Served ${state.restaurant.served} · Reputation ${state.restaurant.reputation}/100</p><p>Ingredients: 1 carrot, or 3 coins. Payment: 18 coins.</p>`;action(p,'Prepare bento',()=>{if(prepareOrder(state,Date.now())){saveGame(true);updateHUD();openRestaurant();}else toast('You need one carrot or 3 coins.');},o.status!=='ordered');action(p,'Serve guest',()=>{serveOrder(state);saveGame(true);openRestaurant();},o.status!=='ready');action(p,'Collect 18 coins',()=>{if(collectOrder(state)){if(customerActor)customerActor.position.set(50,0,29);completeQuest('first_service',25);updateHUD();saveGame(true);openRestaurant();}},o.status!=='paid');action(p,'Refresh order',openRestaurant);action(p,state.restaurant.staff?'✓ Momo hired':'Hire Momo to serve ready meals · 80',()=>{if(purchase(state,80,()=>state.restaurant.staff=true)){saveGame(true);updateHUD();openRestaurant();}else toast('Not enough coins');},state.restaurant.staff);action(p,'Expand restaurant',()=>setPanel('buildPanel'));}
function talk(name){const p=openPanel(name);const lines={Mimi:'Welcome to the island! Walk around the plaza, then start your café east of here. The foundation is free.',Lulu:'I grow carrots in Sunny Farm. Water them and come back in 45 seconds. Your kitchen and Mochi both love them!',Nono:'The beach fish are beautiful. Watch for BITE and reel quickly! Rare moonfish sell for 30 coins.','Chef Coco':'Build a kitchen and dining room. Prepare orders, serve your guests, then collect their payment. I believe in you!'};p.innerHTML+=`<p>${lines[name]}</p><p>Friendship: ${state.friendship[name]||0}/100</p>`;completeQuest('meet_friend',15);action(p,'Chat',()=>{if(Date.now()-(state.lastTalk[name]||0)<60000){toast('Come back in a minute for another chat.');return;}state.lastTalk[name]=Date.now();state.friendship[name]=Math.min(100,state.friendship[name]+5);saveGame(true);talk(name);});action(p,'Gift a carrot · +10 friendship',()=>{if(!state.inventory.carrot){toast('Grow a carrot first.');return;}state.inventory.carrot--;state.friendship[name]=Math.min(100,state.friendship[name]+10);saveGame(true);talk(name);});}
function openTravel(){const p=openPanel('Island transit');p.innerHTML+='<p>Shuttle ticket · 3 coins. Choose your stop.</p>';for(const [name,x,z] of destinations)action(p,name,()=>{if(purchase(state,3,()=>{player.position.set(x,0,z);state.vehicle.driving=false;player.visible=true;})){setPanel(null);updateLocation();updateHUD();saveGame(true);}else toast('Not enough coins');});}
function openArcade(){const p=openPanel('Petal rhythm');p.innerHTML+=`<p>Stop the moving flower in the green zone. Three attempts per round. 4 coins for each hit. Best: ${state.arcade.best}/3.</p><div class="rhythm"><div class="target"></div><span id="rhythmCursor">🌸</span></div><p id="rhythmScore">Ready?</p>`;arcadeRound={start:performance.now(),tries:0,hits:0};const b=action(p,'Catch the flower',()=>{if(!arcadeRound||arcadeRound.tries>=3)return;const v=(Math.sin((performance.now()-arcadeRound.start)*.003)+1)/2;arcadeRound.tries++;if(v>.38&&v<.62)arcadeRound.hits++;$('rhythmScore').textContent=`${arcadeRound.hits} hits · ${arcadeRound.tries}/3 attempts`;if(arcadeRound.tries===3){state.coins+=arcadeRound.hits*4;state.arcade.best=Math.max(state.arcade.best,arcadeRound.hits);b.disabled=true;updateHUD();saveGame(true);toast(`Round complete +${arcadeRound.hits*4} coins`);}});action(p,'New round',openArcade);}
function sign(text,x,y,z,parent=world,width=5){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#fff8ed';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#bd7896';ctx.lineWidth=8;ctx.strokeRect(5,5,502,118);ctx.fillStyle='#6a4056';ctx.font='bold 36px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,78,480);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,y,z);parent.add(m);return m;}
function decorateBuilding(g,w,d,h,name){
  sign(name.toUpperCase(),0,h*.69,d/2+.18,g,Math.min(w*.8,6));
  // Facade pilasters, plinth, striped awning, roof parapet and lit window trims.
  for(const x of [-w/2+.15,w/2-.15])add(box(.28,h,.3,0xfff4e3),x,h/2,d/2+.12,g);
  add(box(w+.2,.28,d+.2,0xe6d3b6),0,.14,0,g);
  for(let i=0;i<8;i++)add(box(w/8,.14,1.5,i%2?0xfff4e3:0xe6a3be),-w/2+w/16+i*w/8,2.85,d/2+.65,g);
  for(const x of [-w*.28,w*.28]){add(box(w*.2,.1,.18,0xfff4e3),x,1.48,d/2+.12,g);add(box(.08,1.05,.18,0xfff4e3),x,2,d/2+.12,g);}
  const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.73,1.7,4),mat(0xb88199));roof.rotation.y=Math.PI/4;roof.position.y=h+1.1;roof.scale.z=d/w;g.add(roof);
}
function setupExtras(){
  const ocean=box(650,.12,650,0x83cbd3);ocean.position.y=-.3;scene.add(ocean);
  sign('YOUR DREAMY CAFE',50,2,24.3);sign('SUNNY FARM',-55,2,-35);sign('PEARL PIER',72,2,-40);sign('YOUR HOME',-45,2,67);sign('CAR · 100 COINS',5,2,23);
  for(let i=0;i<6;i++){const x=-64+(i%3)*7,z=-53+Math.floor(i/3)*9;const g=new THREE.Group();g.position.set(x,.4,z);for(let j=0;j<4;j++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.35,1,5),mat(0x679c56));leaf.position.set((j%2)*1.2,0,Math.floor(j/2)*1.2);g.add(leaf);}world.add(g);cropVisuals.push(g);}
  for(const [i,x,z] of [[0,-43,-18],[1,-65,6],[2,20,32],[3,88,-33],[4,-19,74]]){const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.6),mat(0xf7be68,.3,.25));gem.position.set(x,1.1,z);gem.userData.id='petal-'+i;gem.visible=!state.collected.includes(gem.userData.id);world.add(gem);collectibles.push(gem);}
  // Faces and feet distinguish the original island characters.
  for(const root of [player,...npcs]){const y=root===player?2.5:2.05;for(const x of [-.17,.17]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),mat(0x403440));eye.position.set(x,y,root===player?.55:.44);root.add(eye);}for(const x of [-.3,.3])add(box(.28,.25,.4,0xf7e9dc),x,.18,.1,root);}
  const settings=$('settings');
  action(settings,'Export save backup',()=>{saveGame(true);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='dreamy-island-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);});
  action(settings,'Import save backup',()=>{const f=document.createElement('input');f.type='file';f.accept='.json';f.onchange=async()=>{try{const raw=JSON.parse(await f.files[0].text());if(!raw||typeof raw.coins!=='number'||!raw.player)throw Error('Invalid save');if(!confirm('Replace local progress with this backup?'))return;const data=migrate(raw);localStorage.setItem(SAVE_KEY,JSON.stringify(data));state.saveReadError=true;location.reload();}catch(e){toast('Import failed: '+e.message);}};f.click();});
  action(settings,'Toggle performance diagnostics',()=>{state.settings.debug=!state.settings.debug;$('debug').classList.toggle('hidden',!state.settings.debug);});
  $('debug').classList.toggle('hidden',!state.settings.debug);
  renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,id:e.pointerId};renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;camYaw-=(e.clientX-drag.x)*.005;camPitch=THREE.MathUtils.clamp(camPitch+(e.clientY-drag.y)*.003,.1,1.1);drag.x=e.clientX;drag.y=e.clientY;});
  renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('pointercancel',()=>drag=null);
  renderer.domElement.addEventListener('wheel',e=>{camDistance=THREE.MathUtils.clamp(camDistance+e.deltaY*.01,8,32);},{passive:true});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('Graphics interrupted. Reload the page to reconnect.');saveGame(true);});
}
let drag=null;
function updateExtras(dt){
  autoSave+=dt;extraTick+=dt;
  if(autoSave>15){autoSave=0;if(!state.saveReadError)saveGame(true);}
  if(fishSession){const delta=performance.now()-fishSession.bite;$('interactBtn').textContent=delta<0?'WAIT…':delta<1700?'BITE! REEL!':'MISSED';if(delta>=2200){fishSession=null;$('interactBtn').textContent='INTERACT';}}
  else $('interactBtn').textContent=state.vehicle.driving?'EXIT CAR':'INTERACT';
  if(arcadeRound&&$('rhythmCursor'))$('rhythmCursor').style.left=((Math.sin((performance.now()-arcadeRound.start)*.003)+1)*50)+'%';
  for(const gem of collectibles)if(gem.visible){gem.rotation.y+=dt;gem.position.y=1.1+Math.sin(performance.now()*.002)*.15;if(player.position.distanceTo(gem.position)<1.7){gem.visible=false;state.collected.push(gem.userData.id);state.coins+=10;updateHUD();saveGame(true);toast('Hidden golden petal +10 coins');}}
  if(extraTick<.5)return;extraTick=0;
  if(waypoint){const d=Math.hypot(player.position.x-waypoint.x,player.position.z-waypoint.z);$('waypoint').textContent='◇ '+waypoint.name+' · '+Math.round(d)+'m';if(d<4){waypoint=null;$('waypoint').textContent='Destination reached';}}
  cropVisuals.forEach((g,i)=>{const c=state.farm.crops[i];g.visible=!!c;g.scale.setScalar(!c?.watered? .3:Math.min(1,.3+.7*(1-(c.readyAt-Date.now())/45000)));});
  if(state.pets.owned){state.pets.hunger=Math.min(100,state.pets.hunger+.012);state.pets.happiness=Math.max(0,state.pets.happiness-(state.pets.hunger>80?.02:0));}
  const o=state.restaurant.order;$('guide').textContent=state.restaurantStage<6?'Walk 25m → meet a friend → build your café':o?`Café · ${o.status.toUpperCase()} · Visit the kitchen to manage orders`:'Your café is open';
}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['input','select','textarea'].includes(e.target.tagName.toLowerCase()))return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(k==='escape')setPanel(null);});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();input.x=input.y=0;joystickActive=false;drag=null;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();input.x=input.y=0;if(!state.saveReadError)saveGame(true);}});

try{boot();}catch(e){console.error(e);$('loadText').textContent='Startup failed: '+e.message+'. Reload to retry.';throw e;}

let last=performance.now();
function animate(now){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  systems.fishCooldown=Math.max(0,systems.fishCooldown-dt);
  systems.interactionCooldown=Math.max(0,systems.interactionCooldown-dt);
  movePlayer(dt);updateDriving(dt);updateNPCs(dt);updatePet(dt);updateVehicle();updateRestaurant(dt);updateCamera(dt);updateTime(dt);debugUpdate(dt);updateExtras(dt);
  renderer.render(scene,camera);
}
animate(performance.now());

window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
window.addEventListener('keydown',e=>{
  if(e.key.toLowerCase()==='f3'){state.settings.debug=!state.settings.debug;$('debug').classList.toggle('hidden',!state.settings.debug)}
  if(e.key.toLowerCase()==='e')$('interactBtn').click();
  if(e.key.toLowerCase()==='v'&&!e.repeat)state.vehicle.owned?startDriving():buyVehicle();
});

window.addEventListener('pagehide',()=>{if(!state.saveReadError)saveGame(true);});
