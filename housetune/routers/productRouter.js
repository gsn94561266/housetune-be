const express = require('express')
const router = express.Router()
const pool = require('../utils/db')

// 商品列表
router.get('/', async (req, res, next) => {
  // 取得商品資料
  let data
  // 供貨情況篩選
  const currentStockSwitch = (stock) => {
    switch (stock) {
      case 'InStock':
        return 'AND amount > 0'
      case 'OutStock':
        return 'AND amount = 0'
      default:
        return ''
    }
  }
  // console.log(req.query.currentStock);
  const stock = currentStockSwitch(req.query.currentStock || '')

  // 價格篩選
  let minPrice = ''
  let maxPrice = ''
  if (req.query.currentMin) {
    minPrice = `AND price >= ${req.query.currentMin}`
  }
  if (req.query.currentMax) {
    maxPrice = `AND ${req.query.currentMax} >= price`
  }
  if (req.query.currentMin && req.query.currentMax) {
    maxPrice = `AND (${req.query.currentMax} >= price`
    minPrice = `AND price >= ${req.query.currentMin})`
  }

  // 分類篩選
  let categoryVar = ''
  if (req.query.currentCategory && req.query.currentCategory.length === 1) {
    categoryVar = `AND category_product = ${req.query.currentCategory}`
  } else if (
    req.query.currentCategory &&
    req.query.currentCategory.length > 1
  ) {
    const category = req.query.currentCategory.split(',')
    const categorySlice = category.slice(1)
    const categoryArray = []
    for (let i = 0; i < categorySlice.length; i++) {
      categoryArray.push(`OR category_product = ${categorySlice[i]}`)
    }
    const categoryString = categoryArray.join(' ')
    // console.log(categoryString);
    categoryVar = `AND (category_product = ${category[0]} ${categoryString})`
  }
  // 篩選完 ----

  // 商品搜尋
  let searchVar = ''
  if (req.query.currentSearch) {
    searchVar = `AND product.name LIKE "%${req.query.currentSearch}%"`
  }

  // 條件設定資料抓取
  // 取得庫存
  let [resultInStock] = await pool.execute(
    `SELECT COUNT(*) AS total FROM product WHERE valid = 1 AND amount > 0 ${maxPrice} ${minPrice} ${categoryVar} ${searchVar}`
  )
  let [resultOutStock] = await pool.execute(
    `SELECT COUNT(*) AS total FROM product WHERE valid = 1 AND amount = 0 ${maxPrice} ${minPrice} ${categoryVar} ${searchVar}`
  )
  const inStock = resultInStock[0].total
  const outStock = resultOutStock[0].total
  // 取得分類數量
  const categoryAmount = []
  for (let i = 1; i <= 10; i++) {
    let [result] = await pool.execute(
      `SELECT COUNT(*) AS total,category_product.id AS category_id FROM product JOIN category_product ON product.category_product = category_product.id WHERE valid = 1 AND category_product = ${i} ${stock} ${maxPrice} ${minPrice} ${searchVar} ORDER BY id`
    )
    categoryAmount.push(result[0])
  }
  let [category] = await pool.execute('SELECT * FROM category_product')
  // 條件設定資料抓取完 ----

  // 頁數設定
  const page = req.query.page || 1
  // 取得資料筆數
  let [result] = await pool.execute(
    `SELECT COUNT(*) AS total FROM product WHERE valid = 1 ${stock} ${maxPrice} ${minPrice} ${categoryVar} ${searchVar}`
  )
  const total = result[0].total
  // 一頁20筆
  const perPage = 20
  const totalPage = Math.ceil(total / perPage)
  const limit = perPage
  const offset = perPage * (page - 1)

  // 資料排序
  const currentSortMap = {
    1: 'name ASC',
    2: 'name DESC',
    3: 'price ASC',
    4: 'price DESC',
    5: 'created_at ASC',
    6: 'created_at DESC',
    '': 'prod_id',
  }
  let sort = currentSortMap[req.query.currentSort || '']
  ;[data] = await pool.query(
    `SELECT product.*, category_room.name AS categoryR_name,category_product.name AS categoryP_name FROM (product JOIN category_room ON product.category_room = category_room.id) JOIN category_product ON product.category_product = category_product.id WHERE valid = 1 ${stock} ${maxPrice} ${minPrice} ${categoryVar} ${searchVar} ORDER BY ${sort} Limit ? OFFSET ?`,
    [limit, offset]
  )
  res.json({
    pagination: { total, perPage, totalPage, page },
    data,
    stock: { inStock, outStock },
    category,
    categoryAmount,
  })
})

