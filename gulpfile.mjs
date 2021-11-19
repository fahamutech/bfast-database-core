import gulp from "gulp";
import del from "del";

function copyBFastJson(cb) {
    gulp.src('./src/bfast.json').pipe(gulp.dest('./dist/'));
    cb();
}
function copyPackageJson(cb) {
    gulp.src('./package.json').pipe(gulp.dest('./dist/'));
    cb();
}
function copyNpmRc(cb) {
    gulp.src('./.npmrc').pipe(gulp.dest('./dist/'));
    cb();
}
function deleteBuild(cb) {
    del(['dist/**', 'dist/**.json', '!dist'], {force: true})
        .finally(cb());
}

export const build = gulp.series(deleteBuild, copyBFastJson, copyPackageJson, copyNpmRc);
