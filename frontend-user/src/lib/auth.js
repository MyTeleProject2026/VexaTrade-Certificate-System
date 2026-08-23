const ACCESS_KEY="accessToken";
const REFRESH_KEY="refreshToken";
const USER_KEY="user";
export function saveSession(response){const payload=response?.data?.accessToken?response.data:response;if(!payload?.accessToken||!payload?.user)throw new Error("Invalid authentication response");localStorage.setItem(ACCESS_KEY,payload.accessToken);if(payload.refreshToken)localStorage.setItem(REFRESH_KEY,payload.refreshToken);localStorage.setItem(USER_KEY,JSON.stringify(payload.user));return payload.user}
export function user(){try{return JSON.parse(localStorage.getItem(USER_KEY)||"null")}catch{return null}}
export function token(){return localStorage.getItem(ACCESS_KEY)}
export function isAuthenticated(){return Boolean(token()&&user())}
export function logout(){localStorage.removeItem(ACCESS_KEY);localStorage.removeItem(REFRESH_KEY);localStorage.removeItem(USER_KEY)}
