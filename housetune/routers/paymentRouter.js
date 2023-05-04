const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const ecpay_payment = require('ecpay_aio_nodejs/lib/ecpay_payment.js');
const options = require('ecpay_aio_nodejs/conf/config-example');
const moment = require('moment');

const now = moment().format('YYYY/MM/DD HH:mm:ss');
const hmacSHA256 = require('crypto-js/hmac-sha256');
const Base64 = require('crypto-js/enc-base64');
const axios = require('axios');
require('dotenv').config();

// INSERT order_list & order_detail
let orderID;
let total;

router.post('/', async (req, res, next) => {
  res.json({});
});

// 綠界科技
router.get('/creditPay', async (req, res) => {
  // console.log('api/creditPay=>', req.query.orderMessage)
  const messages = JSON.parse(req.query.orderMessage);
  const itemObj = messages.products[0];
  const keys = Object.keys(itemObj);
  try {
    const Coupon_data = JSON.stringify(messages.couponUse);
    let result = await pool.query(
      'INSERT INTO order_list (seller_id,user_id,price,couponInfo,shippingFee,address,state,note,order_date,payment,valid) VALUES (?,?,?,?,?,?,?,?,?,?,?);',
      [
        keys.includes('seller_id') === true
          ? messages.products[0].seller_id
          : 1,
        messages.userId, // user_id
        messages.price, // price
        Coupon_data, // couponInfo
        messages.shippingFee, // shippinigFee
        messages.address, // address
        2, // state
        messages.note, // note
        now, // order_date
        1, //payment
        1, // valid
      ]
    );
    let productData = { ...messages.products };
    let result2 = await pool.query(
      'INSERT INTO order_detail (order_list_id,product_id) VALUES (?,?);',
      [result[0].insertId, JSON.stringify(productData)]
    );
    // console.log('result', result[0].insertId) // 訂單編號
    orderID = result[0].insertId;
    total = messages.price;
    // console.log('result2', result2)
    let base_param = {
      MerchantTradeNo: `${orderID}`, // 請帶 20 碼 uid ， 必須為唯一值
      MerchantTradeDate: `${now}`, // ex: 2017/02/13 15:45:30
      TotalAmount: `${total}`,
      TradeDesc: 'Housetune歐風家具網',
      ItemName: '家具',
      ReturnURL: 'http://localhost:3001/', // 將通知結果傳給 server 需要回傳 '1|OK' 回綠界
      ClientBackURL: 'http://localhost:3000/cart/checkout/thankyou', // 結帳完成後點選按鈕回去
    };
    // 使用信用卡一次付清方法
    // console.log('orderID:', orderID, ',total:', total, ',now', now)
    const create = new ecpay_payment(options);
    const htm = await create.payment_client.aio_check_out_credit_onetime(
      (parameters = base_param)
    );
    res.send(htm);
  } catch (err) {
    console.log('failed', err);
    res.json('新增失敗');
  }
  res.end();
});

// LinePay

const {
  LINEPAY_CHANNEL_ID,
  LINEPAY_RETURN_HOST,
  LINEPAY_SITE,
  LINEPAY_VERSION,
  LINEPAY_CHANNEL_SECRET_KEY,
  LINEPAY_RETURN_CONFIRM_URL,
  LINEPAY_RETURN_CANCEL_URL,
} = process.env;

