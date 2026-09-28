import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const state = {
  build: '0.1.0',
  coins: 50,
  isNewSave: true,
  quality: 'medium',
  location: 'CITY CENTER',
  time: 9.5,
  day: 1,
  player: { x: 0, z: 18, rot: 0 },
  restaurantStage: 0,
  selectedTool: 'hand',
  inventory: {carrot:0, strawberry:0, fish_common:0, fish_rare:0, wood:0},
  farm: {plots:0, watered:[], ready:[]},
  fishing: {casts:0, catches:0},
  pets: {owned:0, active:null},
  vehicle: {owned:false, x:0, z:0, driving:false},
  house: {stage:0, furniture:0},
  restaurant: {customers:0, served:0, reputation:0},
  cooking: {prepared:0, served:0},
  friendship: {Mimi:0,Lulu:0,Nono:0,'Chef Coco':0},
  worldProgress: {park:0, beach:0, city:0},
  quests: {
    city_walk: {done:false, progress:0},
    restaurant_start: {done:false, progress:0},
    meet_friend: {done:false, progress:0}
  },
  settings: {debug:false}
};

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe3e8);
scene.fog = new THREE.FogExp2(0xcde9ea, 0.008);

const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 900);
camera.position.set(0, 7, 25);

const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
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
scene.add(world, actors, props, buildings, interactables, effects);

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
  return new THREE.MeshStandardMaterial({color, roughness:rough, metalness:metal});
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
  const g = new THREE.Mesh(new THREE.PlaneGeometry(600,600),mat(0xb9d9c3,.95));
  g.rotation.x=-Math.PI/2; g.receiveShadow=true; city.add(g);
  for(let x=-120;x<=120;x+=20){
    const road = box(7,.04,600,0xb6b2b8,1);
    road.position.x=x; city.add(road);
  }
  for(let z=-120;z<=120;z+=20){
    const road = box(600,.045,7,0xb6b2b8,1);
    road.position.z=z; city.add(road);
  }
  for(let x=-120;x<=120;x+=20) for(let z=-120;z<=120;z+=20){
    const tile=box(11,.06,11,0xc9e3d2,.95); tile.position.set(x,0.01,z); city.add(tile);
  }
}
function createSidewalks(){
  for(let x=-120;x<=120;x+=20){
    const s1=box(1.7,.09,600,0xe9dfd8,.95); s1.position.set(x-4.3,.06,0); city.add(s1);
    const s2=s1.clone(); s2.position.x=x+4.3; city.add(s2);
  }
  for(let z=-120;z<=120;z+=20){
    const s1=box(600,.09,1.7,0xe9dfd8,.95); s1.position.set(0,.06,z-4.3); city.add(s1);
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
  buildings.add(g);
  return g;
}

function tree(x,z,scale=1){
  const g=new THREE.Group(); g.position.set(x,0,z); g.scale.setScalar(scale);
  const trunk=cyl(.22,1.7,0x9b765d,10); trunk.position.y=.85; g.add(trunk);
  const c1=new THREE.Mesh(new THREE.SphereGeometry(1.2,14,12),mat(0x7fc49e,.9)); c1.position.y=2.0; c1.castShadow=true; g.add(c1);
  const c2=c1.clone(); c2.scale.set(.75,.75,.75); c2.position.set(.75,2.35,.1); g.add(c2);
  const c3=c1.clone(); c3.scale.set(.65,.65,.65); c3.position.set(-.65,2.3,.2); g.add(c3);
  props.add(g);
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
    const x=-45+(i%3)*16, z=42+Math.floor(i/3)*15;
    building(x,z,10,9,5+((i%2)*1.3),[0xf4c8d6,0xd4e9e4,0xf0dfb0][i%3],'Home '+(i+1));
    tree(x-6,z-5,.8); tree(x+6,z+5,.75);
  }

  // Sakura district west
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2, r=38;
    const x=Math.cos(a)*r, z=Math.sin(a)*r;
    const t=tree(x,z,1.05);
    t.children.forEach((c,j)=>{if(c.material)c.material=c.material.clone();});
  }
  building(-48,-30,14,10,7,0xe9b7c9,'Sakura Tea House');

  // Park / lake
  const lake=cyl(13,.2,0x88d7e2,48); lake.scale.z=.72; lake.position.set(-42,-5,.12); world.add(lake);
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
      [18,3.6,.4,0xf4c2d2,0,1.95,7],
      [.4,3.6,14,0xf4c2d2,-9,1.95,0],
      [.4,3.6,14,0xf4c2d2,9,1.95,0]
    ];
    walls.forEach(([w,h,d,c,x,y,z])=>{const m=box(w,h,d,c,.72);m.position.set(x,y,z);restaurantGroup.add(m);});
    const door=box(2.3,2.6,.45,0x7e5a70,.5);door.position.set(0,1.55,7.15);restaurantGroup.add(door);
  }
  if(s>=3){
    for(const x of [-6,-2,2,6]){const w=box(2.2,1.5,.12,0x9edbe0,.2);w.position.set(x,2.5,7.2);restaurantGroup.add(w);}
  }
  if(s>=4){
    const roof=box(19,.55,15,0xf5dbe5,.65);roof.position.y=3.95;restaurantGroup.add(roof);
  }
  if(s>=5){
    const kitchen=box(7,2.4,4.5,0xe3d2d6,.7);kitchen.position.set(-4,1.4,-2);restaurantGroup.add(kitchen);
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

function saveGame(){
  localStorage.setItem('jojoKittySave',JSON.stringify(state));
  toast('Game saved ✓');
}
function loadGame(){
  const raw=localStorage.getItem('jojoKittySave');
  if(!raw){state.coins=50;state.isNewSave=true;return;}
  try{
    const s=JSON.parse(raw);
    Object.assign(state,s);
    state.isNewSave=false;
  }catch{localStorage.removeItem('jojoKittySave');state.coins=50;}
}
function resetGame(){
  if(confirm('Start a NEW SAVE? Current local progress will be replaced.')){
    localStorage.removeItem('jojoKittySave');
    location.reload();
  }
}
function spend(cost){
  if(state.coins<cost){toast('Not enough coins');return false;}
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
    ['adopt_pet','A New Friend','Adopt Mochi.',35]
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
      if(i!==state.restaurantStage)return;
      if(s.cost===0 || spend(s.cost)){
        state.restaurantStage++;
        applyRestaurantStage();
        updateHUD();renderBuild();saveGame();
        toast(s.name+' built!');
        if(i===0)state.quests.restaurant_start.done=true;
        if(state.restaurantStage>=6)state.quests.open_restaurant.done=true;
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
  if(id) $(id).classList.remove('hidden');
}
$('menuBtn').onclick=()=>setPanel('menuPanel');
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('.panel').classList.add('hidden'));
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
  const a=b.dataset.action;
  if(a==='quest')setPanel('questPanel');
  else if(a==='build')setPanel('buildPanel');
  else if(a==='map')toast('Map system foundation ready — districts are being expanded.');
  else if(a==='bag')toast('Inventory system foundation ready.');
  else if(a==='camera')toast('Photo mode foundation ready.');
  else if(a==='pet')togglePet();
  else if(a==='farm')waterFarm();
});
const extraActions=document.createElement('div');
extraActions.className='extra-actions';
extraActions.innerHTML='<button id="petBtn">🐾 PET</button><button id="farmBtn">🌱 FARM</button><button id="homeBtn">🏠 HOME</button><button id="carBtn">🚗 CAR</button>';
document.getElementById('actionBar').appendChild(extraActions);
document.getElementById('petBtn').onclick=togglePet;
document.getElementById('farmBtn').onclick=waterFarm;
document.getElementById('carBtn').onclick=()=>state.vehicle.owned?startDriving():buyVehicle();
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

