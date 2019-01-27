"use strict";

const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
mongoose.Promise = global.Promise;

const {PORT, DATABASE_URL} = require("./config");
const {blogpost} = require("./model");

const app = express();

app.use(morgan("common"));
app.use(express.json());

let server;

function runServer(databaseUrl, port = PORT) {
    return new Promise(function(resolve, reject) {
        mongoose.connect(databaseUrl, function(error) {
            if (error) {
                return reject(error);
            }
            server = app.listen(port, function() {
                console.log(`Server is listening on port ${port}`);
                resolve();
            })
            .on("error", function(error) {
                mongoose.disconnect();
                reject(error);
            });
        });
    });
}

function closeServer() {
    return mongoose.disconnect().then(function() {
        return new Promise(function(resolve, reject) {
            console.log("Closing server");
            server.close(function(error) {
                if (error) {
                    return reject(error);
                }
                resolve();
            });
        });
    });
}

if (require.main === module) {
    runServer(DATABASE_URL).catch(function(error) {
        console.log(error);
    });
}

module.exports = {app, runServer, closeServer};