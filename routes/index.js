var express = require('express');
var router = express.Router();
const db = require('../models/index');

function getFormat() {
  let date = new Date();
  var return_str = '';
  
  const year = ('0000' + (date.getYear() + 1900)).slice(-4);
  const month = ('00' + (date.getMonth() + 1)).slice(-2);
  const day = ('00' + date.getDate()).slice(-2);
  return_str += year + month + day + '_';
  
  const hour = ('00' + (date.getHours() + 9)).slice(-2);
  const minutes = ('00' + date.getMinutes()).slice(-2);
  const seconds = ('00' + date.getSeconds()).slice(-2);
  const ms = ('000' + date.getMilliseconds()).slice(-3);
  return_str += hour + minutes + seconds + ms + '_';
  
  return return_str;
}
//画像の保存先
var multer = require('multer');
var storage = multer.diskStorage({
  //ファイルの保存先を指定(ここでは保存先は./public/images) 
  //Express4の仕様かなんかで画像staticなファイルを保存するときはpublic/以下のフォルダに置かないとダメらしい
  //詳しくは express.static public でググろう！
  destination: function(req, file, cb){
    cb(null, './public/images/')
  },
  //ファイル名を指定
  //ここでは image.jpg という名前で保存
  filename: function(req, file, cb){
    cb(null, (getFormat() + file.originalname))
  }
})

var upload = multer({storage: storage})

//const messages = require('/messages.js');

//データファイル
const filename = 'mydata.txt';

class Message {
  constructor(tags, text) {
    this.tags = tags;
    this.text = text;
  }
}
var msgs = undefined;

function showMsg(tags, text) {
  tags = "alert alert-" + tags;

  msgs = [new Message(tags, text)];
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('private_diary/base', {
    file: 'index',
    auth: req.user,
    messages: msgs
  });
});

//お問い合わせページ
router.get('/inquiry/', function(req, res, next) {
  var data = {
    file: 'inquiry',
    auth: req.user,
    messages: msgs,
    name: req.session.name,
    mail: req.session.mail,
    m_title: req.session.title,
    message: req.session.message
  }
  res.render('private_diary/base', data);

  msgs = undefined;
});
const namedOption = [
  {'name':'file1', maxCount:1}, 
  {'name':'file2', maxCount:1}
];
router.post('/inquiry/', upload.fields(namedOption), function(req, res, next) {  
  var session = req.body;
  req.session.name = session['name'];
  req.session.mail = session['mail'];
  req.session.title = session['title'];
  req.session.message = session['message'];
  
  showMsg("success", "メッセージを送信しました。");

  res.redirect('/inquiry');
});

//日記一覧
router.get('/diary-list/', function(req, res, next) {
  if (req.user == undefined) {
    res.redirect('/login');
  } else {
    var page = (req.query.page != undefined) ? req.query.page : 1;
    var pageSize = 2;
  
    db.Diary.findAll({
      where: {
        user_id: req.user.id
      }
    }).then(all_diaries => {
      db.Diary.findAll({
        limit: pageSize,
        offset: pageSize * (page-1),
        where: {
          user_id: req.user.id
        },
        order: [['createdAt', 'DESC']]
      }).then(diaries => {
        var data = {
          file: 'diary_list',
          auth: req.user,
          messages: msgs,
          diary_list: diaries,
          page: page,
          pageLimit: Math.ceil(all_diaries.length / pageSize)
        }
        res.render('private_diary/base', data);
  
        msgs = undefined;
      });
    }).catch(err => {
      res.redirect('/login');
    });
  }
});

//日記の詳細
router.get('/diary-detail/:pk/', function(req, res, next) {
  if (!isNaN(req.params.pk)) {
    db.Diary.findOne({
      where: {
        id: req.params.pk
      }
    }).then(diary => {
      var data = {
        file: 'diary_detail',
        auth: req.user,
        messages: msgs,
        object: diary
      }
      res.render('private_diary/base', data);

      msgs = undefined;
    });
  }
});

