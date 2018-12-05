const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const cron = require("node-cron");
let request = require("request");

const app = express();
const port = process.env.PORT || 5000;

let pageInfo = (function() {
  let wordOfDay = "";
  let user = "";
  let directLink = "";
  return {
    setWord: value => {
      wordOfDay = value;
    },
    setUser: value => {
      user = value;
    },
    setLink: value => {
      directLink = value;
    },
    getWord: () => {
      return wordOfDay;
    },
    getUser: () => {
      return user;
    },
    getLink: () => {
      return directLink;
    }
  };
})();

//creates random number
let randomWordIndex = () => {
  return Math.floor(Math.random() * 1100);
};

// returns list of words
let data = fetch("https://www.randomlists.com/data/words.json")
  .then(response => {
    if (response.status !== 200) {
      console.log("There was an error" + response.status);
    }
    return response.json();
  })
  .then(jsonData => {
    return jsonData.data;
  })
  .catch(error => {
    console.log("error while fetching", error);
  });

//picks a random word
let word = async () => {
  let [index, fetchedData] = await Promise.all([randomWordIndex(), data]);
  pageInfo.setWord(fetchedData[index]);
  return fetchedData[index];
};

//creates pixabay uri for query word;
let queryUri = async () => {
  let queryWord = await word();
  let uri = await `https://pixabay.com/api/?key=10784889-6669a8328237f7c67a6855c0d&q=${queryWord}`;
  return uri;
};

// create direct link to pic
let imageUri = async () => {
  let uri = await queryUri();
  return fetch(uri)
    .then(response => {
      if (response.status !== 200) {
        console.log("There was an error" + response.status);
      }
      return response.json();
    })
    .then(jsonData => {
      pageInfo.setUser(jsonData.hits[1].user);
      pageInfo.setLink(jsonData.hits[1].pageURL);
      return jsonData.hits[1].largeImageURL;
    })
    .catch(error => {
      console.log("error while fetching", error);
    });
};
// downloads picture from direct url
let download = async (filename, callback) => {
  let uri = await imageUri();
  request.head(uri, function(err, res, body) {
    console.log("content-type:", res.headers["content-type"]);
    console.log("content-length:", res.headers["content-length"]);
    request(uri)
      .pipe(fs.createWriteStream(filename))
      .on("close", callback);
  });
};

let downloadTask = cron.schedule("10 11 * * *", function() {
  download("./public/images/picofday.png", function() {
    console.log("Picture saved");
  });
});

downloadTask.start();

app.get("/", (req, res, next) => {
  res.render("index", {
    wordOfDay: pageInfo.getWord(),
    user: pageInfo.getUser(),
    directLink: pageInfo.getLink()
  });
});

app.set("view engine", "ejs");
app.use("/public/", express.static("./public/"));

app.listen(port, () => console.log("Your app is running"));
