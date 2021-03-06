"use strict";
const express = require('express');
const config = require('config');
const cors = require('cors');
const app = express();
const http = require('http');
http.Server(app);
const bodyParser = require('body-parser');
const responseJSON = require('./server/response');
app.use(cors());
app.use(bodyParser.json());
app.use('/exports/file', express.static('exports'));
const fs = require('fs');

main();

function main() {
    app.get('/', function (req, res) {
        res.status(200).send('WI Online Inventory!');
    });

    let authenticate = require('./server/authenticate/authenticate');
    app.use(authenticate());

    let uploadRouter = require('./server/upload/upload.router');
    let curveRouter = require('./server/curve/curve.router');
    let datasetRouter = require('./server/dataset/dataset.router');
    let wellRouter = require('./server/well/well.router');
    let userRouter = require('./server/user/user.router');
    let exportRouter = require('./server/export/export.router');
    let importFromProjectRouter = require('./server/import-from-project/import.router');

    app.use('/', uploadRouter);
    app.use('/user/well/dataset/', curveRouter);
    app.use('/user/well/', datasetRouter);
    app.use('/user/', wellRouter);
    app.use('/', userRouter);
    app.use('/export', function(req, res, next){
        const userFolder = (process.env.INVENTORY_EXPORTPATH || config.exportPath) + '/' + req.decoded.username + '/';
        if(!fs.existsSync(userFolder)){
            fs.mkdir(userFolder, { recursive: true }, (err) => {
                if(err) {
                    console.log("Export create folder failed!!!");
                    console.log(userFolder)
                }
            });
        }
        next();
    })
    app.use('/export', exportRouter);
    app.use('/import/project', importFromProjectRouter);

    // let uploadCSV = require('./server/upload/csvUpload/csvRouter');
    // app.use('/', uploadCSV);

    // let testRouter = require('./controllers/index');
    // let curveRouter = require('./controllers/curve/curveRouter');
    // let wellRouter = require('./controllers/well/wellRouter');
    // let userRouter = require('./controllers/user/userRouter');
    // let datasetRouter = require('./controllers/dataset/datasetRouter');
    //
    //
    // app.use('/', testRouter);
    // app.use('/', userRouter);
    // app.use('/user', wellRouter);
    // app.use('/user/well', datasetRouter);
    // app.use('/user/well/dataset', curveRouter);
    // app.use('/', uploadRouter);

    app.use(function (req, res) {
        res.status(404).send(responseJSON(404, "Not found", "Not found router"));
    });
    app.listen(process.env.INVENTORY_PORT || config.Application.port, function () {
        console.log('Listening on port : ' + (process.env.INVENTORY_PORT || config.Application.port));
    })
}
