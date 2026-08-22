const { v4: uuidv4 } = require("uuid");
const { getPool } = require("../config/database");

function getPath(obj, path) {
  return path.split(".").reduce((v, k) => (v == null ? undefined : v[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split("."); let cur = obj;
  keys.forEach((k, i) => { if (i === keys.length - 1) cur[k] = value; else cur = cur[k] ||= {}; });
}
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function decorate(value) {
  if (Array.isArray(value)) { value.forEach(decorate); return value; }
  if (!value || typeof value !== "object") return value;
  Object.keys(value).forEach(k => decorate(value[k]));
  if (!Object.prototype.hasOwnProperty.call(value, "toObject")) Object.defineProperty(value, "toObject", { enumerable:false, value:()=>clone(value) });
  return value;
}
function equal(a,b) { return String(a) === String(b); }
function matchesValue(actual, expected) {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    if (Object.prototype.hasOwnProperty.call(expected,"$in")) return expected.$in.some(x => equal(actual,x));
    if (Object.prototype.hasOwnProperty.call(expected,"$nin")) return !expected.$nin.some(x => equal(actual,x));
    if (Object.prototype.hasOwnProperty.call(expected,"$ne")) return !equal(actual,expected.$ne);
    if (Object.prototype.hasOwnProperty.call(expected,"$exists")) return expected.$exists ? actual !== undefined : actual === undefined;
    if (Object.prototype.hasOwnProperty.call(expected,"$gte")) return actual >= expected.$gte;
    if (Object.prototype.hasOwnProperty.call(expected,"$gt")) return actual > expected.$gt;
    if (Object.prototype.hasOwnProperty.call(expected,"$lte")) return actual <= expected.$lte;
    if (Object.prototype.hasOwnProperty.call(expected,"$lt")) return actual < expected.$lt;
  }
  if (Array.isArray(actual)) return actual.some(x => equal(x,expected));
  return equal(actual,expected);
}
function matches(doc, filter={}) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === "$or") return expected.some(f => matches(doc,f));
    if (key === "$and") return expected.every(f => matches(doc,f));
    return matchesValue(getPath(doc,key), expected);
  });
}
function applyUpdate(doc, update) {
  const direct = Object.fromEntries(Object.entries(update).filter(([k]) => !k.startsWith("$")));
  Object.assign(doc, direct);
  if (update.$set) for (const [k,v] of Object.entries(update.$set)) setPath(doc,k,v);
  if (update.$unset) for (const k of Object.keys(update.$unset)) { const parts=k.split("."); const last=parts.pop(); const parent=getPath(doc,parts.join(".")); if(parent) delete parent[last]; }
  if (update.$inc) for (const [k,v] of Object.entries(update.$inc)) setPath(doc,k,Number(getPath(doc,k)||0)+Number(v));
  if (update.$push) for (const [k,v] of Object.entries(update.$push)) { const arr=getPath(doc,k); if(Array.isArray(arr)) arr.push(v); else setPath(doc,k,[v]); }
  if (update.$addToSet) for (const [k,v] of Object.entries(update.$addToSet)) { const arr=getPath(doc,k); if(Array.isArray(arr) && !arr.some(x=>JSON.stringify(x)===JSON.stringify(v))) arr.push(v); else if(!arr) setPath(doc,k,[v]); }
  return doc;
}

class Query {
  constructor(Model, filter, single=false) { this.Model=Model; this.filter=filter||{}; this.single=single; this.opts={}; }
  select(value) { this.opts.select=value; return this; }
  sort(value) { this.opts.sort=value; return this; }
  skip(value) { this.opts.skip=Number(value)||0; return this; }
  limit(value) { this.opts.limit=Number(value)||0; return this; }
  populate(path, select) { (this.opts.populate ||= []).push({path,select}); return this; }
  async exec() { let rows=await this.Model._all(); rows=rows.filter(x=>matches(x,this.filter));
    if(this.opts.sort){ const [field,dir]=Object.entries(this.opts.sort)[0]; rows.sort((a,b)=>{const av=getPath(a,field),bv=getPath(b,field); return (av>bv?1:av<bv?-1:0)*Number(dir||1);}); }
    if(this.opts.skip) rows=rows.slice(this.opts.skip); if(this.opts.limit) rows=rows.slice(0,this.opts.limit);
    rows=await Promise.all(rows.map(x=>this.Model._hydrate(x,this.opts))); return this.single?(rows[0]||null):rows;
  }
  then(resolve,reject){return this.exec().then(resolve,reject);}
  catch(reject){return this.exec().catch(reject);}
}

