const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

router.post('/', async(req, res, next)=>{
    console.log("我要寫進資料庫", req.body);
    let result = await pool.execute('INSERT INTO chat_room (reciever_id, sender_id, timestamp, message, status) VALUES (?, ?, ?, ?, ?)', [req.body.recieverId, req.body.senderId, req.body.fulltime, req.body.message, 1])
    // console.log(result);
    res.sendStatus(200)
})
router.post('/get', async(req, res, next)=>{
    // console.log(req.body);
    let result = await pool.execute('SELECT * FROM chat_room WHERE ( reciever_id = ? AND sender_id = ?) OR ( sender_id = ? AND reciever_id = ?)', [req.body.userId, req.body.recieverId, req.body.userId, req.body.recieverId])
    console.log(result[0]);
    let messages=result[0]
    res.status(200).send(messages)
})
router.post('/switch', async(req, res, next)=>{
    let result = await pool.execute('SELECT * FROM user WHERE account = ?', [req.body.otherReciever])
    let reciever = result[0]
    res.status(200).send(reciever)
})
router.post('/getlist', async(req, res, next)=>{
    let result = await pool.execute('SELECT * FROM chat_room WHERE reciever_id = ? OR sender_id = ?', [req.body.userId, req.body.userId])
    // console.log(result[0]);
    let chatlist = []
    for(let i = 0; i<result[0].length; i++ ){
        if(result[0][i].reciever_id===req.body.userId){
            chatlist.push(result[0][i].sender_id)
        }
        if(result[0][i].sender_id===req.body.userId){
            chatlist.push(result[0][i].reciever_id)
        }
    }
    // console.log("聊天清單是", chatlist);
    function removeDuplicates(arr) {
        return arr.filter((item,
            index) => arr.indexOf(item) === index);
    }
    let chatlist1 = removeDuplicates(chatlist)
    // console.log("處理過後的聊天清單是", chatlist1);
    let chatlistaccount=[]
    for(let i = 0; i<chatlist1.length; i++){
        let result = await pool.execute('SELECT account FROM user WHERE user_id =? ', [chatlist1[i]])
        chatlistaccount.push(result[0][0].account)
    }
    // console.log("以帳號顯示的聊天清單是", chatlistaccount);
    let chatlistname=[]
    for(let i = 0; i<chatlist1.length; i++){
        let result = await pool.execute('SELECT name FROM user WHERE user_id =? ', [chatlist1[i]])
        chatlistname.push(result[0][0].name)
    }
    // console.log("以名稱顯示的聊天清單是", chatlistname);
    let chatlistcombined=[]
    for(let i = 0; i<chatlist1.length; i++){
        chatlistcombined.push({id: chatlist1[i] ,account: chatlistaccount[i], name: chatlistname[i]})
    }
    // console.log("整合過的聊天清單是", chatlistcombined);
    res.status(200).send(chatlistcombined)
})



module.exports =router