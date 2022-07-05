import { Canvas, createCanvas, loadImage } from 'canvas'
import { cyrb53, getRandomElement } from '../../commands/RPG/util'
import * as fs from 'fs'
import * as path from 'path'
import { CommandInteraction, GuildMember, MessageAttachment, MessageEmbed, User } from 'discord.js'
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx'
import { getCallerFromCommand } from '../../utils/CommandUtils'
import { injectable } from 'tsyringe'
import { ORM } from '../../persistence'

type BodyParts = {
  body: string
  mouth: string
  eyes: string
  code: string
  name?: string
  filePath?: string
}

@Discord()
@SlashGroup({ name: 'nfd', description: 'Take part in the non-fungible dino economy' })
@SlashGroup('nfd')
@injectable()
class NFD {
  private MINT_COOLDOWN = 60 * 60 * 24

  private MAXIMUM_MINT_ATTEMPTS = 10

  private FRAGMENT_PATH = path.join(__dirname, 'fragments')
  private OUTPUT_PATH = path.join(__dirname, 'images')

  public constructor(private client: ORM) {}

  @Slash('mint', { description: 'Mint a new NFD' })
  async mint(interaction: CommandInteraction) {
    let i = 0
    let parts: BodyParts

    const ownerMember = getCallerFromCommand(interaction)
    if (!ownerMember) {
      return interaction.reply({ content: 'User undefined X(', ephemeral: true })
    }

    do {
      parts = this.getParts()

      const isDuplicate = await this.getNFDByCode(parts.code)
      if (isDuplicate) {
        console.log(parts.code + 'already exists in the database')
        continue
      }

      parts.name = this.makeName(parts)
      const isClash = await this.getNFDByName(parts.name)
      if (isClash) {
        console.log(parts.code + ' is unique but the name ' + parts.name + ' exists. Clash in naming detected!')
        console.log('clashing NFD is ' + isClash.code)
        continue
      }

      break
    } while (i++ < this.MAXIMUM_MINT_ATTEMPTS)

    // Check to see if we failed to make a unique one
    if (i >= this.MAXIMUM_MINT_ATTEMPTS) {
      interaction.reply({
        content: "I tried really hard but I wasn't able to make a unique NFD for you. Sorry... :'(",
        ephemeral: true,
      })
      return
    }

    this.mintNFD(parts)
      .then((canvas) => {
        return this.saveNFD(canvas, (parts.filePath = path.join(this.OUTPUT_PATH, parts.name + '.png')))
      })
      .then((nfd) => {
        this.storeNFDinDatabase(parts, getCallerFromCommand(interaction))
        return nfd
      })
      .then((nfd) => {
        this.makeReply(nfd, interaction, ownerMember)
      })
      .catch((err) => {
        interaction.reply({ content: 'The dinochain broke... what a surprise', ephemeral: true }).catch((err) => {
          console.error('Something really went wrong minting this NFD...', err)
        })
      })
  }

  @Slash('view', { description: 'View an existing NFD.' })
  async view(
    @SlashOption('name', { type: 'STRING', required: true })
    @SlashOption('silent', { type: 'STRING', required: false })
    name: string,
    silent = true,
    interaction: CommandInteraction
  ) {
    const nfd = await this.getNFDByName(name)
    console.log(nfd)
    if (!nfd) {
      interaction.reply({ content: "I couldn't find an NFD with that name.", ephemeral: true })
      return
    } else {
      console.log(nfd.name)
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

    const code = `${body},${mouth},${eyes}`

    console.log(`There are ${bodyList.length * mouthList.length * eyesList.length} possible NFDs`)

    console.log(`picked: ${body}, ${mouth}, ${eyes}`)

    return { body: body, mouth: mouth, eyes: eyes, code: code }
  }

  private async mintNFD(parts: BodyParts) {
    const canvas = createCanvas(112, 112)
    const ctx = canvas.getContext('2d')

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

  private async getNFDByCode(code: string) {
    return await this.client.nFDItem.findUnique({
      where: {
        code: code,
      },
    })
  }

  private async getNFDByName(name: string) {
    return await this.client.nFDItem.findUnique({
      where: {
        name: name,
      },
    })
  }

  private async storeNFDinDatabase(parts: BodyParts, owner: GuildMember | null) {
    if (!parts.name || !parts.filePath) {
      return Promise.reject('Name and filePath cannot be null')
    }
    if (!owner) {
      return Promise.reject('User cannot be null.')
    }

    console.log('Saving as ' + parts.name)
    console.log('Saving code ' + parts.code)

    this.client.nFDItem.create({
      data: {
        name: parts.name,
        code: parts.code,
        filename: parts.filePath,
        owner: owner.id,
      },
    })
    return Promise.resolve()
  }

  private makeName(parts: BodyParts) {
    const bodyStr = parts.body.replace('_b.png', '')
    const mouthStr = parts.mouth.replace('_m.png', '')
    const eyesStr = parts.eyes.replace('_e.png', '')

    const bodyEnd = Math.min(3, bodyStr.length)
    const mouthStart = Math.min(3, mouthStr.length - 3)
    const eyesStart = Math.min(6, eyesStr.length - 3)

    // The name needs to be unique so we'll add in two characters at the end determined by
    // hashing the 'code' for the NFD (which is guaranteed unique) into two characters
    // that get appended to the name. Fingers crossed this then drastically lowers the possibility
    // of collisions.
    // TODO: Brute check that there are no collisions.
    const salt = cyrb53(parts.code).toString()
    const chr1 = String.fromCharCode(97 + (+salt.slice(0, Math.floor(salt.length / 2)) % 24))
    const chr2 = String.fromCharCode(97 + (+salt.slice(Math.floor(salt.length / 2), salt.length) % 24))

    return (
      bodyStr.slice(0, bodyEnd) +
      mouthStr.slice(mouthStart, mouthStart + 3) +
      eyesStr.slice(eyesStart, eyesStart + 3) +
      chr1 +
      chr2
    )
  }

  private async saveNFD(canvas: Canvas, fileName: string): Promise<string> {
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
          // Promise resolves with the fileName
          resolve(fileName)
        })
        .on('error', cleanup)
    })
  }

  private makeReply(filePath: string, interaction: CommandInteraction, owner: GuildMember) {
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
