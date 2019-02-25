//需要先Require才能使用這些套件
var $ = require('gulp-load-plugins')()
var gulp = require('gulp');
var autoprefixer = require('autoprefixer');
var mainBowerFiles = require('main-bower-files');
var browserSync = require('browser-sync').create();
var minimist = require('minimist');
var gulpSequence = require('gulp-sequence');

//env這個字串預設帶入的是develop這個環境
var envOptions = {
  string: 'env',
  default: { env: 'develop' }
}

//透過minimist把傳入的參數記錄下來
//可以用gulp --env production/develop切換環境參數
var options = minimist(process.argv.slice(2), envOptions)
console.log(options)


//下面有Plumber的
//都是避免出錯的時候監控更新停止
//有Plumber即使出錯也會持續更新、繼續監控

//BrowerSync則是在檔案輸出後會直接更新上傳至伺服器雲端


//跑一次gulp clean就會把tmp跟public資料夾刪除
//可以用來確保那些develop過程中的測試檔案會被清除
gulp.task('clean',function(){
  return gulp.src(['./.tmp','./public'],{read: false})
  .pipe($.clean());
})



//將Pug編輯的檔案轉譯成HTML後放在Public裡面
gulp.task('pug', function buildHTML() {
  return gulp.src('./source/**/*.pug')
  .pipe($.plumber())

  //將陣列資料載入
  // .pipe($.data(function(){
  //   var khdata = require('./source/data/data.json');
  //   var menu = require('./source/data/menu.json');
  //   var source = {
  //     'khdata': khdata,
  //     'menu': menu
  //   };
  //   return source;
  // }))
  .pipe($.pug({
    pretty: true
  }))
	.pipe(gulp.dest('./public/'))
  .pipe(browserSync.stream());
});



//將SASS編輯的檔案轉譯成CSS然後放到Public的CSS資料夾裡面
gulp.task('sass', function () {

  //在這個階段先用autoprefixer針對瀏覽器做一些修正
  var plugins = [
    autoprefixer({browsers: ['last 3 versions', '>5%']})];

  //從source資料夾將sass檔案取出、轉譯
  return gulp.src('./source/sass/**/*.sass')
  	.pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      //在這裡載入bootstrap的路徑
      outputStyle: 'nested',
      includePaths: ['./node_modules/bootstrap/scss'],
    }).on('error', $.sass.logError))

    //編譯完成後，引用Postcss套件
    .pipe($.postcss(plugins))

    //cleanCss用來壓縮CSS文件，縮小空間
    .pipe($.if(options.env === 'production', $.cleanCss()))

    //輸出至Public資料夾後，用BrowserSync去自動更新網頁頁面
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('./public/css'))
    .pipe(browserSync.stream());
});


//將ES6編輯的檔案轉譯成一般JS然後存取到Public中的JS資料夾裡
// gulp.task('babel', () => {
//     gulp.src('./source/js/**/*.js')
//         .pipe($.sourcemaps.init())
//         .pipe($.babel({
//             presets: ['@babel/env']
//         }))

//         //Concat可以把多個檔案合併成一個，減少Request
//         .pipe($.concat('all.js'))

//         //uglify把JS檔案壓縮，縮小空間
//         //compress把測試用的console刪掉
//         .pipe($.if(options.env === 'production', $.uglify({
//           compress: {
//             drop_console: true
//           }
//         })))
//         .pipe($.sourcemaps.write('.'))
//         .pipe(gulp.dest('./public/js'))
//         .pipe(browserSync.stream());
// });


//將Bower的資料載入到Tmp資料夾裡
//Bower做Overrides讓Vue.js能正確取得dist資料夾內的vue.js
gulp.task('bower',function(){
  return gulp.src(mainBowerFiles({
    "overrides":{
      "main": "dist/vue.js"
    }
  }))
  .pipe(gulp.dest('./.tmp/vendors'));
  cb(err);
});


//vendorJs專門處理外部載入的檔案
//把Tmp的資料夾中的檔案合併到Public裡面的資料夾
//中括號中的bower表示vendorJs必須先執行完Bower才能執行
gulp.task('vendorJs', ['bower'], function(){
  return gulp.src('./.tmp/vendors/**/**.js')
  .pipe($.concat('vendors.js'))
  .pipe($.if(options.env === 'production', $.uglify()))
  .pipe(gulp.dest('./public/js'));
});


//BrowserSync建立一個伺服器，將指定資料夾內的檔案上傳
//reloaddebounce用來減少重新整理次數，2000=2秒
gulp.task('browser-sync', function(){
  browserSync.init({
    server: {
      baseDir: "./public",
      reloadDebounce: 2000
    }
  });
});


//image-min會壓縮圖片並將圖片轉到public資料夾裡
//利用gulf-if預設讓只有production的時候會進行壓縮
gulp.task('image-min', () =>
  gulp.src('./source/images/*')
  .pipe($.if(options.env === 'production', $.imagemin()))
  .pipe(gulp.dest('./public/images'))
  );


 
//監控資料夾內的所有檔案
//如果有更動、更新，就運行tasks 
gulp.task('watch', function () {
  gulp.watch('./source/sass/**/*.sass', ['sass']);
  gulp.watch('./source/**/*.pug', ['pug']);
  gulp.watch('./source/js/**/*.js', ['babel']);
});



//Deploy可以將內容一鍵發佈到Github上頭
gulp.task('deploy', function(){
  return gulp.src('./public/**/*')
  .pipe($.ghPages());
})



//只要執行Gulp，就會將列入陣列的tasks都自動執行一遍
// gulp.task('default', ['pug', 'sass', 'babel', 'vendorJs', 'image-min', 'browser-sync', 'watch']);
gulp.task('default', ['pug', 'sass', 'vendorJs', 'image-min', 'browser-sync', 'watch']);


//發布前跑一次，他就會把public、tmp資料夾清空，並且重新跑一次內容
//記得要把env切換到production
//**gulp build --env production指令碼可以產出最終上線版本
gulp.task('build', gulpSequence('clean', 'pug', 'sass', 'babel', 'vendorJs', 'image-min'))



