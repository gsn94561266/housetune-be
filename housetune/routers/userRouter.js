const argon2 = require('argon2')
const express = require('express')
const router = express.Router()
const pool = require('../utils/db')

// 取得某一筆資料
// 查看 url => http://localhost:3001/api/usecoupon/coupons?couponName=HAPPYYEIN
router.get('/usercoupons', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT valid_coupons FROM user WHERE user_id = ?',
    [req.session.member.id]
  )
  // console.log(data)
  if (data[0].valid_coupons !== null) {
    const checkList = JSON.parse(data[0].valid_coupons)
    let couponDetails = []
    for (let i = 0; i < checkList.length; i++) {
      let [result] = await pool.query(
        'SELECT * FROM coupon WHERE coupon_name = ?',
        [checkList[i]]
      )
      couponDetails.push(result[0])
    }
    // console.log('couponDetails', couponDetails)
    res.json(couponDetails)
  } else {
    res.json({})
  }
})
router.put('/addcoupons', async (req, res, next) => {
  let couponName = req.body.coupon

  let [check] = await pool.execute(
    'SELECT COUNT(*) AS total FROM coupon WHERE coupon_name=?',
    [couponName]
  )
  console.log(check)
  if (check[0].total > 0) {
    let [data] = await pool.query(
      'SELECT valid_coupons FROM user WHERE user_id = ?',
      [req.session.member.id]
    )
    console.log(data[0].valid_coupons)
    if (data[0].valid_coupons) {
      const newData = JSON.parse(data[0].valid_coupons)
      let deleiveData = [...newData, couponName]
      let CouponList = JSON.stringify(deleiveData)
      let [result] = await pool.query(
        'UPDATE user SET valid_coupons=? WHERE user_id = ?',
        [CouponList, req.session.member.id]
      )
      res.json(result)
    } else {
      let firstCoupon = []
      firstCoupon.push(couponName)
      const DeleiveData = JSON.stringify(firstCoupon)
      let [data] = await pool.query(
        'UPDATE user SET valid_coupons=? WHERE user_id = ?',
        [DeleiveData, req.session.member.id]
      )
      res.json(data)
    }
  } else {
    res.json('無此優惠券')
  }
})

//修改密碼
router.put('/resetpwd', async (req, res, next) => {
  console.log(req.body)
  let [members] = await pool.execute('SELECT * FROM user WHERE user_id =?', [
    req.body.userID,
  ])
  console.log(members)
  let member = members[0]
  let result = await argon2.verify(member.password, req.body.oldPwd)
  console.log('比對結果是', result)
  if (result === false) {
    return res.status(400).json({
      errors: [
        {
          msg: '舊密碼輸入錯誤',
        },
      ],
    })
  }
  let newPassword = await argon2.hash(req.body.pwd)
  let response = await pool.execute(
    'UPDATE user SET password=? WHERE user_id =?',
    [newPassword, req.body.userID]
  )
  res.status(200).send('修改密碼成功')
})

router.get('/data', async (req, res, next) => {
  // console.log(req.session.member);
  let [data] = await pool.execute('SELECT * FROM user WHERE user_id=?', [
    req.session.member.id,
  ])
  res.json({ data })
})

//會員更新
router.put('/update', async (req, res, next) => {
  // console.log(req.body.member);
  const id = req.body.id
  const name = req.body.member.name
  const email = req.body.member.email
  const phone = req.body.member.phone
  const address = req.body.member.address
  const bankcode = req.body.member.bankcode
  const bankaccount = req.body.member.bankaccount
  // console.log(id);
  let [data] = await pool.execute(
    'UPDATE user SET name=?,email=?,phone=?,address=?,bank_code=?,bank_account=? WHERE user_id=?',
    [name, email, phone, address, bankcode, bankaccount, id]
  )
  res.json({ msg: '更新成功' })
})

//評價留言
router.post('/rating', async (req, res, next) => {
  let [data] = await pool.execute('SELECT * FROM rating WHERE user_id =?', [
    req.body.id,
  ])
  res.json(data)
})
router.post('/ordercomment', async (req, res, next) => {
  let result = await pool.execute(
    'INSERT INTO rating (stars, comment, product_id, user_id, posted_at) VALUES (?, ?, ?, ?, ?)',
    [
      req.body.stars,
      req.body.comment,
      req.body.prodId,
      req.body.userId,
      req.body.fulltime,
    ]
  )
  let [data] = await pool.execute('SELECT * FROM rating WHERE user_id =?', [
    req.body.userId,
  ])
  res.json(data)
})

// 訂單
router.post('/order', async (req, res, next) => {
  let [data] = await pool.execute(
    'SELECT order_list.*, order_detail.product_id, user.user_id, user.name, user.phone, user.email FROM order_list JOIN user ON order_list.user_id=user.user_id JOIN order_detail ON order_list_id = ordL_id WHERE order_list.user_id =?',
    [req.body.id]
  )
  // console.log(data)
  res.json(data)
})

//追蹤清單
router.post('/liked', async (req, res, next) => {
  let [liked] = await pool.execute(
    'SELECT user.user_id, user.liked FROM user WHERE user_id = ?',
    [req.body.id]
  )
  likedProduct = []
  const likedArray = JSON.parse(liked[0].liked)
  if (likedArray) {
    for (let i = 0; i < likedArray.length; i++) {
      if (likedArray[i] < 2000) {
        let [data] = await pool.execute(
          'SELECT product.*, category_room.name AS category_name FROM product JOIN category_room ON product.category_room = category_room.id WHERE prod_id = ?',
          [likedArray[i]]
        )
        likedProduct.push(data[0])
      } else if (likedArray[i] > 2000) {
        let [data] = await pool.execute(
          'SELECT * FROM used_product WHERE useP_id = ?',
          [likedArray[i]]
        )
        likedProduct.push(data[0])
      }
    }
  }

  res.send({ liked, likedProduct })
})
router.put('/liked/edit', async (req, res, next) => {
  let result = await pool.execute(
    'UPDATE user SET liked = ? WHERE user_id = ?',
    [req.body.likeJson, req.body.id]
  )
})

module.exports = router
