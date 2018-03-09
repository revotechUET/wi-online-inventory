"use strict";
let express = require('express');
let router = express.Router();
let curveExport = require('./curveExport');
let response = require('../response');
let curveModel = require('./curve.model');

router.post('/curve/new', function (req, res) {
    curveModel.createCurve(req.body, (err, curve) => {
        if (err) res.send(response(500, 'FAILED TO CREATE NEW CURVE', err));
        else res.send(response(200, 'SUCCESSFULLY CREATE NEW CURVE', curve));
    });
});

router.post('/curve/info', function (req, res) {
    const attributes = {
        revision: true
    };
    curveModel.findCurveById(req.body.idCurve, req.decoded.username, attributes)
        .then(curve => {
            if (curve) {
                res.send(response(200, 'SUCCESSFULLY GET CURVE INFOR', curve));
            } else {
                res.send(response(200, 'NO CURVE FOUND BY ID'));
            }
        }).catch(err => {
        res.send(response(500, 'FAILED TO FIND CURVE', err));
    });
});

router.post('/curve/data', function (req, res) {
    const attributes = {
        revision: true
    };
    curveModel.findCurveById(req.body.idCurve, req.decoded.username, attributes)
        .then((curve) => {
            if (curve) {
                curveExport(curve, req.body.unit, req.body.step, (err, readStream) => {
                    if (!err) {
                        readStream.pipe(res);
                    }
                    else {
                        res.send(response(500, 'CURVE CONVERSION FAILED', err));
                    }
                });
            } else {
                res.send(response(200, 'NO CURVE FOUND BY ID'));
            }
        })
        .catch((err) => {
            res.send(response(500, 'FAILED TO FIND CURVE', err));
        });
});

router.post('/curve/edit', function (req, res) {
    curveModel.editCurve(req.body, req.decoded.username, (err, result) => {
        if (err) {
            console.log(err);
            res.send(response(500, 'FAILED TO EDIT CURVE', err));
        }
        else {
            res.send(response(200, 'SUCCESSFULLY EDIT CURVE', result));
        }
    });
});

router.post('/curve/delete', function (req, res) {
    curveModel.deleteCurve(req.body.idCurve, req.decoded.username)
        .then(result => {
            res.send(response(200, 'SUCCESSFULLY DELETE CURVE', result));
        })
        .catch(err => {
            res.send(response(500, 'FAILED TO DELETE CURVE', err));
        });
});

router.post('/curves', function (req, res) {
    curveModel.getCurves(req.body.idDataset, req.decoded.username, (err, result) => {
        if (err) res.send(response(500, 'FAILED TO FIND CURVES', err));
        else res.send(response(200, 'SUCCESSFULLY GET CURVES', result));
    });
});

module.exports = router;