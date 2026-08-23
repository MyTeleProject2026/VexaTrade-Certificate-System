import axios from "axios";
import { logout } from "./auth";

const api=axios.create({baseURL:import.meta.env.VITE_API_URL||"http://localhost:5000/api"});
let refreshing=null;

api.interceptors.request.use(config=>{
  const token=localStorage.getItem("accessToken");
  if(token) config.headers.Authorization=`Bearer ${token}`;
  return config;
});

async function refreshAccessToken(){
  if(!refreshing){
    refreshing=(async()=>{
      const refreshToken=localStorage.getItem("refreshToken");
      if(!refreshToken) throw new Error("No refresh token");
      const response=await axios.post(`${api.defaults.baseURL}/auth/refresh`,{refreshToken});
      const accessToken=response.data?.data?.accessToken||response.data?.data?.token;
      if(!accessToken) throw new Error("Refresh response did not contain an access token");
      localStorage.setItem("accessToken",accessToken);
      return accessToken;
    })().finally(()=>{refreshing=null});
  }
  return refreshing;
}

api.interceptors.response.use(response=>response,async error=>{
  const original=error.config;
  const status=error.response?.status;
  const message=String(error.response?.data?.message||"").toLowerCase();
  const isAuthEndpoint=original?.url?.includes("/auth/login")||original?.url?.includes("/auth/refresh")||original?.url?.includes("/auth/register");
  if(status===401&&!original?._retry&&!isAuthEndpoint&&(message.includes("expired")||message.includes("token")||message.includes("authentication"))){
    original._retry=true;
    try{
      const token=await refreshAccessToken();
      original.headers=original.headers||{};
      original.headers.Authorization=`Bearer ${token}`;
      return api(original);
    }catch(refreshError){
      logout();
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
  }
  return Promise.reject(error);
});

export default api;
