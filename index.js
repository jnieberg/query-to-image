import express from "express";
import axios from "axios";
import fs from "fs";

const app = express();
const port = process.env.PORT || 5000;
const endpoint =
  "https://replicate.com/api/models/prompthero/openjourney/versions/9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb/predictions";
const outputFolder = "image";

const statusCode = (/** @type {Error} */ error) => Number(error.message.replace(/\D/g, ""));

const urlToQuery = (/** @type {string} */ url) => {
  let query = {};
  decodeURIComponent(url)
    .replace(/\.png$/g, "")
    .split("+")
    .forEach((/** @type {string} */ part) => (query[part.replace(/^image\/(.*?)$/, "$1").split("_")[0]] = part.split("_")[1]));
  return query;
};

const imageList = (/** @type {string[]} */ files) => `<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Generated Image List - AI Url to Image Generator</title>
  <style>
    body {
      font-family: 'Gill Sans',sans-serif;
      background: black;
      margin: 0.5em;
    }
    body > a {
      position: fixed;
      display: inline-block;
      color: #00ff88;
      font-size: 2em;
      text-decoration: none;
      padding: 0.25em 0.5em;
      border-radius: 50%;
      z-index: 1;
      right: 0.25em;
    }
    body a:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    body > div {
      display: grid;
      gap: 1em;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      grid-auto-rows: 30em;
      justify-content: center;
      align-items: center;
    }
    @media screen and (max-width: 768px) {
      body > div {
        grid-template-columns: 1fr 1fr;
      }
    }
    @media screen and (max-width: 480px) {
      body > div {
        grid-template-columns: 1fr;
      }
    }
    body > div > a {
      padding: 1em;
      position: relative;
      text-decoration: none;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border-radius: 0.2em;
      transition: background 0.3s;
    }
    body > div > a > img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: top;
    }
    body > div > a > div {
      position: absolute;
      bottom: 0.5em;
      left: 0.5em;
      right: 0.5em;
      color: white;
      line-height: 1.3em;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 0.2em;
      padding: 1em;
      opacity: 0;
      transition: opacity 0.3s;
    }
    body > div > a > div > div {
      text-align: justify;
      hyphens: auto;
      margin-bottom: 0.5em;
    }
    body > div > a > div > dl {
      display: grid;
      grid-template-columns: 25% 75%;
      gap: 0.5em;
      margin: 0;
    }
    body > div > a > div > dl > dd {
      margin: 0;
    }
    body > div > a:hover > div,
    body > div > a:focus > div {
      opacity: 1;
    }
  </style>
  <body>
    <a href="/" aria-label="Go back to AI prompt generator">×</a>
    <div>
      ${files
        .filter((file) => file.indexOf(".png") > 0)
        .map((file) => {
          const { prompt, quality = 20, precision = 10, w = 512, h = 512, seed = 1 } = urlToQuery(file);
          return `<a href="/${outputFolder}/${file}" target="_new">
            <img src="/${outputFolder}/${file}" alt="${prompt}" title="${prompt}" />
            <div>
              <div>${prompt}</div>
              <dl>
                <dt>size</dt>
                <dd>${w}x${h}</dd>
              </dl>
              <dl>
                <dt>quality</dt>
                <dd>${quality}</dd>
              </dl>
              <dl>
                <dt>precision</dt>
                <dd>${precision}</dd>
              </dl>
              <dl>
                <dt>seed</dt>
                <dd>${seed}</dd>
              </dl>
            </div>
          </a>`;
        })
        .join("")}
    </div>
  </body>
</html>`;

const imageProgressRequest = (/** @type {string} */ uuid) => {
  return new Promise((resolve, reject) => {
    axios({
      method: "get",
      url: `${endpoint}/${uuid}`,
      responseType: "stream",
    }).then((resImageProgress) => {
      let data = "";
      resImageProgress.data.on("data", (/** @type {string} */ chunk) => {
        data += chunk;
      });
      resImageProgress.data.on("end", () => {
        const json = JSON.parse(data)?.prediction;
        const image = json.output?.[0];
        const logs = json.run_logs?.replace(/^[\w\W]*?\n(.*)$/g, "$1");
        if (logs) {
          console.clear();
          console.log(logs);
          if (logs.indexOf("ValueError:") === 0) reject(logs);
        }
        resolve(image);
      });
    });
  });
};

const imageProgressRequestInterval = (/** @type {string} */ uuid) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      imageProgressRequest(uuid).then(resolve);
    }, 300);
  });
};

const imageRequest = async (/** @type {string} */ uuid) => {
  let output = await imageProgressRequest(uuid).catch((error) => {
    throw new Error(error);
  });
  while (!output) {
    output = await imageProgressRequestInterval(uuid);
  }
  console.log();
  console.log(output);
  return output;
};

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
              try {
                const writer = fs.createWriteStream(filePath);
                resImage.data.pipe(writer);
              } catch (error) {}
              res.writeHead(200, { "Content-Type": "image/png" });
              resImage.data.pipe(res);
            });
          });
        })
        .catch((error) => {
          if (statusCode(error) === 403 || statusCode(error) === 429) {
            axios({
              method: "get",
              url: `https://url-to-image.herokuapp.com${req.originalUrl}`,
              responseType: "stream",
            })
              .then((resRetryImage) => {
                let data = "";
                resRetryImage.data.on("data", (/** @type {string} */ chunk) => {
                  data += chunk;
                });
                resRetryImage.data.on("end", () => {
                  res.writeHead(200, { "Content-Type": "image/png" });
                  resRetryImage.data.pipe(res);
                });
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
