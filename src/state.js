// Pure game rules, shared by the browser and regression tests.
export const SAVE_KEY='jojoKittySave';
const finite=(n,d,min=0,max=1e9)=>typeof n==='number'&&Number.isFinite(n)?Math.min(max,Math.max(min,n)):d;
export function migrate(raw){
  const d={version:4,build:'0.4.0',coins:50,quality:'medium',location:'CITY CENTER',time:9.5,day:1,distance:0,
    player:{x:0,z:18,rot:0},restaurantStage:0,inventory:{carrot:0,strawberry:0,fish_common:0,fish_rare:0,wood:0,seeds:3},
    farm:{plots:0,watered:[],ready:[],crops:Array(6).fill(null)},fishing:{casts:0,catches:0},
    pets:{owned:0,active:null,hunger:15,happiness:80},vehicle:{owned:false,x:5,z:20,driving:false},
    house:{stage:0,furniture:0},restaurant:{customers:0,served:0,reputation:0,order:null,staff:false,serial:0},
    cooking:{prepared:0,served:0},friendship:{Mimi:0,Lulu:0,Nono:0,'Chef Coco':0},lastTalk:{},
    quests:{},settings:{debug:false},savedAt:0,arcade:{best:0},collected:[]};
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
    for(const k of ['coins','time','day','distance','restaurantStage','savedAt'])d[k]=finite(raw[k],d[k]);
    for(const k of ['player','inventory','fishing','pets','vehicle','house','restaurant','cooking','friendship','settings','arcade']){
      if(raw[k]&&typeof raw[k]==='object'&&!Array.isArray(raw[k])){
        for(const f of Object.keys(d[k]))if(f in raw[k]){
          if(typeof d[k][f]==='number')d[k][f]=finite(raw[k][f],d[k][f],k==='player'||k==='vehicle'?-115:0);
          else if(typeof d[k][f]==='boolean')d[k][f]=raw[k][f]===true;
          else d[k][f]=raw[k][f];
        }
      }
    }
    if(['low','medium','high'].includes(raw.quality))d.quality=raw.quality;
    if(raw.farm&&Array.isArray(raw.farm.crops))d.farm.crops=Array.from({length:6},(_,i)=>{const c=raw.farm.crops[i];return c&&Number.isFinite(c.plantedAt)?{plantedAt:Math.max(0,c.plantedAt),watered:c.watered===true,readyAt:finite(c.readyAt,0)}:null;});
    if(Array.isArray(raw.collected))d.collected=[...new Set(raw.collected.filter(x=>typeof x==='string'))];
    for(const name of Object.keys(d.friendship))d.lastTalk[name]=finite(raw.lastTalk?.[name],0);
  }
  for(const id of ['city_walk','restaurant_start','meet_friend','open_restaurant','adopt_pet','first_harvest','first_fish','first_service'])d.quests[id]={done:raw?.quests?.[id]?.done===true,progress:finite(raw?.quests?.[id]?.progress,0)};
  d.restaurantStage=Math.min(9,Math.floor(d.restaurantStage));d.house.stage=Math.min(8,Math.floor(d.house.stage));
  d.pets.hunger=Math.min(100,d.pets.hunger);d.pets.happiness=Math.min(100,d.pets.happiness);
  d.time%=24;d.vehicle.driving=false;
  const o=d.restaurant.order;
  if(o&&(!['arriving','ordered','cooking','ready','paid'].includes(o.status)||!Number.isFinite(o.at)))d.restaurant.order=null;
  else if(o)d.restaurant.order={id:finite(o.id,0),status:o.status,at:o.at,readyAt:finite(o.readyAt,0),reward:18};
  return d;
}
export function award(s,id,amount){if(!s.quests[id]||s.quests[id].done)return false;s.quests[id].done=true;s.coins+=amount;return true;}
export function purchase(s,cost,grant){
  if(!Number.isFinite(cost)||cost<0||s.coins<cost)return false;
  const snapshot=structuredClone(s);s.coins-=cost;
  try{grant();return true;}catch(e){Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,snapshot);throw e;}
}
export function plant(s,i,now){if(!Number.isInteger(i)||i<0||i>=6||s.farm.crops[i]||s.inventory.seeds<1)return false;s.inventory.seeds--;s.farm.crops[i]={plantedAt:now,watered:false,readyAt:0};return true;}
export function water(s,i,now){const c=s.farm.crops[i];if(!c||c.watered)return false;c.watered=true;c.readyAt=now+45000;return true;}
export function harvest(s,i,now){const c=s.farm.crops[i];if(!c||!c.watered||now<c.readyAt)return false;s.farm.crops[i]=null;s.inventory.carrot+=3;return true;}
export function beginOrder(s,now){if(s.restaurantStage<6||s.restaurant.order)return false;s.restaurant.serial++;s.restaurant.customers++;s.restaurant.order={id:s.restaurant.serial,status:'arriving',at:now,readyAt:0,reward:18};return true;}
export function advanceOrder(s,now){const o=s.restaurant.order;if(!o)return;if(o.status==='arriving'&&now-o.at>=6000)o.status='ordered';if(o.status==='cooking'&&now>=o.readyAt)o.status='ready';}
export function prepareOrder(s,now){const o=s.restaurant.order;if(!o||o.status!=='ordered')return false;if(s.inventory.carrot>0)s.inventory.carrot--;else if(s.coins>=3)s.coins-=3;else return false;o.status='cooking';o.readyAt=now+6000;s.cooking.prepared++;return true;}
export function serveOrder(s){const o=s.restaurant.order;if(!o||o.status!=='ready')return false;o.status='paid';return true;}
export function collectOrder(s){const o=s.restaurant.order;if(!o||o.status!=='paid')return false;s.coins+=o.reward;s.restaurant.served++;s.cooking.served++;s.restaurant.reputation=Math.min(100,s.restaurant.reputation+2);s.restaurant.order=null;return true;}
