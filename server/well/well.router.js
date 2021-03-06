"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../models/index');
let Well = models.Well;
let response = require('../response');
let wellModel = require('./well.model');
const lasProcessing = require('../upload/function/lasProcessing');
let Sequelize = require('sequelize');
const Op = Sequelize.Op;

const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({storage: storage});

router.use(bodyParser.json());

router.post('/well/new', function (req, res) {
    Well.create(req.body).then(well => {
        res.send(response(200, 'SUCCESSFULLY CREATE NEW WELL', well));
    }).catch(err => {
        res.send(response(500, 'FAILED TO CREATE NEW WELL', err));
    });
});

router.post('/well/full-info', function (req, res) {
    let Op = require('sequelize').Op;
    let condition = {};
    if (req.body.idWell) {
        condition = {idWell: req.body.idWell}
    } else {
        condition = {
            [Op.and]: [
                {name: {[Op.eq]: req.body.name}},
                {username: req.decoded.username}
            ]
        }
    }
    if (req.body.name) {
        Well.findOne({
            where: condition,
            include: [
                {model: models.WellHeader},
                {
                    model: models.Dataset,
                    include: {
                        model: models.Curve,
                        include: {model: models.CurveRevision}
                    }
                }
            ]
        }).then(well => {
            res.send(response(200, 'SUCCESSFULLY', well));
        }).catch(err => {
            res.send(response(512, 'ERROR', err.message));
        });
    } else {
        Well.findByPk(req.body.idWell, {
            include: [
                {model: models.WellHeader},
                {
                    model: models.Dataset,
                    include: {
                        model: models.Curve,
                        include: {model: models.CurveRevision}
                    }
                }
            ]
        }).then(well => {
            res.send(response(200, 'SUCCESSFULLY', well));
        }).catch(err => {
            res.send(response(512, 'ERROR', err.message));
        });
    }

});

router.post('/well/find-or-create-by-name', function (req, res) {
    let token = req.body.token || req.query.token || req.header['x-access-token'] || req.get('Authorization');    
    wellModel.findOrCreateWellByName(req.body.name, req.decoded.username, req.body.idProjectWell, token, function (err, well) {
        if (err) {
            res.send(response((500, 'ERROR')));
        } else {
            res.send(response(200, 'SUCCESSFULLY', well));
        }
    })
})
router.post('/well/info', function (req, res) {
    wellModel.findWellById(req.body.idWell, req.decoded.username)
        .then(well => {
            if (well) {
                models.WellHeader.findAll({
                    where: {
                        idWell: well.idWell
                    }
                }).then(headers => {
                    well = well.toJSON();
                    headers.forEach(header => {
                        well[header.header] = header.value;
                    });
                    res.send(response(200, 'SUCCESSFULLY GET WELL INFOR', well));
                }).catch(err => {
                    console.log(err);
                    res.send(response(200, 'SUCCESSFULLY GET WELL INFOR', well));
                })

            } else {
                res.send(response(200, 'NO WELL FOUND BY ID'));
            }
        }).catch(err => {
            res.send(response(500, 'FAILED TO FIND WELL', err));
        });
});

router.post('/well/edit', function (req, res) {
    wellModel.editWell(req.body, req.decoded.username, (err, result) => {
        if (err) res.send(response(500, 'FAILED TO EDIT WELL', err));
        else res.send(response(200, 'SUCCESSFULLY EDIT WELL', result));
    })

});

router.post('/well/delete', function (req, res) {
    wellModel.deleteWell(req.body.idWell, req.decoded.username)
        .then(result => {
            res.send(response(200, 'SUCCESSFULLY DELETE WELL', result));
        })
        .catch(err => {
            res.send(response(200, 'FAILED TO DELETE WELL: ', err));
        })
});

router.post('/well/addDatasets', upload.array('file'), function (req, res) {
    //this route is for upload and import datasets to an existing well
    //req.body.idWell
    lasProcessing.uploadLasFiles(req, (err, result) => {
        if (err) res.send(response(500, 'ADD DATASETS FAILED'));
        else res.send(response(200, 'SUCCESSFULLY ADD DATASETS', result));
    })

});

router.post('/well/copyDatasets', function (req, res) {
    //copy datasets from another well
    //req.body.datasets = [], req.body.idWell
    wellModel.copyDatasets(req, (err, rs) => {
        if (err) res.send(response(500, 'COPY DATASETS FAILED', err));
        else res.send(response(200, 'SUCCESSFULLY COPY DATASETS', rs));
    })
});

router.post('/wells', function (req, res) {
    let opts = {
        where: {
            username: req.decoded.username,
        },
        include: {
            model: models.WellHeader,
            attributes: ['header', 'value', 'unit', 'description']
        },
        order: ['idWell']
    };
    if (!isNaN(req.body.start) && req.body.limit) {
        opts.limit = req.body.limit;
        if (req.body.forward) {
            opts.where.idWell = {
                [Op.gt]: req.body.start
            }
        }
        else {
            opts.where.idWell = {
                [Op.lt]: req.body.start
            };
            opts.order = [["idWell", 'DESC']]
        }
    }
    Well.findAll(opts)
        .then((wells) => {
            res.send(response(200, 'SUCCESSFULLY GET WELLS', wells));
        })
        .catch((err) => {
            res.send(response(500, 'FAILED TO GET WELLS', err));
        })
});

router.post('/well/editHeader', function (req, res) {
    console.log("============= " + req.body.idWell + ' ' + req.body.header);
    let Op = require('sequelize').Op;
    models.WellHeader.findOrCreate({
        where: {
            [Op.and]: [
                {header: {[Op.eq]: req.body.header}},
                {idWell: req.body.idWell}
            ]
        },
        defaults: {
            header: req.body.header,
            value: req.body.value,
            idWell: req.body.idWell
        }
    })
        .then(rs => {
            let well_header = rs[0];
            if (!rs[1]) {
                // console.log(JSON.stringify(well_header))
                Object.assign(well_header, req.body);
                well_header.save().then(c => {
                    console.log("==========> saved");
                    res.send(response(200, 'SUCCESSFULLY EDIT WELL HEADER', c));
                }).catch(e => {
                    res.send(response(500, 'FAILED TO EDIT WELL HEADER', e));
                })
            } else {
                res.send(response(200, 'SUCCESSFULLY CREATE NEW HEADER', rs[0]));
            }
        })
});

router.post('/well/exportHeader', function (req, res) {
    let idWells = req.body.idWells;
    wellModel.exportWellHeader(idWells, function (err, result) {
        if (err) {
            res.send(err);
        } else {
            res.status(200).sendFile(result, function (err) {
                if (err) console.log(err);
                require('fs').unlinkSync(result);
                console.log("Tmpfile removed");
            });
        }
    });
});

router.post('/well/findbyname', function (req, res) {
    let Op = require('sequelize').Op;
    Well.findOne({
        where: {
            name: {[Op.eq]: req.body.wellname}
        },
        include: [{
            model: models.WellHeader
        }, {
            model: models.User,
            attributes: [],
            where: {
                username: req.decoded.username
            }
        }]
    }).then(well => {
        res.send(response(200, 'SUCCESSFULLY GET WELL', well));
    }).catch(err => {
        console.log(err);
        res.send(response(500, 'FAILED TO GET WELL', err));
    })
});

module.exports = router;
