const express = require('express');
const argon2 = require('argon2');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../utils/db');
const jwt = require('jsonwebtoken');

//先設定好檢查各項資料的規則
const registerRules = [
  //中間件 負責檢查email是否合法
  body('email').isEmail().withMessage('請輸入正確格式的email'),
  //中間件 檢查密碼的長度
  body('password').isLength({ min: 6 }).withMessage('密碼長度至少為6'),
  //中間件：檢查password和confirmPassword是否一致
  //客製自己想要的檢查條件
  body('rePassword')
    .custom((value, { req }) => {
      return value === req.body.password;
    })
    .withMessage('驗證密碼不符合'),
];

router.post('/register', registerRules, async (req, res, next) => {
  const validateResult = validationResult(req);
  console.log(validateResult);
  //errors陣列是空的代表ok
  if (!validateResult.isEmpty()) {
    return res.status(400).json({ errors: validateResult.array() });
  }
  //檢查email和帳號是否已存在
  let [members1] = await pool.execute('SELECT * FROM user WHERE email = ?', [
    req.body.email,
  ]);
  let [members2] = await pool.execute('SELECT * FROM user WHERE account = ?', [
    req.body.account,
  ]);
  //有代表重複註冊
  if (members1.length > 0) {
    return res.status(400).json({
      errors: [
        {
          msg: 'email已經註冊過',
          param: 'email',
        },
      ],
    });
  }

  if (members2.length > 0) {
    return res.status(400).json({
      errors: [
        {
          msg: '此帳號已有用戶使用，請更換',
          param: 'account',
        },
      ],
    });
  }
  //沒有就可以進到下一步＝>hash雜湊密
  const hashedPassword = await argon2.hash(req.body.password);
  //寫入資料庫
  const fullAddress = req.body.address1 + req.body.address2 + req.body.address3;
  let today = new Date();
  let now =
    today.getFullYear() +
    '-' +
    (today.getMonth() + 1) +
    '-' +
    today.getDate() +
    ' ' +
    today.getHours() +
    ':' +
    today.getMinutes() +
    ':' +
    today.getSeconds();

  let result = await pool.execute(
    'INSERT INTO user (account, password, name, phone, email, address, bank_code, bank_account, rating, created_at, last_modified, valid, route) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      req.body.account,
      hashedPassword,
      req.body.name,
      req.body.phone,
      req.body.email,
      fullAddress,
      req.body.bankcode,
      req.body.bankaccount,
      0.0,
      now,
      now,
      1,
      1,
    ]
  );
  // console.log(result);
  res.send('註冊成功！');
});

router.post('/register/google', registerRules, async (req, res, next)=>{
  const validateResult = validationResult(req);
  // console.log(validateResult);
  //errors陣列是空的代表ok
  if (!validateResult.isEmpty()) {
    return res.status(400).json({ errors: validateResult.array() });
  }
  //檢查帳號是否已存在 會進到register google頁面代表email沒註冊過 不用再檢查
  let [members2] = await pool.execute('SELECT * FROM user WHERE account = ?', [
    req.body.account,
  ]);
  //有代表重複註冊
  if (members2.length > 0) {
    return res.status(400).json({
      errors: [
        {
          msg: '此帳號已有用戶使用，請更換',
          param: 'account',
        },
      ],
    });
  }
  //沒有就可以進到下一步＝>hash雜湊密
  const hashedPassword = await argon2.hash(req.body.password);
  //寫入資料庫
  const fullAddress = req.body.address1 + req.body.address2 + req.body.address3;
  let today = new Date();
  let now =
    today.getFullYear() +
    '-' +
    (today.getMonth() +
    1)+
    '-' +
    today.getDate() +
    ' ' +
    today.getHours() +
    ':' +
    today.getMinutes() +
    ':' +
    today.getSeconds();

  let result = await pool.execute(
    'INSERT INTO user (account, password, name, phone, email, address, bank_code, bank_account, rating, created_at, last_modified, valid, route) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      req.body.account,
      hashedPassword,
      req.body.name,
      req.body.phone,
      req.body.email,
      fullAddress,
      req.body.bankcode,
      req.body.bankaccount,
      0.0,
      now,
      now,
      1,
      2,
    ]
  );
  // console.log(result);
  res.send('註冊成功！');
})

router.post('/login', async (req, res, next) => {
  //接收到資料後跟資料庫做比對
  // console.log(req.body.account);
  let [members] = await pool.execute('SELECT * FROM user WHERE account = ?', [
    req.body.account,
  ]);
  //陣列長度為0代表沒有這個會員
  // console.log(members);
  if (members.length === 0) {
    return res.status(400).json({
      errors: [
        {
          msg: '帳號或密碼錯誤',
        },
      ],
    });
  }
  // console.log('hello');
  //第二步比對密碼
  let member = members[0];
  let result = await argon2.verify(member.password, req.body.password);
  // console.log(result);
  if (result === false) {
    return res.status(400).json({
      errors: [
        {
          msg: '帳號或密碼錯誤',
        },
      ],
    });
  }
  if (member.valid !== 1) {
    return res.status(400).json({
      errors: [
        {
          msg: '此用戶已遭停權，請與客服聯繫',
        },
      ],
    });
  }
  //到這裡即為真實存在之用戶=>開始處理session
  //要寫進session的內容
  let retMember = {
    id: member.user_id,
    account: member.account,
    name: member.name,
    phone: member.phone,
    email: member.email,
    address: member.address,
    bankcode: member.bank_code,
    bankaccount: member.bank_account,
    liked: member.liked,
    cart: member.cart,
    validcoupons: member.valid_coupons,
    invalidcoupons: member.invalid_coupons,
    rating: member.rating,
    createdat: member.created_at,
  };
  //寫進session
  req.session.member = retMember;
  res.json({
    msg: '登入成功',
    member: retMember,
  });
});

