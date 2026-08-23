import React,{useEffect,useState}from"react";
import{Routes,Route,Navigate,Link,useNavigate}from"react-router-dom";
import api from"./lib/api";
import{saveSession,user,logout,isAdminRole,isAuthenticated}from"./lib/auth";

function Login(){
 const [form,setForm]=useState({email:"",password:""});
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const navigate=useNavigate();
 async function submit(e){
  e.preventDefault();setError("");setLoading(true);
  try{
   const response=await api.post("/auth/login",form);
   const payload=response?.data;
   if(!payload?.success||!payload?.data?.user)throw new Error(payload?.message||"Login failed");
   if(!isAdminRole(payload.data.user.role))throw new Error("Administrator account required");
   saveSession(payload);
   navigate("/",{replace:true});
  }catch(err){setError(err.response?.data?.message||err.message||"Login failed");}
  finally{setLoading(false)}
 }
 return <div className="auth"><div className="authbox"><h1>VexaTrade Admin</h1><p className="muted">Administration Console</p><form onSubmit={submit}>
  <input type="email" placeholder="Admin email" autoComplete="username" value={form.email} required onChange={e=>setForm({...form,email:e.target.value})}/>
  <input type="password" placeholder="Password" autoComplete="current-password" value={form.password} required onChange={e=>setForm({...form,password:e.target.value})}/>
  {error&&<div className="error">{error}</div>}
  <button className="primary" disabled={loading}>{loading?"Signing in…":"Sign in"}</button>
 </form></div></div>
}

function Protected({children}){
 const u=user();
 return isAuthenticated()&&isAdminRole(u?.role)?children:<Navigate to="/login" replace/>;
}

function Shell(){
 const navigate=useNavigate();
 return <div className="app"><aside><div className="brand">VexaTrade Admin</div><p className="muted">Operations Console</p><nav>
  <Link to="/">Dashboard</Link><Link to="/applications">KYC Applications</Link><Link to="/users">Users</Link>
 </nav><button className="logout" onClick={()=>{logout();navigate("/login",{replace:true})}}>Sign out</button></aside><main><Routes>
   <Route path="/" element={<Dashboard/>}/><Route path="/applications" element={<Applications/>}/><Route path="/users" element={<Users/>}/>
  </Routes></main></div>
}

function Dashboard(){
 const[counts,setCounts]=useState({});const[error,setError]=useState("");
 useEffect(()=>{api.get("/admin/dashboard").then(r=>setCounts(r.data?.data?.counts||r.data?.counts||{})).catch(e=>setError(e.response?.data?.message||"Unable to load dashboard"))},[]);
 return <><h1>Admin Dashboard</h1>{error&&<div className="error">{error}</div>}<div className="grid">{Object.entries(counts).map(([k,v])=><div className="stat" key={k}><span>{k}</span><strong>{String(v)}</strong></div>)}</div><section className="panel"><Link className="primary" to="/applications">Open KYC review queue</Link></section></>
}

function Applications(){
 const[rows,setRows]=useState([]),[status,setStatus]=useState(""),[error,setError]=useState("");
 const load=()=>api.get("/admin/applications",{params:status?{status}:undefined}).then(r=>setRows(r.data?.data?.applications||r.data?.applications||[])).catch(e=>setError(e.response?.data?.message||"Unable to load applications"));
 useEffect(()=>{load()},[status]);
 async function review(id,action){const reason=action==="reject"?(window.prompt("Reason")||"Rejected"):"";try{await api.patch(`/admin/applications/${id}/review`,{action,reason});load()}catch(e){setError(e.response?.data?.message||"Review failed")}}
 return <><h1>KYC Applications</h1>{error&&<div className="error">{error}</div>}<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All</option><option value="pending">Pending</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><section className="panel">{rows.length?rows.map(x=><article className="application" key={x._id||x.id}><div><h2>{x.fullName||x.user?.name||"Applicant"}</h2><p>{x.country||""} {x.address?`· ${x.address}`:""}</p><span className="muted">{x.status}</span></div><div className="actions">{x.status!=="approved"&&x.status!=="rejected"&&<><button onClick={()=>review(x._id||x.id,"under_review")}>Review</button><button className="ok" onClick={()=>review(x._id||x.id,"approve")}>Approve</button><button className="danger" onClick={()=>review(x._id||x.id,"reject")}>Reject</button></>}</div></article>):<p className="muted">No applications found.</p>}</section></>
}

function Users(){return <><h1>Users</h1><section className="panel"><p className="muted">Authenticated administration area.</p></section></>}

export default function App(){return <Routes><Route path="/login" element={user()&&isAdminRole(user()?.role)?<Navigate to="/" replace/>:<Login/>}/><Route path="/*" element={<Protected><Shell/></Protected>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>}