class MysqlModel {
  static collection="documents";
  constructor(data={}) { Object.assign(this,clone(data)); if(!this._id)this._id=uuidv4(); const now=new Date(); this.createdAt ||= now; this.updatedAt ||= now; decorate(this); }
  static _raw(row){ if(!row)return null; return {...JSON.parse(row.data),_id:row.id,createdAt:row.created_at,updatedAt:row.updated_at}; }
  static async _all(){ const [rows]=await getPool().query("SELECT id,data,created_at,updated_at FROM app_documents WHERE collection=?",[this.collection]); return rows.map(r=>this._raw(r)); }
  static async _hydrate(data,opts={}) { const obj=new this(data); if(this.collection==="users" && opts.select !== "+passwordHash" && (!opts.select || !opts.select.includes("+passwordHash"))) delete obj.passwordHash; if(opts.select && opts.select.startsWith("-")) delete obj[opts.select.slice(1)]; if(opts.populate) for(const p of opts.populate) await this._populate(obj,p); return obj; }
  static async _populate(obj,{path}) { const ref=obj[path]; if(!ref)return; const map={userId:"users",assignedTo:"users",reviewedBy:"users",issuedBy:"users",revokedBy:"users"}; const collection=map[path]; if(!collection)return; const Model=MODEL_REGISTRY[collection]; if(Array.isArray(ref)) obj[path]=await Promise.all(ref.map(id=>Model.findById(id))); else obj[path]=await Model.findById(ref); }
  static find(filter={}){return new Query(this,filter,false)}
  static findOne(filter={}){return new Query(this,filter,true)}
  static findById(id){return new Query(this,{_id:id},true)}
  static async findByIdAndUpdate(id,update,options={}){const obj=await this.findById(id); if(!obj)return null; applyUpdate(obj,update); await obj.save(); return options.new===false?obj:obj;}
  static async create(data){const obj=new this(data); await obj.save(); return obj;}
  static async countDocuments(filter={}){const rows=await this._all(); return rows.filter(x=>matches(x,filter)).length;}
  static async aggregate(pipeline=[]){let rows=await this._all(); for(const stage of pipeline){if(stage.$match)rows=rows.filter(x=>matches(x,stage.$match)); if(stage.$group){const groups=new Map(); const idPath=String(stage.$group._id||"").replace(/^\$/,''); for(const row of rows){const key=getPath(row,idPath); groups.set(String(key),{_id:key,count:(groups.get(String(key))?.count||0)+1});} rows=[...groups.values()];}} return rows;}
  static async deleteMany(filter={}){const rows=(await this._all()).filter(x=>matches(x,filter)); for(const x of rows) await new this(x).deleteOne(); return {deletedCount:rows.length};}
  async save(){this.updatedAt=new Date(); const data=clone(this); delete data.toObject; await getPool().execute("INSERT INTO app_documents (id,collection,data,created_at,updated_at) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE data=VALUES(data),updated_at=VALUES(updated_at)",[this._id,this.constructor.collection,JSON.stringify(data),this.createdAt,this.updatedAt]); return this;}
  async deleteOne(){await getPool().execute("DELETE FROM app_documents WHERE id=? AND collection=?",[this._id,this.constructor.collection]);}
  toJSON(){return clone(this);}
}
const MODEL_REGISTRY={};
function registerModel(collection,Model){MODEL_REGISTRY[collection]=Model; Model.collection=collection; return Model;}
module.exports={MysqlModel,Query,registerModel,decorate,applyUpdate,getPath,setPath};
