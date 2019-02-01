"use strict";

const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
mongoose.Promise = global.Promise;

const {PORT, DATABASE_URL} = require("./config");
const { Author, BlogPost} = require("./models");


const app = express();

app.use(morgan("common"));
app.use(express.json());


//build a response to /authors route
//find all authors from Authors collection
//for each instance in the Authors collection return only the id, name, username
app.get("/authors", (req, res) => {
    Author
    .find()
    .then(authors => {
        res.json(authors.map(author => {
            return {
                id: author.id,
                name: `${author.firstName} ${author.lastName}`,
                userName: author.userName
            };
        }));
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({ error: `failed`});
    })
});

//build a response for a post request for the /authors route, creates a new author
//check if the request body has all the required fields
//check if the username included in the request exists already in the Author collection, error if it does
//create a new instance of the Author if no error
//catch blocks for each of the promises
app.post("/authors", (req, res) => {
    const requiredFields = ["firstName", "lastName", "userName"];
    for (let i=0; i<requiredFields.length; i++) {
        let field = requiredFields[i];
        if (!(field in req.body)) {
            res.status(400).json({ error: `request body is missing ${field}`});
        }
    }

    Author
        .findOne({ userName: req.body.userName})
        .then(author => {
            if (author) {
                return res.status(400).send(`username taken`)
            }
            else {
                Author
                    .create({
                        firstName: req.body.firstName,
                        lastName: req.body.lastName,
                        userName: req.body.userName
                    })
                    .then(author => {
                        res.status(201).json({
                            _id: author.id,
                            name: `${author.firstName} ${author.lastName}`,
                            userName: author.userName
                        })
                    })
                    .catch(err => {
                        res.status(500).json({ error: `failed`});
                    });
            }
        })
        .catch(err => {
            res.status(500).json({ error: `failed`});
        })
})

//update an Author instance
//check if the id in the params id exists and if the params id and body id are equal to body id
//build the a new object containing the new content sent by the post request
//find an author in the Author collection with a matching id sent in the param id or  match username found in body id
//if updating a username in req body check if it already exists, if so error
//else find the instance of an Author by params id and update with the object created earlier which contains the new content

app.put("/authors/:id", (req, res) => {
    if (!(req.params.id && req.body.id && req.body.id === req.body.id)) {
        res.status(400).json({
            error: `request path id and request body id must match`
        });
    }
    
    const updated = {};
    const updateableFields = ["firstName", "lastName", "userName"];
    for (let i=0; i<updateableFields.length; i++) {
        let field = updateableFields[i];
        if (field in req.body) {
            updated[field] = req.body[field];
        }
    }

    Author
        .findOne({ userName: updated.userName || "", _id: { $ne: req.params.id}})
        .then(author => {
            if(author) {
                return res.status(400).send(`username taken`)
            }
            else {
                Author
                    .findByIdAndUpdate(req.params.id, { $set: updated}, { new: true})
                    .then(updatedAuthor => {
                        res.status(200).json({
                            id: updatedAuthor.id,
                            name: `${updatedAuthor.firstName} ${updatedAuthor.lastName}`,
                            userName: updatedAuthor.userName
                        });
                    })
                    .catch(err => res.status(500).json({message: err}));
            }
        });
});





//find an author by their id then delete their blog posts associated with that id
app.delete("/authors/:id", (req, res) => {
    BlogPost
    .remove({ author: req.params.id})
    .then(() => {
        Author
        .findByIdAndRemove(req.params.id)
        .then(() => {
            res.status(204).json({ message: "success"});
        });
    });
});










//all posts
app.get('/posts', (req, res) => {
    BlogPost
        .find()
        .then(posts => {
            console.log(posts);
            res.json(posts.map(post => post.serialize()));
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'something went terribly wrong here' });
        });
});


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
    const requiredFields = ["title", "content", "author_id"];
    for (let i=0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!(field in req.body)) {
            const message = `Missing ${field}`;
            console.error(message);
            return res.status(400).send(message);
        }
    }

    Author
        .findById(req.body.author_id)
        .then(author => {
            console.log("made it here", author);
            if (author) {
                console.log("made it inside author boolean");
                BlogPost
                    .create({
                        title: req.body.title,
                        content: req.body.content,
                        author: req.body.id
                    })
                    .then(blogPost => res.status(201).json({
                        id: blogPost.id,
                        author: `${author.firstName} ${author.lastName}`,
                        content: blogPost.content,
                        title: blogPost.title,
                        comments: blogPost.comments
                    }))
                    .catch(err => {
                        console.error(err);
                        res.status(500).json({ error: `Something went wrong 1`});
                    });
            }
            else {
                const message = `Author not found`;
                console.error(message);
                res.status(500).json({ error: `something went wrong 2`});
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: `failed`});
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
    console.log(req.params.id);
    BlogPost
        .findByIdAndUpdate(req.params.id, {$set: updated}, {new: true})
        .then(updatedPost => res.status(204).end())
        .catch(err => res.status(500).json({message: "failed"}));

})

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