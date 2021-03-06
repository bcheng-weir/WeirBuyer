var gulp = require('gulp'),
    config = require('../../gulp.config'),
    del = require('del'),
    inject = require('gulp-inject'),
    replace = require('gulp-replace');

gulp.task('clean-index', function() {
    return del(config.compile + '**/*.html');
});

gulp.task('index', ['clean-index', 'app-js', 'lib-js', 'app-css', 'fonts', 'images'], function() {
    var target = gulp.src(config.index),
        libFiles = gulp.src(config.compile + '**/lib*.js', {read: false}),
        appFiles = gulp.src([config.compile + '**/app*.js', config.compile + '**/*.css'], {read: false});
    var regex = /(\"assets\/styles\/app-+.*\")/;
    var subst = `$1 media="screen"`;

    return target
        .pipe(inject(libFiles, {
            removeTags: true,
            empty: true,
            ignorePath: config.compile.replace('./', '').replace('/', ''),
            addRootSlash: false,
            name: 'bower'
        }))
        .pipe(inject(appFiles, {
            removeTags: true,
            empty: true,
            ignorePath: config.compile.replace('./', '').replace('/', ''),
            addRootSlash: false
        }))
        .pipe(replace(regex, subst))
        .pipe(gulp.dest(config.compile));
});
