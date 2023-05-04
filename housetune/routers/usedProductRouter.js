const express = require('express')
const router = express.Router()
const { body , validationResult } = require('express-validator')
const pool = require('../utils/db')


// 二手商品 新增
const multer = require('multer')
const path = require('path')

// 設定圖片儲存位置
const storageImg = multer.diskStorage({
  // 設定目的地 -> public/upload
  destination: function(req, file, cb){
    cb(null, path.join(__dirname, '..', '..', '..', 'housetune-fe', 'public', 'images', 'used'))
  },
  filename: function(req, file, cb){
    const ext = file.originalname.split('.').pop()
    cb(null, `${Math.floor(Math.random()*100000)}${Date.now()}.${ext}`)
  }
})
const uploadImg = multer({
  storage: storageImg,
  // 圖片格式 validation
  fileFilter: function(req, file, cb){
    if(file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/jpg' && file.mimetype !== 'image/png'){
       cb(new Error('上傳圖片檔案格式錯誤'), false)
    } else{
      cb(null, true)
    }
  },
  limits:{
    fileSize: 200 * 1024, // 204800
  }
})

// 驗證資料
const addRules = [
    body('name').isLength({ min:2 }).withMessage('產品名稱最少為兩個字或一種類別名稱'),
    body('categoryRoom').isLength({ min:1 }).withMessage('請選擇房間類別'),
    body('categoryProduct').isLength({ min:1 }).withMessage('請選擇產品類別'),
    body('description').isLength({ min:10 }).withMessage('產品描述最少為10個字'),
    body('originalPrice').isLength({ min:1 }).withMessage('請輸入原價'),
    body('price').isLength({ min:1 }).withMessage('請輸入售價'),
    body('amount').isLength({ min:1 }).withMessage('商品數量不得為0'),
]

// /api/auth
router.post('/usedproduct/add', uploadImg.array('imgs', 5), addRules, async (req , res , next)=>{
  console.log('POST /usedproduct/add', req.body, req.files);

  // 輸出驗證結果
  const addResult = validationResult(req);
  console.log(addResult);
  if(!addResult.isEmpty()){
    return res.status(400).json({ errors: addResult.array() })
  }

  let today=new Date()
  let now = today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate() + " " + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  
 // 寫進資料庫
  let filename =''
  for(let i = 0 ; i < req.files.length; i++){
    filename+=req.files[i].filename
    filename+=','
  }
  let name1= filename.split('')
  name1.pop()
  let name2 = name1.join('')

  let result = await pool.execute('INSERT INTO used_product (name, category_room, category_product, amount, description, original_price, price, img, bought_in, created_at, updated_at, valid, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [req.body.name, req.body.categoryRoom, req.body.categoryProduct, req.body.amount, req.body.description, req.body.originalPrice, req.body.price, name2, req.body.boughtIn, now, now, req.body.valid, req.body.id]);

  console.log(result);
  res.json({
    msg: '商品新增成功!!'
  })
});




// 二手編輯-撈資料
router.get('/usedproduct/edit/:useP_id', async (req, res, next) => {
  let response = await pool.execute('SELECT * FROM used_product WHERE useP_id =?',[req.params.useP_id])
  res.status(200).send(response[0])
})

// 驗證修改資料
const editRules = [
  body('name').isLength({ min:2 }).withMessage('產品名稱最少為兩個字或一種類別名稱'),
  body('category_room').isLength({ min:1 }).withMessage('請選擇房間類別'),
  body('category_product').isLength({ min:1 }).withMessage('請選擇產品類別'),
  body('description').isLength({ min:10 }).withMessage('產品描述最少為10個字'),
  body('original_price').isLength({ min:1 }).withMessage('請輸入原價'),
  body('price').isLength({ min:1 }).withMessage('請輸入售價'),
  body('amount').isLength({ min:1 }).withMessage('商品數量不得為0'),
]

router.put('/usedproduct/edit', uploadImg.array('imgs', 5), editRules, async(req, res, next)=>{
  console.log(`PUT /usedproduct/edit`, req.body, req.files);

  // 輸出驗證結果
  const editResult = validationResult(req);
  console.log(editResult);
  if(!editResult.isEmpty()){
    return res.status(400).json({ errors: editResult.array() })
  }

  let today=new Date()
  let now = today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate() + " " + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

  // 寫回(更新)資料庫
  if(req.body.img !== ''){
    let filename = ''
    for( let i=0; i < req.files.length; i++){
      filename+= req.files[i].filename
      filename+=','
    }
    let name1= filename.split('')
    name1.pop()
    let name2 = name1.join('')

    let result = await pool.execute('UPDATE used_product SET name=?, category_room=?, category_product=?, amount=?, description=?, original_price=?, price=?, img=?, bought_in=?, updated_at=? , valid=? WHERE useP_id=?',[req.body.name, req.body.category_room, req.body.category_product, req.body.amount, req.body.description, req.body.original_price, req.body.price, name2, req.body.bought_in, now, req.body.valid, req.body.useP_id])
  console.log(result);
  res.json({
    msg: '商品修改完成!!'
  })
  
  } else{
    let result = await pool.execute('UPDATE used_product SET name=?, category_room=?, category_product=?, amount=?, description=?, original_price=?, price=?, bought_in=?, updated_at=? , valid=? WHERE useP_id=?',[req.body.name, req.body.category_room, req.body.category_product, req.body.amount, req.body.description, req.body.original_price, req.body.price, req.body.bought_in, now, req.body.valid, req.body.useP_id])
  console.log(result);
  res.json({
    msg: '商品修改完成!!'
  })
  }
  
})

// 撈資料測試
router.get('/usedproduct', async (req, res , next) => {
  let [data] = await pool.execute('SELECT * FROM used_product')
  res.json(data)
})

module.exports = router