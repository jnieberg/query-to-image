# AI Url to Image

## Introduction

With this small node server you can create any image from your browser.

## Usage

### Setup

This tool runs with [Node.js](https://nodejs.org/en/). Clone this repo and setup with:

```
npm install
node index
```

### Start

#### Query parameters

The server runs locally at `http://localhost:3000`. The following query parameters can be used:

| query     | values      | default  | description                                                                                                                                                   |
| --------- | ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prompt    | `string`    | `""`     | The description of the image to generate                                                                                                                      |
| w         | `128-1024`  | `512`    | The width of the image.                                                                                                                                       |
| h         | `128-1024`  | `512`    | The height of the image.                                                                                                                                      |
| quality   | `1-500`     | `20`     | The number of inference steps. The higher the number the better the quality. Also, the slower the generation process                                          |
| precision | `1-20`      | `10`     | The guidance scale. The higher the number, the more accurate the AI follows the prompt.                                                                       |
| seed      | `0-1000000` | `random` | A generation seed number. By default a random number will be chosen. number.                                                                                  |
| force     | `boolean`   | `false`  | Normally all generated images will be cached, so with the same query the image will not be regenerated. This will force regenerate the image from the server. |

#### Examples

Append the following query strings behind the domain (e.g. `http://localhost:3000`)

`?prompt=red long haired maine coon cat&precision=10`

`?prompt=portrait of female elf, intricate, elegant, highly detailed, digital painting, artstation, concept art, smooth, sharp focus, illustration, art by artgerm and greg rutkowski and alphonse mucha, 8k`

`?prompt=Fantasy house tree in the woods with animals and full of life&w=1024&h=768&quality=200`

`?prompt=army defending stone bridge of a castle from a large attacking force, digital art, 4 k, epic, intense, medieval, intricate, battle, armies clashing, medieval warfare, castle, greg rutkowski, joeri lefevre, max prodanov, trending on artstation&w=512&h=1024&quality=50&precision=7&seed=8482955`

## Disclaimer

All credits should go to [PromptHero](https://prompthero.com/) and [Replicate](https://replicate.com/prompthero/openjourney), as this mainly uses their API to generate the images. Don't be disappointed when you suddenly get a 403 error as a response, as this means you may have exceeded your number of free requests to the Replicate server on your IP address.