let camYaw=0,camPitch=.32;
function camButton(id,dx,dy){
  $(id).addEventListener('pointerdown',()=>{camYaw+=dx;camPitch=THREE.MathUtils.clamp(camPitch+dy,-.05,.8)});
}
camButton('camLeft',-.14,0);camButton('camRight',.14,0);camButton('camUp',0,-.08);camButton('camDown',0,.08);

$('interactBtn').onclick=useInteractable;

function updateLocation(){
  const p=player.position;
  let loc='CITY CENTER';
  if(p.x>28 && p.x<80 && p.z>-25 && p.z<28)loc='RESTAURANT STREET';
  else if(p.x<-25 && p.z>25)loc='RESIDENTIAL';
  else if(p.x<-25 && p.z<-20)loc='SAKURA DISTRICT';
  else if(p.z<-65)loc='MOUNTAIN OUTSKIRTS';
  if(loc!==state.location){state.location=loc;updateHUD();toast(loc)}
}

function movePlayer(dt){
  if(state.vehicle.driving)return;
  const mag=Math.hypot(input.x,input.y);
  if(mag<.05)return;
  const forward=new THREE.Vector3(Math.sin(camYaw),0,Math.cos(camYaw));
  const right=new THREE.Vector3(Math.cos(camYaw),0,-Math.sin(camYaw));
  const dir=new THREE.Vector3().addScaledVector(right,input.x).addScaledVector(forward,input.y);
  if(dir.lengthSq()>0)dir.normalize();
  const speed=6.2;
  player.position.addScaledVector(dir,dt*speed);
  player.position.x=THREE.MathUtils.clamp(player.position.x,-115,115);
  player.position.z=THREE.MathUtils.clamp(player.position.z,-115,115);
  if(dir.lengthSq()>0)player.rotation.y=Math.atan2(dir.x,dir.z);
  if(!state.quests.city_walk.done && player.position.distanceTo(new THREE.Vector3(0,0,0))>12){
    state.quests.city_walk.done=true;state.coins+=20;updateHUD();saveGame();toast('First Steps complete +20');
  }
  updateLocation();
}

