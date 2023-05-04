const express = require('express')
const app = express()
require('dotenv').config()
const pool = require('./utils/db')

const cors = require('cors')
app.use(
  cors({
    origin: ['http://localhost:3000'],
    credentials: true,
  })
)

//for聊天室
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
})
io.on('connection', (socket) => {
  console.log(socket.id)

  socket.on('join_room', (data) => {
    console.log(data)
    socket.join(data)
  })

  socket.on('send_message', (data) => {
    // console.log(data);
    socket.to(data.room).emit('recieve_message', data)
  })

  socket.on('disconnect', () => {
    console.log('user disconnected', socket.id)
  })
})

app.use(express.json())

const expressSession = require('express-session')
const FileStore = require('session-file-store')(expressSession)
const path = require('path')
app.use(
  expressSession({
    store: new FileStore({ path: path.join(__dirname, '..', 'sessions') }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
)

const authRouter = require('./routers/authRouter')
const { Socket } = require('dgram')
const { log } = require('console')
app.use('/api/auth', authRouter)

const chatRouter = require('./routers/chatRouter')
app.use('/api/chat', chatRouter)

const useCoupon = require('./routers/useCoupon')
app.use('/api/usecoupon', useCoupon)

// 成立訂單
const paymentRouter = require('./routers/paymentRouter')
app.use('/api/payment', paymentRouter)

app.get('/', (req, res, next) => {
  console.log('首頁')
  res.send('test')
})

// 使用 pool 方法
// inspiration
app.get('/api/list', async (req, res, next) => {
  let [data] = await pool.query('SELECT * FROM inspiration')
  res.json(data)
})

const userRouter = require('./routers/userRouter')
app.use('/api/user', userRouter)

const productRouter = require('./routers/productRouter')
app.use('/api/products', productRouter)

const sellerRouter = require('./routers/sellerRouter')
app.use('/api/seller', sellerRouter)

const usedProduct = require('./routers/usedProductRouter')
app.use(usedProduct)

const usedPlatform = require('./routers/usedPlatformRouter')
app.use(usedPlatform)

app.use((req, res, next) => {
  console.log('這裡是 404')
  res.send('404 not found')
})

// app.listen(3001, () => {
//   console.log('Server running at port 3001');
// });
server.listen(3001, () => {
  console.log('Server running at port 3001')
})
