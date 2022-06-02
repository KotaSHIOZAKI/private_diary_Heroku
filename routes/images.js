var express = require('express');
var router = express.Router();

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

var testImg = undefined;

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('image_test/index', {img: testImg});

  testImg = undefined;
});
router.post('/', upload.single('file'), function(req,res){
  console.log(req.file.filename);
  testImg = req.file.filename;
  res.redirect('/im');
});

module.exports = router;
