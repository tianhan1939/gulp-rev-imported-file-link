var gulp = require('gulp');
var rename = require('gulp-rename');
var del = require('del');
var uglify = require('gulp-uglify');
var Revision = require('./index');

gulp.task('test', ['clean'], function () {
    return gulp.src('src/index.html')
        .pipe(Revision.revise())
        .pipe(rename('test.html'))
        .pipe(gulp.dest('build'));
});

gulp.task('clean', function () {
    del('build/test.html');
});