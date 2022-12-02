import fs from "fs";
import axios from "axios";
import getUuidByString from "uuid-by-string";
import { writeImageData } from "./png.js";

const imageProgressRequest = (/** @type {string} */ uuid) => {
  return new Promise((resolve, reject) => {
    axios({
      method: "get",
      url: `${apiEndpoint}/${uuid}`,
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

export const apiEndpoint = "https://replicate.com/api/models";
export const apiPath = {
  openjourney: "/prompthero/openjourney/versions/9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb/predictions",
  stablediffusion: "/stability-ai/stable-diffusion/versions/27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478/predictions",
  stablediffusion2: "/cjwbw/stable-diffusion-v2/versions/4e1512ce9fd7254041f48446b73a91ddd1b81dc44709d204ef2c788bf92d48a9/predictions",
  material: "/tommoore515/material_stable_diffusion/versions/3b5c0242f8925a4ab6c79b4c51e9b4ce6374e9b07b5e8461d89e692fd0faa449/predictions",
};
export const outputFolder = "image";

export const statusCode = (/** @type {Error} */ error) => Number(error.message.replace(/\D/g, ""));

export const urlToQuery = (/** @type {string} */ url) => {
  let query = {};
  decodeURIComponent(url)
    .replace(/\.png(\?.*?)?$/g, "")
    .split("+")
    .forEach((/** @type {string} */ part) => (query[part.replace(/^image\/(.*?)$/, "$1").split("_")[0]] = part.split("_")[1]));
  return query;
};

export const toUuid = (/** @type {string} */ filePath) => `${outputFolder}/${getUuidByString(filePath)}.png`;

export const imageRequest = async (/** @type {string} */ uuid) => {
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

export const writeImage = async (
  /** @type {import("express-serve-static-core").Response<any, Record<string, any>, number>} */ res,
  /** @type {import("axios").AxiosResponse<any, any>} */ resImage,
  /** @type {string} */ filePath
) => {
  try {
    const writer = fs.createWriteStream(toUuid(filePath));
    const stream = resImage.data.pipe(writer);
    stream.on("finish", () => {
      //   writer.close();
      readImage(res, filePath);
    });
  } catch (error) {
    console.log(error);
  }
};

export const readImage = (
  /** @type {import("express-serve-static-core").Response<any, Record<string, any>, number>} */ res,
  /** @type {string} */ filePath
) => {
  try {
    const data = fs.readFileSync(toUuid(filePath));
    writeImageData(filePath);
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(data);
  } catch (error) {
    res.status(400).end(error.message); // TODO REMOVE
  }
};
