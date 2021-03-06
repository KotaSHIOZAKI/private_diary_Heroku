var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const passport = require('./routes/auth');
const flash = require('connect-flash');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var imageRouter = require('./routes/images');

var app = express();

//セッション
const session = require('express-session');

var session_opt = {
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  // cookie: {maxAge: 60 * 60 * 1000}
};
app.use(session(session_opt));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/im', imageRouter);

const db = require('./models/index');
const User = db.User;

const authMiddleware = (req, res, next) => {
  if(req.isAuthenticated()) { // ログインしてるかチェック
    next();
  } else {
    res.redirect(302, '/login');
  }
};

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { check, validationResult } = require('express-validator');

//会員登録
app.get('/signup', (req, res) => {
  return res.render('private_diary/base', {
    file: '../signup/form',
    auth: req.user,
    messages: undefined
  });
});

// 暗号化につかうキー
const APP_KEY = 'keyboard cat';

// // メール送信設定
// const transporter = nodemailer.createTransport({
//   host: '127.0.0.1',
//   port: 1025,
//   secure: '',
//   auth: {
//     user: '',
//     pass: ''
//   }
// });

// バリデーション・ルール
const registrationValidationRules = [
  check('name')
    .not().isEmpty().withMessage('この項目は必須入力です。'),
  check('email')
    .not().isEmpty().withMessage('この項目は必須入力です。')
    .isEmail().withMessage('有効なメールアドレス形式で指定してください。'),
  check('password')
    .not().isEmpty().withMessage('この項目は必須入力です。')
    .isLength({ min:8, max:25 }).withMessage('8文字から25文字にしてください。')
    .custom((value, { req }) => {
      if(req.body.password !== req.body.passwordConfirmation) {
        throw new Error('パスワード（確認）と一致しません。');
      }
      return true;
    })
];
// ここに先ほどの事前データ
app.post('/register', registrationValidationRules, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) { // バリデーション失敗
    return res.status(422).json({ errors: errors.array() });
  }
  // 送信されたデータ
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;

  //console.log("Hello");

  // ユーザーデータを登録（仮登録）
  User.findOrCreate({
    where: { email: email },
    defaults: {
      name: name,
      email: email,
      password: bcrypt.hashSync(password, bcrypt.genSaltSync(8))
    }
  }).then(([user]) => {
    // if(user.emailVerifiedAt) { // すでに登録されている時
    //   return res.status(422).json({
    //     errors: [
    //       {
    //         value: email,
    //         msg: 'すでに登録されています。',
    //         param: 'email',
    //         location: 'body'
    //       }
    //     ]
    //   });
    // }
    // 本登録URLを作成
    // const hash = crypto.createHash('sha1')
    //   .update(user.email)
    //   .digest('hex');
    // const now = new Date();
    // const expiration = now.setHours(now.getHours() + 1); // 1時間だけ有効
    // let verificationUrl = req.get('origin') +'/verify/'+ user.id +'/'+ hash +'?expires='+ expiration;
    // const signature = crypto.createHmac('sha256', APP_KEY)
    //   .update(verificationUrl)
    //   .digest('hex');
    // verificationUrl += '&signature='+ signature;

    // // 本登録メールを送信
    // transporter.sendMail({
    //   from: 'from@example.com',
    //   to: 'to@example.com',
    //   text: "以下のURLをクリックして本登録を完了させてください。\n\n"+ verificationUrl,
    //   subject: '本登録メール',
    // });
    // console.log(verificationUrl);

    // return res.json({
    //   result: true
    // });
    res.redirect('/login');
  });
});
app.get('/verify/:id/:hash', (req, res) => {
  const userId = req.params.id;
  User.findByPk(userId)
    .then(user => {
      if(!user) {
        res.status(422).send('このURLは正しくありません。');
      } else if(user.emailVerifiedAt) {  // すでに本登録が完了している場合
        // ログイン＆リダイレクト（Passport.js）
        req.login(user, () => res.redirect('/user'));
      } else {
        const APP_URL = "http://localhost:3000/";

        const now = new Date();
        const hash = crypto.createHash('sha1')
          .update(user.email)
          .digest('hex');
        const isCorrectHash = (hash === req.params.hash);
        const isExpired = (now.getTime() > parseInt(req.query.expires));
        const verificationUrl = APP_URL + req.originalUrl.split('&signature=')[0];
        const signature = crypto.createHmac('sha256', APP_KEY)
          .update(verificationUrl)
          .digest('hex');
        const isCorrectSignature = (signature === req.query.signature);

        if(!isCorrectHash || !isCorrectSignature || isExpired) {
          res.status(422).send('このURLはすでに有効期限切れか、正しくありません。');
        } else {  // 本登録
          user.emailVerifiedAt = new Date();
          user.save();

          // ログイン＆リダイレクト（Passport.js）
          req.login(user, () => res.redirect('/user'));
        }
      }
    });
});

// ログインフォーム
app.get('/login', (req, res) => {
  const errorMessage = req.flash('error').join('<br>');
  res.render('private_diary/base', {
    file: '../login/form',
    auth: req.user,
    messages: undefined,
    errorMessage: errorMessage
  });
});
// ログイン実行
app.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true,
    badRequestMessage: '「ユーザー名」と「パスワード」は必須入力です。'
  }),
  (req, res, next) => {
    if(!req.body.remember) {  // 次回もログインを省略しない場合

      res.clearCookie('remember_me');
      return next();

    }
    
    const user = req.user;
    const rememberToken = crypto.randomBytes(20).toString('hex'); // ランダムな文字列
    const hash = crypto.createHmac('sha256', APP_KEY)
      .update(user.id +'-'+ rememberToken)
      .digest('hex');
    user.rememberToken = rememberToken;
    user.save();

    res.cookie('remember_me', rememberToken +'|'+ hash, {
      path: '/',
      maxAge: 5 * 365 * 24 * 60 * 60 * 1000 // 5年
    });

    return next();

  },
  (req, res) => {

    res.redirect('/user');

  }
);
// ログイン成功後のページ
app.get('/user', authMiddleware, (req, res) => {
  res.redirect('/diary-list');
});

//ログアウト
app.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
