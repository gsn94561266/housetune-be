const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

router.get('/usedproducts', async (req, res) => {
  let userID;
  if (req.session.member) {
    userID = req.session.member.id;
  } else {
    userID = 1;
  }
  let results = await pool.query(
    'SELECT u.useP_id, u.seller_id,u.category_product,u.amount,u.description,u.price,u.img,u.bought_in,u.updated_at,u.valid,u.name,u.description,user.user_id, user.cart, user.name AS seller_name, user.liked,user.rating,user.account FROM used_product AS u LEFT JOIN user on u.seller_id = user.user_id WHERE u.valid = 1 AND seller_id <> ?',
    [userID]
  );
  let data = results[0];
  res.json(data);
});
router.get('/usedproduct/:useP_id', async (req, res) => {
  let result = await pool.query(
    'SELECT u.useP_id, u.seller_id,u.category_product,u.amount,u.description,u.price,u.img,u.bought_in,u.updated_at,u.valid,u.name AS product_name ,user.user_id, user.cart, user.name, user.liked,user.rating,user.account FROM used_product AS u LEFT JOIN user on u.seller_id = user.user_id WHERE useP_id=?',
    [req.params.useP_id]
  );
  let data = result[0];
  res.json(data);
});

router.get('/usedproduct/:usedProdId', async (req, res) => {
  console.log('req.params.usedProdId', req.params);
  let [data] = await pool.query(
    'SELECT u.useP_id, u.seller_id,u.category_product,u.amount,u.description,u.price,u.img,u.bought_in,u.updated_at,u.valid,u.name,user.user_id, user.cart, user.name AS seller_name, user.liked,user.rating,user.account FROM used_product AS u LEFT JOIN user on u.seller_id = user.user_id WHERE useP_id=?',
    [req.params.usedProdId]
  );
  res.json(data);
});

module.exports = router;