//日記の作成
const fileOptions = [
  {'name':'photo1', maxCount:1}, 
  {'name':'photo2', maxCount:1},
  {'name':'photo3', maxCount:1}
];
router.get('/diary-create/', function(req, res, next) {
  if (req.user == undefined) {
    res.redirect('/login');
  } else {
    var data = {
      file: 'diary_create',
      auth: req.user,
      messages: msgs
    }
    res.render('private_diary/base', data);
  }

  msgs = undefined;
});
router.post('/diary-create/', upload.fields(fileOptions), function(req, res, next) {
  //作成
  console.log(req.files.photo1[0].filename);

  var body = req.body;
  const user_id = body;
  const title = body['title'];
  const content = body['content'];
  const photo1 = req.files.photo1 != undefined ? req.files.photo1[0].filename : '';
  const photo2 = req.files.photo2 != undefined ? req.files.photo2[0].filename : '';
  const photo3 = req.files.photo3 != undefined ? req.files.photo3[0].filename : '';

  db.sequelize.sync().then(() => db.Diary.create({
    user_id: user_id,
    title: title,
    content: content,
    photo1: photo1,
    photo2: photo2,
    photo3: photo3
  })).then(diaries => {
    showMsg("success", "日記を作成しました。");
    res.redirect('/diary-list');
  }).catch(err => {
    showMsg("danger", err);
    res.redirect('/diary-list');
  });
});
//日記の更新
router.get('/diary-update/:pk/', function(req, res, next) {
  if (!isNaN(req.params.pk) && req.user != undefined) {
    console.log(req.user.id);
    db.Diary.findOne({
      where: {
        id: req.params.pk,
        user_id: req.user.id
      }
    }).then(diary => {
      var data = {
        file: 'diary_update',
        auth: req.user,
        messages: msgs,
        object: diary
      }
      res.render('private_diary/base', data);

      msgs = undefined;
    }).catch(err => {
      showMsg("danger", "日記の更新に失敗しました。");
      res.redirect('/diary-list');
    });
  } else {
    res.redirect('/login'); 
  }
});
router.post('/diary-update/:pk/', upload.fields(fileOptions), function(req, res, next) {
  //更新
  const id = req.body.id;

  const user_id = req.body['user_id'];
  const title = req.body['title'];
  const content = req.body['content'];
  const photo1 = req.files.photo1 != undefined ? req.files.photo1[0].filename : '';
  const photo2 = req.files.photo2 != undefined ? req.files.photo2[0].filename : '';
  const photo3 = req.files.photo3 != undefined ? req.files.photo3[0].filename : '';

  db.sequelize.sync().then(() => db.Diary.update({
    user_id: user_id,
    title: title,
    content: content,
    photo1: photo1,
    photo2: photo2,
    photo3: photo3
  }, {
    where: {id: id}
  })).then(diaries => {
    showMsg("success", "日記を更新しました。");
    res.redirect('/diary-detail/' + id);
  }).catch(err => {
    showMsg("danger", "日記の更新に失敗しました。");
    res.redirect('/diary-list');
  });
});
//日記の削除
router.get('/diary-delete/:pk/', function(req, res, next) {
  if (!isNaN(req.params.pk) && req.user != undefined) {
    db.Diary.findOne({
      where: {
        id: req.params.pk
      }
    }).then(diary => {
      var data = {
        file: 'diary_delete',
        auth: req.user,
        messages: msgs,
        object: diary
      }
      res.render('private_diary/base', data);

      msgs = undefined;
    });
  } else {
    res.redirect('/login'); 
  }
});
router.post('/diary-delete/:pk/', function(req, res, next) {
  //削除
  const id = req.body.id;
    
  db.sequelize.sync().then(() => db.Diary.destroy({
    where: {id: id}
  })).then(diaries => {
    showMsg("success", "日記を削除しました。");
    res.redirect('/diary-list');
  });
});


module.exports = router;