router.post('/linePay', async (req, res) => {
  const messages = JSON.parse(req.body.data);
  const itemObj = messages.products[0];
  const keys = Object.keys(itemObj);
  try {
    const Coupon_data = JSON.stringify(messages.couponUse);
    let result = await pool.query(
      'INSERT INTO order_list (seller_id,user_id,price,couponInfo,shippingFee,address,state,note,order_date,payment,valid) VALUES (?,?,?,?,?,?,?,?,?,?,?);',
      [
        keys.includes('seller_id') === true
          ? messages.products[0].seller_id
          : 1,
        messages.userId, // user_id
        messages.price, // price
        Coupon_data, // couponInfo
        messages.shippingFee, // shippinigFee
        messages.address, // address
        2, // state
        messages.note, // note
        now, // order_date
        2, // payment
        1, // valid
      ]
    );
    let productData = { ...messages.products };
    let result2 = await pool.query(
      'INSERT INTO order_detail (order_list_id,product_id) VALUES (?,?);',
      [result[0].insertId, JSON.stringify(productData)]
    );
    orderID = result[0].insertId;
    total = messages.price;
    const linePayBody = {
      amount: `${total}`,
      currency: 'TWD',
      orderId: `${orderID}`,
      packages: [
        {
          id: `${orderID}`,
          amount: `${total}`,
          products: [
            {
              name: '家具',
              quantity: 1,
              price: `${total}`,
            },
          ],
        },
      ],
      redirectUrls: {
        confirmUrl: `${LINEPAY_RETURN_HOST}${LINEPAY_RETURN_CONFIRM_URL}`,
        cancelUrl: `${LINEPAY_RETURN_HOST}${LINEPAY_RETURN_CANCEL_URL}`,
      },
    };
    // CreateSignature 建立加密內容
    const uri = '/payments/request';
    const headers = createSignature(uri, linePayBody);

    // API 位址
    const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`;
    const linePayRes = await axios.post(url, linePayBody, { headers });

    // 請求成功...
    if (linePayRes?.data?.returnCode === '0000') {
      const paymentUrl = linePayRes?.data?.info.paymentUrl.web;
      res.json({ paymentUrl });
    } else {
      res.status(400).send({
        message: '訂單不存在',
      });
    }
  } catch (err) {
    console.log('failed', err);
    res.json('新增失敗');
  }
  res.end();
});

function createSignature(uri, linePayBody) {
  const nonce = new Date().getTime();
  const encrypt = hmacSHA256(
    `${LINEPAY_CHANNEL_SECRET_KEY}/${LINEPAY_VERSION}${uri}${JSON.stringify(
      linePayBody
    )}${nonce}`,
    LINEPAY_CHANNEL_SECRET_KEY
  );
  const signature = Base64.stringify(encrypt);

  const headers = {
    'X-LINE-ChannelId': LINEPAY_CHANNEL_ID,
    'Content-Type': 'application/json',
    'X-LINE-Authorization-Nonce': nonce,
    'X-LINE-Authorization': signature,
  };
  return headers;
}

// 匯款
router.get('/transfer', async (req, res, next) => {
  // console.log('api/creditPay=>', req.query.orderMessage)
  const messages = JSON.parse(req.query.orderMessage);
  const itemObj = messages.products[0];
  const keys = Object.keys(itemObj);
  try {
    const Coupon_data = JSON.stringify(messages.couponUse);
    let result = await pool.query(
      'INSERT INTO order_list (seller_id,user_id,price,couponInfo,shippingFee,address,state,note,order_date,payment,valid) VALUES (?,?,?,?,?,?,?,?,?,?,?);',
      [
        keys.includes('seller_id') === true
          ? messages.products[0].seller_id
          : 1,
        messages.userId, // user_id
        messages.price, // price
        Coupon_data, // couponInfo
        messages.shippingFee, // shippinigFee
        messages.address, // address
        1, // state
        messages.note, // note
        now, // order_date
        3, // payment
        1, // valid
      ]
    );
    let productData = { ...messages.products };
    let result2 = await pool.query(
      'INSERT INTO order_detail (order_list_id,product_id) VALUES (?,?);',
      [result[0].insertId, JSON.stringify(productData)]
    );
    res.redirect('http://localhost:3000/cart/checkout/thankyou?payment=atm');
  } catch (err) {
    console.log('failed', err);
    res.json('新增失敗');
  }
});

// 訂單新增後取得該訂單編號
router.get('/checkorder', async (req, res, next) => {
  // 拿到該使用者的訂單
  // console.log('POST/api/payment/checkorder', req.session.member.id)
  let [result] = await pool.query(
    'SELECT * FROM order_list WHERE user_id =? ORDER BY ordL_id DESC LIMIT 0 , 1;',
    [req.session.member.id]
  );
  res.json(result[0]);
});

module.exports = router;
