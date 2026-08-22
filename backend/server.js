const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: [process.env.FRONTEND_USER_URL, process.env.FRONTEND_ADMIN_URL], credentials: true }
});
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

app.use(helmet());
app.use(cors({ origin: [process.env.FRONTEND_USER_URL, process.env.FRONTEND_ADMIN_URL], credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', limiter);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

io.on('connection', socket => {
  console.log('🔌 New client connected:', socket.id);
  socket.on('disconnect', () => console.log('🔌 Client disconnected:', socket.id));
});

const authRoutes = require('./src/routes/auth.routes');
const applicationRoutes = require('./src/routes/application.routes');
const adminRoutes = require('./src/routes/admin.routes');
const certificateRoutes = require('./src/routes/certificate.routes');
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/certificates', certificateRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false, message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
module.exports = { app, server, io };