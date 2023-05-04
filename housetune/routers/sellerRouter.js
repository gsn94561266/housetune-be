const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// 賣家中心(商品)
router.post('/usedproduct', async (req, res, next) => {
  let [data] = await pool.execute(
    'SELECT used_product.*, category_room.name AS category_name FROM used_product JOIN category_room ON used_product.category_room = category_room.id WHERE seller_id = ?',
    [req.body.id]
  );
  res.json(data);
});
// 上下架
router.put('/valid', async (req, res) => {
  let results = await pool.query(
    'UPDATE used_product SET valid = ? WHERE useP_id = ?',
    [req.body.valid, req.body.id]
  );
  let [data] = await pool.execute(
    'SELECT used_product.*, category_room.name AS category_name FROM used_product JOIN category_room ON used_product.category_room = category_room.id WHERE seller_id = ?',
    [req.body.user_id]
  );
  res.json(data);
});
//刪除
router.post('/delete', async (req, res) => {
  let results = await pool.query('DELETE FROM used_product WHERE useP_id = ?', [
    req.body.id,
  ]);
  let [data] = await pool.execute(
    'SELECT used_product.*, category_room.name AS category_name FROM used_product JOIN category_room ON used_product.category_room = category_room.id WHERE seller_id = ?',
    [req.body.user_id]
  );
  res.json(data);
});

// 賣家中心(訂單)
router.post('/order', async (req, res, next) => {
  let [data] = await pool.execute(
    'SELECT order_list.*, order_detail.product_id, user.* ,user.user_id AS buyer_id FROM order_list JOIN user ON order_list.user_id = user.user_id JOIN order_detail ON order_list_id = ordL_id WHERE seller_id = ?',
    [req.body.id]
  );
  res.json(data);
});
router.post('/order/state', async (req, res, next) => {
  let [data] = await pool.execute(
    'SELECT order_list.*, order_detail.product_id, user.* ,user.user_id AS buyer_id FROM order_list JOIN user ON order_list.user_id = user.user_id JOIN order_detail ON order_list_id = ordL_id WHERE state = ? AND seller_id = ?',
    [req.body.state, req.body.id]
  );
  res.json(data);
});
// 取消訂單
router.put('/order/cancel/all', async (req, res) => {
  let results = await pool.query(
    'UPDATE order_list SET state = 4 WHERE ordL_id = ?',
    [req.body.id]
  );
  let [data] = await pool.execute(
    'SELECT order_list.*, order_detail.product_id, user.* ,user.user_id AS buyer_id FROM order_list JOIN user ON order_list.user_id = user.user_id JOIN order_detail ON order_list_id = ordL_id WHERE seller_id = ?',
    [req.body.seller_id]
  );
  res.json(data);
});
router.put('/order/cancel/unpaid', async (req, res) => {
  let results = await pool.query(
    'UPDATE order_list SET state = 4 WHERE ordL_id = ?',
    [req.body.id]
  );
  let [data] = await pool.execute(
    'SELECT order_list.*, order_detail.product_id, user.* ,user.user_id AS buyer_id FROM order_list JOIN user ON order_list.user_id = user.user_id JOIN order_detail ON order_list_id = ordL_id WHERE state = ? AND seller_id = ?',
    [req.body.state, req.body.seller_id]
  );
  res.json(data);
});

// 搜尋
router.get('/search', async (req, res, next) => {
  let [data] = await pool.execute(
    'SELECT product.*, category_room.name AS category_name FROM product JOIN category_room ON product.category_room = category_room.id WHERE valid = 1'
  );
  res.json(data);
});

//計算評價分數
router.get('/rating/count', async (req, res, next) => {
  let [rating] = await pool.execute(
    'SELECT rating.*, used_product.seller_id, used_product.img, used_product.name, user.user_id AS userId, user.account, user.valid FROM rating JOIN used_product ON rating.product_id = used_product.useP_id JOIN user ON used_product.seller_id = user.user_id'
  );
  let [user] = await pool.execute('SELECT user.user_id FROM user');
  res.json({ rating, user });
});
router.put('/rating/stars', async (req, res) => {
  for (let i = 0; i < req.body.userId.length; i++) {
    let aaa = req.body.stars[i];
    let bbb = req.body.userId[i];
    let results = await pool.execute(
      'UPDATE user SET rating = ? WHERE user_id = ?',
      [aaa, bbb]
    );
  }
});

// 個人賣場
router.get('/:userAcct', async (req, res, next) => {
  let [rating] = await pool.execute(
    'SELECT rating.*, used_product.seller_id, used_product.img, used_product.name, user.user_id AS userId, user.account, user.valid FROM rating JOIN used_product ON rating.product_id = used_product.useP_id JOIN user ON used_product.seller_id = user.user_id WHERE user.valid = 1 AND user.account = ?',
    [req.params.userAcct]
  );
  let [data] = await pool.execute(
    'SELECT used_product.* FROM used_product JOIN user ON used_product.seller_id = user_id WHERE user.valid=1 AND used_product.valid = 1 AND user.account = ?',
    [req.params.userAcct]
  );
  let [category] = await pool.execute('SELECT * FROM category_product');
  let [buyer] = await pool.execute(
    'SELECT user.user_id, user.account FROM user'
  );
  res.json({ rating, data, category, buyer });
});

module.exports = router;
