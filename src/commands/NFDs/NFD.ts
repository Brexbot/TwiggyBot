import { createCanvas, loadImage } from 'canvas'
import { getRandomElement } from '../../commands/RPG/util'
import * as fs from 'fs'
import * as path from 'path'
import { CommandInteraction, GuildMember, Message, MessageAttachment } from 'discord.js'
import { Discord, SlashOption, Slash, SlashGroup } from 'discordx'
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
  private MINT_COOLDOWN = 60*60*24

  private FRAGMENT_PATH = path.join(__dirname, 'fragments')

  @Slash('mint', { description: 'Mint a new NFD' })
  async mint(interaction: CommandInteraction) {
    const parts = this.getParts()
    const pngStream = await this.mintNFD(parts)

    const outputName = this.makeName(parts)

    const attachmentImage = new MessageAttachment(pngStream)

    console.log(attachmentImage.attachment)

    const owner = getCallerFromCommand(interaction)
    if (owner) {
      interaction.reply({
        embeds: [this.buildReply(outputName, owner.nickname ?? owner?.user.username, attachmentImage.url)],
        files: [attachmentImage],
      })
    } else {
      interaction.reply({ content: 'Username undefined', ephemeral: true })
    }
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

    const stream = canvas.createPNGStream()
    return stream
  }

  private buildReply(outputName: string, ownder: GuildMember, imageURL: string) {
    const embed = {
      color: 0xffbf00,
      title: outputName,
      image: {
        url: imageURL,
      },
      timestamp: new Date(),
      fields: [
        {
          name: 'Owner',
          value: ownder,
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
