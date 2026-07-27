require('dotenv').config();
const http = require('http');
const initSocket = require('./src/config/socket');

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer();
initSocket(httpServer, process.env.CLIENT_ORIGIN);

httpServer.listen(PORT, () => {
  console.log(`[server] real-time layer listening on port ${PORT}`);
});
