import { urlToQuery } from "./helpers/helpers.js";

export const imageList = (/** @type {string[]} */ files) => {
  const outputFolder = "image";

  return `<html lang="en">
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
      /*grid-auto-rows: 30em;*/
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
};
