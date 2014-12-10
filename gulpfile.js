var gulp = require('gulp'),
    less = require('gulp-less'),
    mincss = require('gulp-minify-css'),
    watch = require('gulp-watch'),
    livereload = require('gulp-livereload'),
    plumber = require('gulp-plumber');

gulp.task('less', function(cb) {
  try {
  gulp.src('./public/css/*.less')
      .pipe(plumber())
      .pipe(less())
      .pipe(gulp.dest('./public/css'));

  } catch (err) {
    cb(err);
    return;
  }

  cb();
});

gulp.task('lessReload', function(cb) {
  try {
  gulp.src('./public/css/*.less')
      .pipe(plumber())
      .pipe(less())
      .pipe(gulp.dest('./public/css'))
      .pipe(livereload());

  } catch (err) {
    cb(err);
    return;
  }

  cb();
});

// watch
gulp.task('watch', function() {
  gulp.watch('public/css/*.less', ['lessReload']);
});

//default
gulp.task('default', ['watch']);