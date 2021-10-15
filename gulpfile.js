const childProcess = require('child_process');
const gulp = require('gulp');
const del = require('del');

function handleBuild(childProcess, cb) {
    childProcess.on('error', (err) => {
        console.error(err);
        cb();
    });

    childProcess.stdout.on('data', (data) => {
        console.log(data);
    });

    childProcess.stderr.on('data', (data) => {
        console.error(data);
    });
}

function copyBFastJson(cb) {
    gulp.src('./src/bfast.json').pipe(gulp.dest('./dist/'));
    cb();
}

function compileTsESM(cb) {
    const compileTs = childProcess.exec('tsc');
    compileTs.on('exit', _ => {
        cb();
    });
    handleBuild(compileTs, cb);
}

function compileTsCJS(cb) {
    const compileTs = childProcess.exec('tsc --module commonjs --target es5 --outDir dist/cjs');
    compileTs.on('exit', _ => {
        cb();
    });
    handleBuild(compileTs, cb);
}

function deleteBuild(cb) {
    del(['dist/**', '!dist'], {force: true});
    cb();
}

exports.build = gulp.series(deleteBuild, compileTsESM, compileTsCJS, copyBFastJson);
