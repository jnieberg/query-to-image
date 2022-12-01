import express from "express";
import axios from "axios";
import fs from "fs";
import { endpoint, imageRequest, outputFolder, statusCode, urlToQuery, writeImage } from "./src/helpers/helpers.js";
import { imageList } from "./src/imageList.js";

const app = express();
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  fs.readFile("./index.html", null, function (error, data) {
    res.end(data);
  });
});

app.get("/test", (req, res) => {
  res.end("Testing is OK");
});

app.use(`/${outputFolder}s`, express.static(outputFolder));
app.get(`/${outputFolder}s`, (req, res) => {
  fs.readdir(outputFolder, (err, files) => {
    res.send(imageList(files));
  });
});
app.get(`/${outputFolder}/*`, (req, res) => {
  const filePath = decodeURIComponent(req.originalUrl.substring(1));
  const { prompt, quality = 20, precision = 10, w = 512, h = 512, seed = 1 } = urlToQuery(filePath);

  const force = typeof req.query.force === "undefined" || req.query.force === "false" ? false : true;
  const inputs = {
    prompt: `mdjrny-v4 style ${prompt}`,
    num_inference_steps: quality,
    width: w,
    height: h,
    guidance_scale: precision,
    seed,
  };

  const fileExists = fs.existsSync(filePath);

  res.header("Access-Control-Allow-Origin", "*");
  res.header("vary", "Accept-Encoding");

  if (prompt) {
    console.log(inputs);

    if (force || !fileExists) {
      axios({
        method: "post",
        url: endpoint,
        responseType: "stream",
        data: {
          inputs: {
            ...inputs,
            num_outputs: 1,
          },
        },
      })
        .then((resImageUrl) => {
          let image = null;
          let data = "";
          resImageUrl.data.on("data", (/** @type {string} */ chunk) => {
            data += chunk;
          });
          resImageUrl.data.on("end", async () => {
            const { uuid } = JSON.parse(data);
            try {
              image = await imageRequest(uuid);
            } catch (error) {
              res.status(statusCode(error)).send(error.message);
            }
            axios({
              method: "get",
              url: image,
              responseType: "stream",
            }).then((resImage) => {
              writeImage(res, resImage, filePath);
            });
          });
        })
        .catch((error) => {
          // Retry
          if (statusCode(error) === 403 || statusCode(error) === 429) {
            axios({
              method: "get",
              url: `https://url-to-image.herokuapp.com${req.originalUrl}`,
              responseType: "stream",
            })
              .then((resRetryImage) => {
                writeImage(res, resRetryImage, filePath);
              })
              .catch((error) => {
                res.status(statusCode(error)).end(error.message);
              });
          } else {
            res.status(statusCode(error)).end(error.message);
          }
        });
    } else {
      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": "image/png" });
        res.end(data);
      } catch (error) {
        // res.status(400).end("Error");
      }
    }
  } else {
    res.status(404).end("404 - Image not found");
  }
});

app.listen(port, () => {
  console.log(`Now listening to port ${port}`);
});

console.clear();
