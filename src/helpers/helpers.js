import fs from "fs";
import axios from "axios";

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

export const endpoint =
  "https://replicate.com/api/models/prompthero/openjourney/versions/9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb/predictions";

export const outputFolder = "image";

export const statusCode = (/** @type {Error} */ error) => Number(error.message.replace(/\D/g, ""));

export const urlToQuery = (/** @type {string} */ url) => {
  let query = {};
  decodeURIComponent(url)
    .replace(/\.png$/g, "")
    .split("+")
    .forEach((/** @type {string} */ part) => (query[part.replace(/^image\/(.*?)$/, "$1").split("_")[0]] = part.split("_")[1]));
  return query;
};

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

export const writeImage = (
  /** @type {import("express-serve-static-core").Response<any, Record<string, any>, number>} */ res,
  /** @type {import("axios").AxiosResponse<any, any>} */ resImage,
  /** @type {fs.PathLike} */ filePath
) => {
  try {
    const writer = fs.createWriteStream(filePath);
    resImage.data.pipe(writer);
  } catch (error) {}
  res.writeHead(200, { "Content-Type": "image/png" });
  resImage.data.pipe(res);
};
