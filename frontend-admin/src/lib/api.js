import axios from "axios";
import { logout } from "./auth";

const api=axios.create({baseURL:import.meta.env.VITE_API_URL||"http://localhost:5000/api"});
let refreshing=null;
api.interceptors.request.use(config=>{const token=localStorage.getItem("accessToken");if(token)config.headers.Authorization=`Bearer ${token}`;return config});
async function refreshAccessToken(){
  if(!refreshing){refreshing=(async()=>{const refreshToken=localStorage.getItem("refreshToken");if(!refreshToken)throw new Error("No refresh token");const r=await axios.post(`${api.defaults.baseURL}/auth/refresh`,{refreshToken});const token=r.data?.data?.accessToken||r.data?.data?.token;if(!token)throw new Error("Refresh response did not contain an access token");localStorage.setItem("accessToken",token);return token})().finally(()=>{refreshing=null})}
  return refreshing;
}
api.interceptors.response.use(r=>r,async error=>{
  const original=error.config;const status=error.response?.status;const message=String(error.response?.data?.message||"").toLowerCase();
  const isAuthEndpoint=original?.url?.includes("/auth/login")||original?.url?.includes("/auth/refresh")||original?.url?.includes("/auth/register");
  if(status===401&&!(original?._retry)&&!isAuthEndpoint&&(message.includes("expired")||message.includes("token")||message.includes("authentication"))){
    original._retry=true;
    try{const token=await refreshAccessToken();original.headers=original.headers||{};original.headers.Authorization=`Bearer ${token}`;return api(original)}catch(e){logout();window.dispatchEvent(new CustomEvent("auth:expired"))}
  }
  return Promise.reject(error);
});
export default api;
