import { createCanvas, loadImage } from 'canvas'
import { getRandomElement } from '../../commands/RPG/util'
import * as fs from 'fs'
import * as path from 'path'
import { CommandInteraction, MessageAttachment } from 'discord.js'
import { Discord, SlashOption, Slash, SlashGroup } from 'discordx'

type BodyParts = {
  body: string
  mouth: string
  eyes: string
}

@SlashGroup({ name: 'nfd', description: 'Take part in the non-fungible dino economy' })
@SlashGroup('nfd')
@Discord()
class NFD {
  private FREE_MINT_COOLDOWN = 60

  private FRAGMENT_PATH = path.join(__dirname, 'fragments')
  private OUTPUT_PATH = path.join(__dirname, 'images')

  private currentInteraction?: CommandInteraction = undefined

  @Slash('mint', { description: 'Mint a new NFD' })
  async mint(interaction: CommandInteraction) {
    if (this.currentInteraction) {
      interaction.reply({ content: 'Im already busy minting something. Please try again later', ephemeral: true })
      return
    }
    this.currentInteraction = interaction
    const parts = this.getParts()
    await this.mintNFD(parts).then(() => {
      // this.currentInteraction = undefined
      console.log("foo")
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

    const outputName = this.makeName(parts)
    const outputFilePath = path.join(this.OUTPUT_PATH, outputName + '.png')

    const out = fs.createWriteStream(outputFilePath)
    const stream = canvas.createPNGStream()
    stream.pipe(out)
    out.on('finish', () => {
      this.currentInteraction
        ? this.currentInteraction.reply({
            embeds: [this.buildReply(outputName, outputFilePath, 'No one')],
            files: [new MessageAttachment(outputFilePath)],
          })
        : console.log('The PNG was created but no interaction exists.')
    })
  }

  private buildReply(outputName: string, outputFile: string, outputOwnerName: string) {
    console.log('OUT FILE: ', outputFile)
    const embed = {
      color: 0xffbf00,
      title: outputName,
      image: {
        url: 'attachment://' + path.basename(outputFile),
      },
      timestamp: new Date(),
      fields: [
        {
          name: 'Owner',
          value: outputOwnerName,
        },
      ],
    }
    return embed
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
}
