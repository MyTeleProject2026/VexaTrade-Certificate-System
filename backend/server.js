require("dotenv").config();
const fs=require("fs"),path=require("path"),http=require("http"),express=require("express"),cors=require("cors"),helmet=require("helmet"),compression=require("compression"),session=require("express-session"),rateLimit=require("express-rate-limit"),{Server}=require("socket.io"),{v4:uuidv4}=require("uuid");
const {connectDB,closeDB}=require("./src/config/database");
const redis=require("./src/config/redis");
const logger=require("./src/config/logger");
const errorMiddleware=require("./src/middleware/error.middleware");
const notFound=errorMiddleware.notFound,errorHandler=errorMiddleware.errorHandler;
const authRoutes=require("./src/routes/auth.routes"),applicationRoutes=require("./src/routes/application.routes"),adminRoutes=require("./src/routes/admin.routes"),certificateRoutes=require("./src/routes/certificate.routes"),notificationRoutes=require("./src/routes/notification.routes");
const app=express(),server=http.createServer(app);
const allowedOrigins=(process.env.CORS_ORIGIN||"http://localhost:3000").split(",").map(v=>v.trim()).filter(Boolean);
const io=new Server(server,{cors:{origin:allowedOrigins,credentials:true}});app.set("io",io);app.set("trust proxy",Number(process.env.TRUST_PROXY||1));
fs.mkdirSync(path.resolve(process.env.UPLOAD_DIR||"./uploads"),{recursive:true});
app.disable("x-powered-by");app.use(helmet({crossOriginResourcePolicy:{policy:"cross-origin"}}));app.use(cors({origin(o,cb){if(!o||allowedOrigins.includes(o))return cb(null,true);cb(new Error("CORS origin denied"));},credentials:true}));app.use(compression());app.use(express.json({limit:"2mb"}));app.use(express.urlencoded({extended:true,limit:"5mb"}));
app.use(session({secret:process.env.SESSION_SECRET||uuidv4(),resave:false,saveUninitialized:false,cookie:{httpOnly:true,secure:String(process.env.COOKIE_SECURE)==="true",sameSite:process.env.COOKIE_SAME_SITE||"lax",maxAge:86400000}}));
app.use("/api",rateLimit({windowMs:Number(process.env.RATE_LIMIT_WINDOW_MINUTES||15)*60000,limit:Number(process.env.RATE_LIMIT_MAX||100),standardHeaders:"draft-8",legacyHeaders:false,message:{success:false,message:"Too many requests. Please try again later."}}));
app.use((req,res,next)=>{const id=req.headers["x-request-id"]||uuidv4();req.requestId=id;res.setHeader("x-request-id",id);const started=Date.now();res.on("finish",()=>logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now()-started}ms requestId=${id}`));next();});
app.get("/health",(req,res)=>res.json({success:true,status:"ok",timestamp:new Date().toISOString(),uptime:process.uptime(),services:{tidb:"connected",redis:redis.isReady?"connected":"disabled"},environment:process.env.NODE_ENV||"development",version:require("./package.json").version}));
if(String(process.env.MAINTENANCE_MODE)==="true")app.use("/api",(req,res)=>res.status(503).json({success:false,message:process.env.MAINTENANCE_MESSAGE||"System is temporarily under maintenance."}));
app.use("/api/auth",authRoutes);app.use("/api/applications",applicationRoutes);app.use("/api/admin",adminRoutes);app.use("/api/certificates",certificateRoutes);app.use("/api/notifications",notificationRoutes);app.use(notFound);app.use(errorHandler);
io.use((socket,next)=>{try{const token=socket.handshake.auth?.token;if(token){const jwt=require("jsonwebtoken"),d=jwt.verify(token,process.env.JWT_SECRET);socket.userId=String(d.userId);socket.role=d.role;}}catch(_){}next();});
io.on("connection",socket=>{if(socket.userId)socket.join(`user-${socket.userId}`);if(["admin","super_admin","verifier"].includes(socket.role))socket.join("admin-room");socket.on("join-user",id=>{if(socket.userId&&String(socket.userId)===String(id))socket.join(`user-${id}`);});});
let listener;
async function start(){logger.info(`Starting VexaTrade backend; NODE_ENV=${process.env.NODE_ENV||"development"}`);await connectDB();logger.info("TiDB MySQL startup check passed");await redis.connect();logger.info(`Redis startup check: ${redis.enabled?(redis.isReady?"connected":"not ready"):"disabled"}`);const port=Number(process.env.PORT||5000),host=process.env.HOST||"0.0.0.0";listener=server.listen(port,host,()=>logger.info(`VexaTrade backend listening on ${host}:${port}`));}
async function shutdown(signal){logger.info(`${signal} received; shutting down`);if(listener)await new Promise(r=>listener.close(r));await redis.quit();await closeDB();process.exit(0);}
process.on("SIGINT",()=>shutdown("SIGINT"));process.on("SIGTERM",()=>shutdown("SIGTERM"));
if(require.main===module)start().catch(err=>{console.error("FATAL STARTUP ERROR:",err.stack||err.message||err);logger.error(`FATAL STARTUP ERROR: ${err.stack||err.message||err}`);process.exit(1);});
module.exports={app,server,io};
