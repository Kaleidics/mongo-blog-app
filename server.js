"use strict";

const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
mongoose.Promise = global.Promise;

const {PORT, DATABASE_URL} = require("./config");
const {BlogPost} = require("./models");

const app = express();

app.use(morgan("common"));
app.use(express.json());

//all posts
app.get('/posts', (req, res) => {
    BlogPost
        .find()
        .then(posts => {
            res.json(posts.map(post => post.serialize()));
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'something went terribly wrong' });
        });
});

// app.get("/posts", function(req, res) {
//     BlogPost.find().then(function(posts) {
//         res.json(posts.map(function(post) {
//             post.serialize()
//         }))
//     .catch(function(error) {
//         console.log(error);
//         res.status(500).json({ error: 'failed'});
//     });
//     });
// });

//single post by id
app.get("/posts/:id", (req, res) => {
    BlogPost
        .findById(req.params.id)
        .then(post => res.json(post.serialize()))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: "failed"})
        });
});

//create a new post
app.post("/posts", (req, res) => {
    const requiredFields = ["title", "content", "author"];
    for (let i=0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!(field in req.body)) {
            const message = `Missing ${field}`;
            console.error(message);
            return res.status(400).send(message);
        }
    }

    BlogPost
        .create({
            title: req.body.title,
            content: req.body.content,
            author: req.body.author
        })
        .then(blogPost => res.status(201).json(blogPost.serialize()))
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: "failed"});
        });
});

//delete a post
app.delete("/posts/:id", (req, res) => {
    BlogPost.findByIdAndRemove(req.params.id)
    .then(() => {
        res.status(204).json({ message: "success"});
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({ error: "failed"});
    });
});

//update a post
app.put("/posts/:id", (req, res) => {
    if (!(req.params.id && req.body.id === req.body.id)) {
        res.status(400).json({
            error: "request path id and request body values must match"
        });
    }

    const updated = {};
    const updateableFields = ["title", "content", "author"];
    updateableFields.forEach(field => {
        if (field in req.body) {
            updated[field] = req.body[field];
        }
    });

    BlogPost
        .findByIdAndUpdate(req.params.id, {$set: updated}, {new: true})
        .then(updatedPost => res.status(204).end())
        .catch(err => res.status(500).json({message: "failed"}));

})

//needs clarification
app.use("*", function (req, res) {
    res.status(404).json({ message: "Not found"});
});


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