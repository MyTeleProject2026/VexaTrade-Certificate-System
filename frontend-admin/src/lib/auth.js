export function saveSession(d){localStorage.setItem("accessToken",d.accessToken);if(d.refreshToken)localStorage.setItem("refreshToken",d.refreshToken);if(d.user)localStorage.setItem("user",JSON.stringify(d.user))}
export function user(){try{return JSON.parse(localStorage.getItem("user")||"null")}catch{return null}}
export function logout(){localStorage.clear()}