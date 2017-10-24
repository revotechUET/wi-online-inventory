"use strict";

var express = require("express");
var router = express.Router();
var config = require("config");
var multer = require('multer');
var wi_import = require("../../import-module");
var asyncLoop = require("node-async-loop");
var Well = require("../../models").Well;
var Curve = require("../../models").Curve;
var File = require("../../models").File;
const EventEmitter = require('events');
let event = new EventEmitter.EventEmitter();

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

var upload = multer({storage: storage});

function LASDone(result, file, callback) {
    let fileInfo = new Object();
    fileInfo.name = file.originalname;
    fileInfo.size = file.size;
    fileInfo.idUser = 1;

    let wellInfo = new Object();
    wellInfo.name = result.wellname;
    wellInfo.startDepth = result.start;
    wellInfo.stopDepth = result.stop;
    wellInfo.step = result.step;

    File.create(fileInfo)
        .then((file) => {
            wellInfo.idFile = file.idFile;
            Well.create(wellInfo)
                .then((well) => {
                    result.datasetInfo.forEach((dataset) => {
                        let curves = dataset.curves;
                        console.log('curves: ' + curves);
                        asyncLoop(curves, function (curve, next) {
                            if(curve) {

                                curve.idWell = well.idWell;
                                curve.name = curve.datasetname + "_" + curve.name;
                                Curve.create({
                                    name: curve.name,
                                    idWell: curve.idWell,
                                    unit: curve.unit,
                                    path: curve.path
                                }).then(() => {
                                    next();
                                }).catch(err => {
                                    console.log(err);
                                    next(err);
                                });
                            }
                            else next();
                        }, function (err) {
                            console.log('loi roi: ' + err);
                            if(err) callback(err, null);
                            else callback(null, 'las file extracted');
                        });
                    })
                })
                .catch((err) => {
                    console.log('Well creation failed: ' + err);

                })
        })
        .catch((err) => {
        console.log('file creation failed: ' + err);
        })
}

function processFileUpload(file, next) {
    let fileFormat = file.filename.substring(file.filename.lastIndexOf('.') + 1, file.filename.length);

    if (/LAS/.test(fileFormat.toUpperCase())) {
        wi_import.setBasePath(config.dataPath);
        wi_import.extractLAS2(file.path, function (err, result) {
            if (err) {
                if (/LAS_3_DETECTED/.test(err)) {
                    wi_import.extractLAS3(file.path, function (err, result) {
                        if (err) {
                            console.log('las 3 extract failed!');
                            if(next) next(err);
                        }
                        else {
                            LASDone(result, file, (err, result) => {
                                if(err) {
                                    if(next) next(err);
                                }
                                else {
                                    next(result);
                                }
                            })
                        }
                    });
                }
                else {
                    if(next) next(err);
                }
            }
            else {
                LASDone(result, file, function (err, result) {
                    if (err) {
                        if(next) next(err);
                    }
                    else {
                        if(next) next();
                    }
                });
            }


        })
    }
    else {
        if(next) next();
    }
}

router.post('/upload/lases', upload.array('file'), function (req, res)  {
    wi_import.setBasePath(config.dataPath);

    asyncLoop(req.files, (file, next) => {
        processFileUpload(file, next);
    }, (err) => {
        if(err) res.status(500).send(err);
        else {
            res.sendStatus(200);
        }
    })

})

module.exports = router;