function updateCamera(dt){
  const target=player.position.clone().add(new THREE.Vector3(0,1.4,0));
  const dist=7.5;
  const desired=new THREE.Vector3(
    target.x-Math.sin(camYaw)*dist,
    target.y+Math.sin(camPitch)*dist,
    target.z-Math.cos(camYaw)*dist
  );
  camera.position.lerp(desired,1-Math.pow(.001,dt));
  camera.lookAt(target);
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
  g.add(shed.clone());
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

function harvestNearestCrop(){
  const farmCenter=new THREE.Vector3(-55,0,-48);
  if(player.position.distanceTo(farmCenter)>28){toast('Go to the farm first.');return;}
  const crop=Math.random()<.55?'carrot':'strawberry';
  state.inventory[crop]=(state.inventory[crop]||0)+1;
  state.farm.ready.push(crop);
  state.coins+=4;
  updateHUD(); saveGame();
  toast(`Harvested ${crop} +4 coins`);
}

function waterFarm(){
  const farmCenter=new THREE.Vector3(-55,0,-48);
  if(player.position.distanceTo(farmCenter)>28){toast('Go to the farm first.');return;}
  state.farm.watered.push(Date.now());
  toast('Crops watered 💧');
}

function fish(){
  const spot=new THREE.Vector3(72,0,-42);
  if(player.position.distanceTo(spot)>18){toast('Go to the fishing spot.');return;}
  if(systems.fishCooldown>0){toast('Wait for the fish bite…');return;}
  systems.fishCooldown=2.5;
  state.fishing.casts++;
  setTimeout(()=>{
    const rare=Math.random()<.14;
    const key=rare?'fish_rare':'fish_common';
    state.inventory[key]++;
    state.fishing.catches++;
    state.coins+=rare?30:8;
    updateHUD();saveGame();
    toast(rare?'✨ RARE FISH! +30 coins':'Fish caught! +8 coins');
  },1800);
  toast('Line cast…');
}

function togglePet(){
  if(!state.pets.owned){
    if(!spend(35)){toast('Mochi costs 35 coins');return;}
    state.pets.owned=1; state.pets.active='Mochi'; state.quests.adopt_pet.done=true;
    activePet.visible=true;
    updateHUD();saveGame();toast('You adopted Mochi 🐾');
    return;
  }
  activePet.visible=!activePet.visible;
  toast(activePet.visible?'Mochi is following you!':'Mochi is resting.');
}

function buyVehicle(){
  if(state.vehicle.owned){vehicle.visible=!vehicle.visible;toast(vehicle.visible?'Vehicle spawned 🚗':'Vehicle parked.');return;}
  if(!spend(100)){toast('Vehicle costs 100 coins');return;}
  state.vehicle.owned=true;vehicle.visible=true;
  updateHUD();saveGame();toast('Dreamy Car unlocked!');
}

function useInteractable(){
  if(systems.interactionCooldown>0)return;
  systems.interactionCooldown=.4;
  const p=player.position;
  const farm=new THREE.Vector3(-55,0,-48);
  const fishSpot=new THREE.Vector3(72,0,-42);
  if(p.distanceTo(farm)<25){harvestNearestCrop();return;}
  if(p.distanceTo(fishSpot)<18){fish();return;}
  if(p.distanceTo(new THREE.Vector3(72,0,-5))<14){toast('Train Station — transport system ready for expansion.');return;}
  if(p.distanceTo(new THREE.Vector3(78,0,25))<14){toast('Arcade District — mini-games coming into this hub.');return;}
  if(p.distanceTo(new THREE.Vector3(5,0,20))<8){buyVehicle();return;}
  let nearest=null,d=999;
  for(const n of npcs){const dd=n.position.distanceTo(p);if(dd<d){d=dd;nearest=n}}
  if(nearest && d<4){
    toast('You talked to '+nearest.userData.name+' ✨');
    if(!state.quests.meet_friend.done){state.quests.meet_friend.done=true;state.coins+=15;updateHUD();saveGame();toast('Friendship quest complete +15');}
    return;
  }
  toast('Nothing nearby to interact with.');
}

function updatePet(dt){
  if(!activePet.visible)return;
  const target=player.position.clone().add(new THREE.Vector3(-1.4,0,1.4));
  const dir=target.sub(activePet.position);dir.y=0;
  if(dir.length()>1.1){dir.normalize();activePet.position.addScaledVector(dir,dt*3.4);activePet.rotation.y=Math.atan2(dir.x,dir.z);}
  activePet.position.y=Math.abs(Math.sin(performance.now()*.006))*.08;
}

function updateVehicle(){
  if(!vehicle.visible)return;
  if(player.position.distanceTo(vehicle.position)<3){
    // visual proximity indicator only; driving system will be expanded later
    vehicle.rotation.y=player.rotation.y;
  }
}

function createMapPanel(){
  const panel=document.createElement('div');
  panel.id='mapPanel';panel.className='panel glass hidden';
  panel.innerHTML=`<div class="panel-head"><b>DREAMY ISLAND MAP</b><button class="close">×</button></div>
  <div class="map-grid">
    <div>⛰️ MOUNTAIN<br><small>Waterfall • Secrets</small></div>
    <div>🌸 SAKURA<br><small>Tea House • Gardens</small></div>
    <div>🏘️ RESIDENTIAL<br><small>Homes • Pets</small></div>
    <div>🏙️ CITY CENTER<br><small>Plaza • Shops</small></div>
    <div>🍜 RESTAURANT<br><small>Tycoon • Cooking</small></div>
    <div>🌾 FARM<br><small>Grow • Harvest</small></div>
    <div>🎡 ARCADE<br><small>Mini-games</small></div>
    <div>🌴 BEACH<br><small>Fishing • Harbor</small></div>
  </div>`;
  document.body.appendChild(panel);
  panel.querySelector('.close').onclick=()=>panel.classList.add('hidden');
  return panel;
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
    [[15,.4,.4,0xf3c4d5,0,2,-6.5],[15,.4,.4,0xf3c4d5,0,2,6.5],
     [.4,4,13,0xf3c4d5,-7.5,2,0],[.4,4,13,0xf3c4d5,7.5,2,0]].forEach(a=>{
      const m=box(a[0],4,a[2],a[3],.72);m.position.set(a[4],2,a[5]);houseGroup.add(m);
    });
    const door=box(2.1,2.7,.35,0x866277,.45);door.position.set(0,1.45,6.7);houseGroup.add(door);
  }
  if(s>=3)for(const x of [-4,-1.3,1.3,4]){const w=box(1.8,1.2,.1,0x9ed9dc,.18);w.position.set(x,2.35,6.72);houseGroup.add(w);}
  if(s>=4){const roof=box(16,.55,14,0xf4d6e2,.65);roof.position.y=4.2;houseGroup.add(roof);}
  if(s>=5){const k=box(5,1.9,3.8,0xe8d4d7,.7);k.position.set(-4,1.2,-2);houseGroup.add(k);}
  if(s>=6){const bed=box(4,.55,2.4,0xe7a8c4,.55);bed.position.set(3,1,-2);houseGroup.add(bed);}
  if(s>=7)for(let x=-6;x<=6;x+=3){const t=box(.35,1.5,.35,0x8e6c55,.9);t.position.set(x,.75,5);houseGroup.add(t);}
  if(s>=8){for(let x=-4;x<=4;x+=2.7){const chair=box(.65,.9,.65,0xa98b9a,.7);chair.position.set(x,.55,2);houseGroup.add(chair);}state.house.furniture=4;}
}

