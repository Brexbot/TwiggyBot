import { Canvas, createCanvas, loadImage } from 'canvas'
import { getRandomElement } from '../../commands/RPG/util'
import * as fs from 'fs'
import * as path from 'path'
import { CommandInteraction, MessageAttachment, MessageEmbed } from 'discord.js'
import { Discord, Slash, SlashGroup } from 'discordx'
import { getCallerFromCommand } from '../../utils/CommandUtils'

type BodyParts = {
  body: string
  mouth: string
  eyes: string
}

@SlashGroup({ name: 'nfd', description: 'Take part in the non-fungible dino economy' })
@SlashGroup('nfd')
@Discord()
class NFD {
  private MINT_COOLDOWN = 60 * 60 * 24

  private FRAGMENT_PATH = path.join(__dirname, 'fragments')
  private OUTPUT_PATH = path.join(__dirname, 'images')

  @Slash('mint', { description: 'Mint a new NFD' })
  async mint(interaction: CommandInteraction) {
    const parts = this.getParts()
    this.mintNFD(parts)
      .then((canvas) => {
        const outputName = this.makeName(parts)
        const outputFilePath = path.join(this.OUTPUT_PATH, outputName + '.png')
        return this.canvasToFileAndReply(canvas, outputFilePath)
      })
      .then((nfd) => {
        this.makeReply(nfd, interaction)
      })
      .catch((err) => {
        interaction.reply({ content: 'The dinochain broke... what a surprise', ephemeral: true }).catch((err) => {
          console.error('Something really went wrong minting this NFD...', err)
        })
      })
  }

  private getParts(): BodyParts {
    const imageList = fs.readdirSync(this.FRAGMENT_PATH)
    const bodyList = imageList.filter((filename) => filename.includes('_b.png'))
    const mouthList = imageList.filter((filename) => filename.includes('_m.png'))
    const eyesList = imageList.filter((filename) => filename.includes('_e.png'))

    const body = getRandomElement(bodyList)
    const mouth = getRandomElement(mouthList)
    const eyes = getRandomElement(eyesList)

    console.log(`There are ${bodyList.length * mouthList.length * eyesList.length} possible NFDs`)

    console.log(`picked: ${body}, ${mouth}, ${eyes}`)

    return { body: body, mouth: mouth, eyes: eyes }
  }

  private async mintNFD(parts: BodyParts) {
    const canvas = createCanvas(112, 112)
    const ctx = canvas.getContext('2d')

    console.log('Loading images...')

    await loadImage(path.join(this.FRAGMENT_PATH, parts.body)).then((image) => {
      ctx.drawImage(image, 0, 0)
    })
    await loadImage(path.join(this.FRAGMENT_PATH, parts.mouth)).then((image) => {
      ctx.drawImage(image, 0, 0)
    })
    await loadImage(path.join(this.FRAGMENT_PATH, parts.eyes)).then((image) => {
      ctx.drawImage(image, 0, 0)
    })

    return canvas
  }

  private makeName(parts: BodyParts) {
    const bodyStr = parts.body.replace('_b.png', '')
    const mouthStr = parts.mouth.replace('_m.png', '')
    const eyesStr = parts.eyes.replace('_e.png', '')

    const bodyEnd = Math.min(3, bodyStr.length)
    const mouthStart = Math.min(3, mouthStr.length - 3)
    const eyesStart = Math.min(6, eyesStr.length - 3)

    return (
      bodyStr.slice(0, bodyEnd) + mouthStr.slice(mouthStart, mouthStart + 3) + eyesStr.slice(eyesStart, eyesStart + 3)
    )
  }

  private async canvasToFileAndReply(canvas: Canvas, fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const out = fs.createWriteStream(fileName)
      const stream = canvas.createPNGStream()

      function cleanup(err: Error) {
        // In case we fail reject the promise
        reject(err)
        out.end()
      }

      stream.pipe(out)
      out
        .on('finish', () => {
          resolve(fileName)
        })
        .on('error', cleanup)
    })
  }

  private makeReply(filePath: string, interaction: CommandInteraction) {
    const owner = getCallerFromCommand(interaction)
    const nfdName = path.basename(filePath).replace('.png', '')

    const time = new Date()

    if (!owner) {
      return interaction.reply({ content: 'Username undefined' + filePath, ephemeral: true })
    } else {
      const imageAttachment = new MessageAttachment(filePath)
      const embed = new MessageEmbed()
        .setColor(0xffbf00)
        .setAuthor({ name: owner.nickname ?? owner.user.username, iconURL: owner.user.avatarURL() ?? undefined })
        .setTitle(nfdName)
        .setImage(`attachment://${nfdName}.png`)
        .setFooter({ text: `Minted on ${time.toLocaleDateString()}` })

      return interaction.reply({
        embeds: [embed],
        files: [imageAttachment],
      })
    }
  }
}
