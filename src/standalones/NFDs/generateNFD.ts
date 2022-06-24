import { createCanvas, loadImage } from 'canvas'
import { getRandomElement } from '../../commands/RPG/util'
import * as fs from 'fs'

async function main() {
  console.log('START', __dirname)

  const canvas = createCanvas(112, 112)
  const ctx = canvas.getContext('2d')

  const imageList = fs.readdirSync(__dirname + '/fragments/')
  const bodyList = imageList.filter((filename) => filename.includes('_b.png'))
  const mouthList = imageList.filter((filename) => filename.includes('_m.png'))
  const eyeList = imageList.filter((filename) => filename.includes('_e.png'))

  const body = getRandomElement(bodyList)
  const mouth = getRandomElement(mouthList)
  const eye = getRandomElement(eyeList)

  console.log(`There are ${bodyList.length * mouthList.length * eyeList.length} possible NFDs`)

  await loadImage(__dirname + '/fragments/' + body).then((image) => {
    ctx.drawImage(image, 0, 0)
    console.log('drawed body')
  })
  await loadImage(__dirname + '/fragments/' + mouth).then((image) => {
    ctx.drawImage(image, 0, 0)
    console.log('drawed mouth')
  })
  await loadImage(__dirname + '/fragments/' + eye).then((image) => {
    ctx.drawImage(image, 0, 0)
    console.log('drawed eye')
  })

  console.log(body, mouth, eye)
  const out = fs.createWriteStream(__dirname + '/test.png')
  const stream = canvas.createPNGStream()
  stream.pipe(out)
  out.on('finish', () => console.log('The PNG was created.'))
}

main()
