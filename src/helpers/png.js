import fs from "fs";
import png from "png-metadata";
import { outputFolder, toUuid, urlToQuery } from "./helpers.js";

const char0 = String.fromCharCode(0);

const writeTextData = (/** @type {string} */ key, /** @type {string} */ value) => key + char0 + value;

export const readImageData = (/** @type {string} */ fileUuid) => {
  const data = {};
  const image = png.readFileSync(`${outputFolder}/${fileUuid}`);
  let list = png.splitChunk(image) || [];
  list = list.filter((item) => item.type === "tEXt");
  list.forEach((item) => {
    const [key, val] = item.data.split(char0);
    data[key] = val;
  });
  return data;
};

export const writeImageData = (/** @type {string} */ filePath) => {
  const { model = "stablediffusion2", prompt, exclude = "", quality = 20, precision = 10, w = 512, h = 512, seed = 1 } = urlToQuery(filePath);
  const data = {
    Description: prompt,
    model,
    prompt,
    exclude,
    w,
    h,
    quality: String(quality),
    precision: String(precision),
    seed: seed,
    filename: filePath,
  };
  const uuid = toUuid(filePath);
  const image = png.readFileSync(uuid);
  let list = png.splitChunk(image) || [];
  list = list.filter((item) => item.type !== "tEXt");

  const iend = list.pop(); // remove IEND
  Object.entries(data)
    .filter(([k, v]) => v)
    .forEach(([k, v]) => {
      const newchunk = png.createChunk("tEXt", writeTextData(k, v));
      list.push(newchunk);
    });
  iend && list.push(iend);
  const newpng = png.joinChunk(list);
  fs.writeFileSync(uuid, newpng, "binary");
};