// 忘記密碼寄信
router.get('/forgot', async (req, res, next) => {
  let [data] = await pool.execute(
    'SELECT user.name,user.password FROM user WHERE email=?',
    [req.query.toEmail]
  );
  const SECRET = 'ObVnSHgpCHzubR9';
  let pwd;
  if (data[0]) {
    pwd = data[0].password;
  } else {
    pwd = 123;
  }

  const token = jwt.sign({ data: req.query.toEmail }, SECRET + pwd, {
    expiresIn: '1h',
  });
  res.json({ data, token });
});

// token 驗證 中間件
const authentication = async (req, res, next) => {
  let token;
  try {
    token = req.body.token;
  } catch (e) {
    token = '';
  }

  let base64Url = token.split('.')[1];
  let base64 = base64Url.replace('-', '+').replace('_', '/');
  let payload = JSON.parse(atob(base64));
  // console.log(pwd1);

  let [data] = await pool.execute(
    'SELECT user.password FROM user WHERE email=?',
    [payload.data]
  );

  const SECRET = 'ObVnSHgpCHzubR9';
  const pwd = data[0].password;
  // console.log(pwd);
  jwt.verify(token, SECRET + pwd, function (err, decoded) {
    if (err) {
      return res.json({ state: 'FAILED', message: '驗證碼不存在或已失效!' });
    } else {
      req.email = decoded.data;
      next();
    }
  });
};

// 修改密碼
router.put('/reset', authentication, async (req, res, next) => {
  // console.log(req.email);
  const hashedPassword = await argon2.hash(req.body.password.pwd);
  let result = await pool.execute('UPDATE user SET password=? WHERE email=?', [
    hashedPassword,
    req.email,
  ]);
  res.json({ state: 'SUCCESS', message: '修改密碼成功' });
  // console.log(result);
});

//google第三方登入
router.post('/login/google', async (req, res, next) => {
  //接收到資料後跟資料庫做比對

  // console.log("email是", req.body.email);

  // console.log(req.body.email);

  let [members] = await pool.execute('SELECT * FROM user WHERE email = ? AND route = ?', [
    req.body.email, 2
  ]);
  //看看這個email是不是有直接註冊過
  let [members1] = await pool.execute('SELECT * FROM user WHERE email = ? AND route = ?', [
    req.body.email, 1
  ]);
  
  // console.log("members", members);
  
  // console.log(members);

  //兩個陣列長度都為0代表真的沒有這個會員
  if(members.length===0&&members1.length===0){
      return res.sendStatus(400)
  }
  if(members.length!==0){
    let member = members[0];
    if (member.valid !== 1){
      return res.status(400).json({
          errors: [
              {
              msg: '此用戶已遭停權，請與客服聯繫',
              },
          ],
          });
    }
  }
  if(members1.length!==0){
      return res.status(400).json({
        bundle :[
          {
            msg: '此email曾直接註冊本網站，請於下個頁面選擇是否綁定'
          }
        ]
      })
  }
  let member = members[0];
  //到這裡即為真實存在之用戶=>開始處理session
  //要寫進session的內容
  let retMember = {
    id: member.user_id,
    account: member.account,
    name: member.name,
    phone: member.phone,
    email: member.email,
    address: member.address,
    bankcode: member.bank_code,
    bankaccount: member.bank_account,
    liked: member.liked,
    cart: member.cart,
    validcoupons: member.valid_coupons,
    invalidcoupons: member.invalid_coupons,
    rating: member.rating,
    createdat: member.created_at,
  };
  //寫進session
  req.session.member = retMember;
  res.json({
    msg: '登入成功',
    member: retMember,
  });
});

//google帳號和現有帳號綁定
router.put('/bundle/google', async(req, res, next)=>{
  // console.log("body是", req.body);
  let [members] = await pool.execute('SELECT * FROM user WHERE email = ?', [
    req.body.email,
  ]);
  //第二步比對密碼
  let member = members[0];
  let result = await argon2.verify(member.password, req.body.password);
  if (result === false) {
    return res.status(400).json({
      errors: [
        {
          msg: '密碼錯誤',
        },
      ],
    });
  }
  //修正登入方式
  let result1 = await pool.execute('UPDATE user SET route=? WHERE email=?', [
    2,
    req.body.email,
  ]);
 //要寫進session的內容
 let retMember = {
  id: member.user_id,
  account: member.account,
  name: member.name,
  phone: member.phone,
  email: member.email,
  address: member.address,
  bankcode: member.bank_code,
  bankaccount: member.bank_account,
  liked: member.liked,
  cart: member.cart,
  validcoupons: member.valid_coupons,
  invalidcoupons: member.invalid_coupons,
  rating: member.rating,
  createdat: member.created_at,
  };
  //寫進session
  req.session.member = retMember;
  res.status(200).json({
    msg: '綁定成功',
    member: retMember,
  });
  
})

router.get('/member', (req, res, next) => {
  if (req.session.member) {
    res.json({
      loggedIn: true,
      userInfo: req.session.member,
    });
  } else {
    res.json({
      loggedIn: false,
    });
  }
});

router.post('/logout', (req, res, next) => {
  req.session.member = null;
  res.json({
    msg: '登出成功',
  });
});

module.exports = router;
