import express from "express";
import serverless from "serverless-http";
import axios from "axios";
import fs from "fs";

const app = express();
const router = express.Router();
const endpoint =
  "https://replicate.com/api/models/prompthero/openjourney/versions/9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb/predictions";
const outputFolder = "/images";

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

app.use("/.netlify/functions/image", router);
router.get("/", (req, res) => {
  const {
    query: { prompt, quality = 20, precision = 10, w = 512, h = 512, seed = Math.floor(Math.random() * 1000000) },
  } = req;
  const force = typeof req.query.force === "undefined" || req.query.force === "false" ? false : true;
  const inputs = {
    prompt: `mdjrny-v4 style ${prompt}`,
    num_inference_steps: quality,
    width: w,
    height: h,
    guidance_scale: precision,
    seed,
  };
  const fileName = Object.entries(inputs)
    .map(([k, v]) => `${k}-${`${v}`.replace(/\W+/g, "+")}`)
    .join("|");
  const filePath = `${outputFolder}/${fileName}.png`;
  let fileExists = false;
  try {
    fileExists = !fs.existsSync(filePath);
  } catch (error) {}

  console.clear();
  console.log(req.query);

  if (!prompt) {
    res.end("To create an image, append to your url: ?prompt=[description of the image]");
  } else if (force || !fileExists) {
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
            res.status(400).send(error.message);
          }
          axios({
            method: "get",
            url: image,
            responseType: "stream",
          }).then((resImage) => {
            const writer = fs.createWriteStream(filePath);
            resImage.data.pipe(writer);
            res.writeHead(200, { "Content-Type": "image/png" });
            resImage.data.pipe(res);
          });
        });
      })
      .catch(function (error) {
        res.end(error.message);
      });
  } else {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(data);
  }
});

router.get("/test", (req, res) => {
  res.end("Testing is OK");
});

exports.handler = serverless(app);
