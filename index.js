import express from "express";
import axios from "axios";
import fs from "fs";

const app = express();
const port = process.env.PORT || 5000;
const endpoint =
  "https://replicate.com/api/models/prompthero/openjourney/versions/9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb/predictions";
const outputFolder = "images";

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
  const fileExists = fs.existsSync(filePath);

  res.header("Access-Control-Allow-Origin", "*");
  res.header("vary", "Accept-Encoding");

  if (prompt) {
    // if (typeof req.query.seed === "undefined") {
    //   res.redirect(`${req.url}&seed=${seed}`);
    //   return;
    // }
    console.clear();
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
              res.status(400).send(error.message);
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
        .catch(function (error) {
          res.status(500).end(error.message);
        });
    } else {
      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": "image/png" });
        res.end(data);
      } catch (error) {
        res.end("error");
      }
    }
  } else {
    res.send(`<h1>Url to Image Generator</h1>
    <p>To create an image, use the form fields, or append the following parameters to your url:</p>
    <form id="form" method="get">
      <div class="page">
        <article>
          <fieldset>
            <label for="prompt">Prompt:</label>
            <input type="text" name="prompt" id="prompt" />
          </fieldset>
          <fieldset class="half">
            <label for="w">Width:</label>
            <input type="text" name="w" id="w" placeholder="512" />
          </fieldset>
          <fieldset class="half">
            <label for="h">Height:</label>
            <input type="text" name="h" id="h" placeholder="512" />
          </fieldset>
          <fieldset class="half">
            <label for="quality">Quality:</label>
            <input type="text" name="quality" id="quality" placeholder="20" />
          </fieldset>
          <fieldset class="half">
            <label for="precision">Precision:</label>
            <input type="text" name="precision" id="precision" placeholder="10" />
          </fieldset>
          <fieldset>
            <label for="seed">Seed:</label>
            <input type="text" name="seed" id="seed" />
          </fieldset>
          <div>
            <button>Submit</button>
          </div>
        </article>
      </div>    
    </form>
    <pre>
| parameter | values    | default | description                                                                                                          |
| --------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| prompt*   | string    |         | The description of the image to generate                                                                             |
| w         | 128-1024  | 512     | The width of the image.                                                                                              |
| h         | 128-1024  | 512     | The height of the image.                                                                                             |
| quality   | 1-500     | 20      | The number of inference steps. The higher the number the better the quality. Also, the slower the generation process |
| precision | 1-20      | 10      | The guidance scale. The higher the number, the more accurate the AI follows the prompt.                              |
| seed      | 0-1000000 | random  | A generation seed number. By default a random number will be chosen. number.                                         |
| force     | boolean   | false   | Force reloading the image from the server.                                                                           |
    </pre>
    <style>
    html {
      font-size: 16px;
      font-family: "Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", sans-serif;
      background: #eeeeee;
      padding: 0.5rem;
      margin: 0 0.5rem;
    }
    
    :focus {
      outline-width: 3px;
      outline-color: #008800;
      outline-offset: 1px;
    }
    
    :hover {
      outline-width: 2px;
      outline-color: #00ff00;
      outline-offset: 3px;
    }
    
    /* page */
    .page > * {
      position: relative;
      background: #ffffff;
      margin-top: 2rem;
      margin-bottom: 2rem;
      border-radius: 0.2rem;
    }
    .page article {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      padding: 0.5rem 0;
    }
    .page article > * {
      margin: 0.5rem 1rem;
    }
    .page > *::after {
      position: absolute;
      top: -1rem;
      left: 0;
      font-size: 16px;
    }
    
    fieldset {
      border: none;
      padding: 0;
      width: 100%;
    }

    fieldset.half {
      width: calc(50% - 2rem);
    }
    
    label {
      display: block;
    }
    
    input[type="text"] {
      font-size: 1em;
      padding: 0.5em;
      width: 100%;
    }
    
    .button__container {
      display: flex;
      justify-content: start;
      flex-direction: row-reverse;
      gap: 0.2em;
    }
    
    button {
      color: #ffffff;
      background-color: #008844;
      font-size: 1em;
      padding: 0.6em;
      border: 0;
      border-radius: 0.2em;
      cursor: pointer;
    }

    pre {
      font-size: 1vw;
    }
    </style>

    <script>
    var myForm = document.getElementById('form');
    myForm.addEventListener('submit', function () {
      var allInputs = myForm.getElementsByTagName('input');
      for (var i = 0; i < allInputs.length; i++) {
        var input = allInputs[i];
        if (input.name && !input.value) {
          input.name = '';
        }
      }
    });
    </script>`);
  }
});

app.get("/test", (req, res) => {
  res.end("Testing is OK");
});

app.use("/images", express.static("images"));
app.get("/images", (req, res) => {
  fs.readdir(outputFolder, (err, files) => {
    res.send(
      files
        .filter((file) => file.indexOf(".png") > 0)
        .map((file) => `<img src="/${outputFolder}/${file}"/>`)
        .join("")
    );
  });
});

app.listen(port, () => {
  console.log(`Now listening to port ${port}`);
});
