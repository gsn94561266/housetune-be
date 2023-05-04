const express = require('express')
const router = express.Router()
const pool = require('../utils/db')

// 取得某一筆資料
// 查看 url => http://localhost:3001/api/usecoupon/coupons?couponName=HAPPYYEIN
router.get('/coupons', async (req, res, next) => {
  console.log(req.query.couponName)
  let couponName = req.query.couponName
  let [data] = await pool.query('SELECT * FROM coupon WHERE coupon_name = ?', [
    couponName,
  ])
  res.json(data)
  //   res.json({})
})

module.exports = router
