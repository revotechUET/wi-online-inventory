const responseJSON = require('../response');
const lasProcessing = require('./function/lasProcessing');
const asciiProcessing = require('./function/asciiProcessing');
const coredataProcessing = require('./function/coredataProcessing');


let uploadAsciiFiles = function (req, cb) {
    asciiProcessing.uploadAsciiFiles(req, cb);
};

let uploadFiles = function (req, cb) {
    coredataProcessing.uploadFiles(req, cb);
};

module.exports = {
    uploadAsciiFiles: uploadAsciiFiles,
    uploadFiles: uploadFiles,
    uploadLasFiles: lasProcessing.uploadLasFiles
};