function renderHouse(){
  let p=document.getElementById('housePanel');
  if(p)p.remove();
  p=document.createElement('div');p.id='housePanel';p.className='panel glass';
  p.innerHTML='<div class="panel-head"><b>MY HOME</b><button class="close">×</button></div><div class="build-hint">Build your home stage by stage. Every purchase changes the actual house.</div><div id="houseList"></div>';
  document.body.appendChild(p);
  p.querySelector('.close').onclick=()=>p.remove();
  const list=p.querySelector('#houseList');
  houseStages.forEach((s,i)=>{
    const row=document.createElement('div');row.className='build-row';
    row.innerHTML=`<div class="build-info"><div class="build-name">${i<state.house.stage?'✓ ':''}${s[0]}</div><div class="build-cost">${s[1]?' '+s[1]+' coins':'FREE'}</div></div>`;
    const b=document.createElement('button'); b.textContent=i<state.house.stage?'BUILT':i===state.house.stage?'BUILD':'LOCKED'; b.disabled=i!==state.house.stage;
    b.onclick=()=>{if(s[1]===0||spend(s[1])){state.house.stage++;applyHouseStage();updateHUD();saveGame();renderHouse();toast(s[0]+' built!');}};
    row.appendChild(b);list.appendChild(row);
  });
}