// 商品列表(房間分類)
router.get('/category/:categoryRoom', async (req, res, next) => {
  // 取得商品資料
  let data
  // 供貨情況篩選
  const currentStockSwitch = (stock) => {
    switch (stock) {
      case 'InStock':
        return 'AND amount > 0'
      case 'OutStock':
        return 'AND amount = 0'
      default:
        return ''
    }
  }
  // console.log(req.query.currentStock);
  const stock = currentStockSwitch(req.query.currentStock || '')

  // 價格篩選
  let minPrice = ''
  let maxPrice = ''
  if (req.query.currentMin) {
    minPrice = `AND price >= ${req.query.currentMin}`
  }
  if (req.query.currentMax) {
    maxPrice = `AND ${req.query.currentMax} >= price`
  }
  if (req.query.currentMin && req.query.currentMax) {
    maxPrice = `AND (${req.query.currentMax} >= price`
    minPrice = `AND price >= ${req.query.currentMin})`
  }

  // 分類篩選
  let categoryVar = ''
  if (req.query.currentCategory && req.query.currentCategory.length === 1) {
    categoryVar = `AND category_product = ${req.query.currentCategory}`
  } else if (
    req.query.currentCategory &&
    req.query.currentCategory.length > 1
  ) {
    const category = req.query.currentCategory.split(',')
    const categorySlice = category.slice(1)
    const categoryArray = []
    for (let i = 0; i < categorySlice.length; i++) {
      categoryArray.push(`OR category_product = ${categorySlice[i]}`)
    }
    const categoryString = categoryArray.join(' ')
    // console.log(categoryString);
    categoryVar = `AND (category_product = ${category[0]} ${categoryString})`
  }
  // 篩選完 ----

  // 條件設定資料抓取
  // 取得庫存
  let [resultInStock] = await pool.execute(
    `SELECT COUNT(*) AS total FROM product WHERE valid = 1 AND category_room=?  AND amount > 0 ${maxPrice} ${minPrice} ${categoryVar}`,
    [req.params.categoryRoom]
  )
  let [resultOutStock] = await pool.execute(
    `SELECT COUNT(*) AS total FROM product WHERE valid = 1 AND category_room=? AND amount = 0 ${maxPrice} ${minPrice} ${categoryVar}`,
    [req.params.categoryRoom]
  )
  const inStock = resultInStock[0].total
  const outStock = resultOutStock[0].total
  // 取得分類數量
  const categoryAmount = []
  for (let i = 1; i <= 10; i++) {
    let [result] = await pool.execute(
      `SELECT COUNT(*) AS total,category_product.id AS category_id FROM product JOIN category_product ON product.category_product = category_product.id WHERE valid = 1 AND category_room=? AND category_product = ${i} ${stock} ${maxPrice} ${minPrice} ORDER BY id`,
      [req.params.categoryRoom]
    )
    categoryAmount.push(result[0])
  }
  let [category] = await pool.execute('SELECT * FROM category_product')
  // 條件設定資料抓取完 ----

  // 頁數設定
  const page = req.query.page || 1
  // 取得資料筆數
  let [result] = await pool.execute(
    `SELECT COUNT(*) AS total FROM product WHERE valid = 1 AND category_room=? ${stock} ${maxPrice} ${minPrice} ${categoryVar}`,
    [req.params.categoryRoom]
  )
  const total = result[0].total
  // 一頁20筆
  const perPage = 20
  const totalPage = Math.ceil(total / perPage)
  const limit = perPage
  const offset = perPage * (page - 1)

  // 資料排序
  const currentSortMap = {
    1: 'name ASC',
    2: 'name DESC',
    3: 'price ASC',
    4: 'price DESC',
    5: 'created_at ASC',
    6: 'created_at DESC',
    '': 'prod_id',
  }
  let sort = currentSortMap[req.query.currentSort || '']
  ;[data] = await pool.query(
    `SELECT product.*, category_room.name AS categoryR_name,category_product.name AS categoryP_name FROM (product JOIN category_room ON product.category_room = category_room.id) JOIN category_product ON product.category_product = category_product.id WHERE valid = 1 AND category_room=? ${stock} ${maxPrice} ${minPrice} ${categoryVar} ORDER BY ${sort} Limit ? OFFSET ?`,
    [req.params.categoryRoom, limit, offset]
  )
  res.json({
    pagination: { total, perPage, totalPage, page },
    data,
    stock: { inStock, outStock },
    category,
    categoryAmount,
  })
})

// slider 資料，新品推薦
router.get('/newArrival', async (req, res, next) => {
  // console.log('newArrival');
  let [data] = await pool.execute(
    'SELECT product.*, category_room.name AS category_name FROM product JOIN category_room ON product.category_room = category_room.id WHERE valid = 1 order by prod_id DESC limit 10'
  )
  res.json(data)
})

// 加入收藏
router.put('/', async (req, res, next) => {
  let result = await pool.execute('UPDATE user SET liked=? WHERE user_id=?', [
    req.body.likeJson,
    req.body.userId,
  ])
  // console.log(req.body);
  res.json({ result: 'ok' })
})

// 獲取收藏資訊
router.get('/liked', async (req, res, next) => {
  if (req.session.member) {
    let [data] = await pool.execute('SELECT * FROM user WHERE user_id=?', [
      req.session.member.id,
    ])
    // console.log(req.session.member.id);
    res.json(data)
  }
})

// 商品細節頁
router.get('/:prodId', async (req, res, next) => {
  let [rating] = await pool.execute(
    'SELECT rating.*, user.name AS user_name From rating JOIN user ON rating.user_id = user.user_id WHERE product_id=?',
    [req.params.prodId]
  )
  let [data] = await pool.execute(
    'SELECT product.*, category_room.name AS categoryR_name FROM product JOIN category_room ON product.category_room = category_room.id WHERE prod_id=?',
    [req.params.prodId]
  )
  res.json({ rating, data })
})

// slider 資料，相關商品推薦
router.get('/:categoryProduct/:prodId', async (req, res, next) => {
  let [data] = await pool.execute(
    'SELECT product.*, category_room.name AS category_name FROM product JOIN category_room ON product.category_room = category_room.id WHERE valid = 1 AND category_product=? AND prod_id != ? AND amount > 0 limit 10',
    [req.params.categoryProduct, req.params.prodId]
  )
  res.json(data)
})

module.exports = router