function cookRecipe(){
  if(state.restaurantStage<5){toast('Build the kitchen first.');return;}
  const r=recipes[Math.floor(Math.random()*recipes.length)];
  if(!spend(r.cost)){toast('Not enough coins for ingredients.');return;}
  state.cooking.prepared++;
  toast('Cooking '+r.name+'…');
  setTimeout(()=>{
    state.cooking.served++; state.restaurant.served++; state.restaurant.reputation=Math.min(100,state.restaurant.reputation+1);
    state.coins+=r.reward; updateHUD(); saveGame(); toast(r.name+' served +'+r.reward+' coins');
  },1200);
}

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
  const t=performance.now()/1000;
  for(const c of restaurantCustomers){
    const target=new THREE.Vector3(50+Math.sin(t*.16+c.userData.phase)*5,0,18+Math.cos(t*.16+c.userData.phase)*4);
    const d=target.sub(c.position); d.y=0;
    if(d.length()>1){d.normalize();c.position.addScaledVector(d,dt*.7);c.rotation.y=Math.atan2(d.x,d.z);}
  }
}

function startDriving(){
  if(!state.vehicle.owned){toast('Buy the Dreamy Car first.');return;}
  state.vehicle.driving=!state.vehicle.driving;
  vehicle.visible=true;
  if(state.vehicle.driving){player.visible=false;vehicle.position.copy(player.position);toast('Driving mode 🚗 — use joystick');}
  else{player.visible=true;player.position.copy(vehicle.position);toast('Parked');}
}

function updateDriving(dt){
  if(!state.vehicle.driving)return;
  const m=Math.hypot(input.x,input.y);
  if(m<.05)return;
  const d=new THREE.Vector3(input.x,0,input.y).normalize();
  vehicle.position.addScaledVector(d,dt*10);
  vehicle.position.x=THREE.MathUtils.clamp(vehicle.position.x,-115,115);
  vehicle.position.z=THREE.MathUtils.clamp(vehicle.position.z,-115,115);
  vehicle.rotation.y=Math.atan2(d.x,d.z);
  player.position.copy(vehicle.position);
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
  createRestaurantWorkers();
  createCustomers();
  createStreetDetails();
  loadPlayerGLB();
  mapPanel=createMapPanel();
  applyRestaurantStage();
}

function boot(){
  loadGame();
  $('quality').value=state.quality;
  buildWorld();
  applyHouseStage();
  updateHUD();
  setQuality(state.quality);
  const loading=$('loading'),bar=$('loadBar'),txt=$('loadText');
  let p=0;
  const timer=setInterval(()=>{
    p=Math.min(100,p+Math.random()*18);
    bar.style.width=p+'%';
    txt.textContent=p<35?'Loading world…':p<70?'Building districts…':'Finishing details…';
    if(p>=100){clearInterval(timer);loading.style.opacity='0';setTimeout(()=>loading.remove(),500);}
  },100);
}
boot();

let last=performance.now();
function animate(now){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  systems.fishCooldown=Math.max(0,systems.fishCooldown-dt);
  systems.interactionCooldown=Math.max(0,systems.interactionCooldown-dt);
  movePlayer(dt);updateDriving(dt);updateNPCs(dt);updatePet(dt);updateVehicle();updateRestaurant(dt);updateCamera(dt);updateTime(dt);debugUpdate(dt);
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
  if(e.key.toLowerCase()==='v')state.vehicle.owned?startDriving():buyVehicle();
});

window.addEventListener('pagehide',()=>{try{saveGame()}catch{}});
