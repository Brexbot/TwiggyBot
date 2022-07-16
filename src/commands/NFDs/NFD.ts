import { Canvas, createCanvas, loadImage } from 'canvas'
import { cyrb53, getRandomElement, roll_dy_x_TimesPick_z, shuffleArray } from '../../commands/RPG/util'
import * as fs from 'fs'
import * as path from 'path'
import { Collection, CommandInteraction, GuildMember, MessageAttachment, MessageEmbed, User } from 'discord.js'
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx'
import { getCallerFromCommand } from '../../utils/CommandUtils'
import { injectable } from 'tsyringe'
import { ORM } from '../../persistence'
import { NFDItem } from '../../../prisma/generated/prisma-client-js'

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
  // private MINT_COOLDOWN = 1000 * 60 * 60 * 23
  private MINT_COOLDOWN = 1000

  private MAXIMUM_MINT_ATTEMPTS = 10

  private FRAGMENT_PATH = path.join(__dirname, 'fragments')
  private OUTPUT_PATH = path.join(__dirname, 'images')

  private MAX_NFD_LISTED = 10

  private NFD_COLOR = 0xffbf00

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

    // If we got this far then we are all set to mint.
    const ownerRecordPrev = await this.getUserFromDB(ownerMember.id)
    console.log('Has minted: ', ownerRecordPrev.mintCount, 'times')

    // Check for the cooldowns
    if (ownerRecordPrev.lastMint.getTime() + this.MINT_COOLDOWN > Date.now()) {
      return interaction.reply({
        content: `Don't be greedy! You can mint again <t:${Math.round(
          (ownerRecordPrev.lastMint.getTime() + this.MINT_COOLDOWN) / 1000
        )}:R>.`,
        ephemeral: true,
      })
    }

    // Roll the mint check
    const res = roll_dy_x_TimesPick_z(4, 1, 1)
    if (res <= 3 - ownerRecordPrev.consecutiveFails) {
      this.updateDBfailedMint(ownerMember.id)
      const nextMint = Math.round((Date.now() + this.MINT_COOLDOWN) / 1000)
      const numbers = ['1st', '2nd', '3rd', '4th'] // Should never get to 4th
      return interaction.reply({
        content: `You failed to mint for the ${
          numbers[ownerRecordPrev.consecutiveFails]
        } time, better luck next time. You can try again <t:${nextMint}:R>`,
      })
    }

    // mint was successful!
    this.composeNFD(parts)
      .then((canvas) => {
        return this.saveNFD(canvas, (parts.filePath = path.join(this.OUTPUT_PATH, parts.name + '.png')))
      })
      .then(() => {
        return this.storeNFDinDatabase(parts, getCallerFromCommand(interaction))
      })
      .then((nfd) => {
        this.makeReply(nfd, interaction, ownerMember)
      })
      .then(() => {
        this.updateDBSuccessfulMint(ownerMember.id)
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
    if (!nfd) {
      interaction.reply({ content: "I couldn't find an NFD with that name.", ephemeral: true })
      return
    }
    if (!interaction.guild) {
      interaction.reply({ content: 'The dinochain is broken. The guild is missing :(', ephemeral: true })
      return
    }
    const owner = interaction.guild.members.cache.get(nfd.owner)

    if (!owner) {
      // Maybe give the NDF to the viewing member in this case?
      return interaction.reply({ content: 'It seems like the owner is no where to be found...', ephemeral: true })
    }

    await this.makeReply(nfd, interaction, owner, silent)
  }

  @Slash('collection', { description: "view a fellow NFD enjoyer's collection" })
  async colleciton(
    @SlashOption('owner', {
      type: 'STRING',
      required: false,
      description: "The person who's collection you want to see",
    })
    @SlashOption('silent', { type: 'BOOLEAN', required: false })
    owner: string,
    silent = true,
    interaction: CommandInteraction
  ) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'Guild is missing from interaction.', ephemeral: true })
    }

    const caller = getCallerFromCommand(interaction)
    if (!owner) {
      if (!caller) {
        return interaction.reply({
          content: 'The calling user is missing, and not alternative owner was provided. No one to look for.',
          ephemeral: true,
        })
      }
      owner = caller.id
    }

    const ownerMember = interaction.guild.members.cache.get(owner)
    if (!ownerMember) {
      return interaction.reply({ content: 'Member ' + owner + " couldn't be found in the guild", ephemeral: true })
    }
    const ownerName = ownerMember.nickname ?? ownerMember.user.username

    let collection = await this.client.nFDItem.findMany({
      where: { owner: owner },
    })

    if (collection.length == 0) {
      return interaction.reply({
        content: ownerName + " doesn't own any NFDs. 🧻🙌",
        ephemeral: silent,
      })
    }

    collection = shuffleArray(collection)

    let toShow: NFDItem[]
    let remainder: number

    if (collection.length > this.MAXIMUM_MINT_ATTEMPTS) {
      toShow = collection.slice(0, this.MAXIMUM_MINT_ATTEMPTS)
      remainder = collection.length - this.MAXIMUM_MINT_ATTEMPTS
    } else {
      toShow = collection
      remainder = 0
    }

    // let ostr = ownerName + ' owns: ' + collection.map((x) => x.name).join(', ')
    const fieldTitle = ownerName + ' owns: '
    let ostr = toShow.map((x) => x.name).join(', ')

    if (remainder > 1) {
      ostr += ` and ${remainder} others.`
    } else {
      ostr += '.'
    }

    this.ensureImageExists(toShow[0].filename, toShow[0].name, toShow[0].code).then((fileName) => {
      console.log(fileName)
      const imageAttachment = new MessageAttachment(fileName)
      const embed = new MessageEmbed()
        .setColor(this.NFD_COLOR)
        .setAuthor({
          name: ownerMember.nickname ?? ownerMember.user.username,
          iconURL: ownerMember.user.avatarURL() ?? undefined,
        })
        .setTitle(ownerName + "'s collection")
        .setImage(`attachment://${path.basename(fileName)}`)
        .setFooter({ text: `${ownerName} owns ${collection.length} NFDs. 💎🙌` })
        // .setDescription(ostr)
        .addField(fieldTitle, ostr, true)

      return interaction.reply({
        embeds: [embed],
        files: [imageAttachment],
        ephemeral: silent,
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

    const code = `${body},${mouth},${eyes}`

    console.log(`There are ${bodyList.length * mouthList.length * eyesList.length} possible NFDs`)

    console.log(`picked: ${body}, ${mouth}, ${eyes}`)

    return { body: body, mouth: mouth, eyes: eyes, code: code }
  }

  private async composeNFD(parts: BodyParts) {
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

    const entry = await this.client.nFDItem.create({
      data: {
        name: parts.name,
        code: parts.code,
        filename: parts.filePath,
        owner: owner.id,
        mintDate: new Date(),
      },
    })
    return Promise.resolve(entry)
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

  private async getUserFromDB(userId: string) {
    return await this.client.nFDEnjoyer.upsert({
      where: {
        id: userId,
      },
      create: {
        id: userId,
      },
      update: {},
    })
  }

  private async updateDBSuccessfulMint(userId: string) {
    return await this.client.nFDEnjoyer.update({
      where: {
        id: userId,
      },
      data: {
        mintCount: { increment: 1 },
        successfulMints: { increment: 1 },
        lastMint: new Date(),
        consecutiveFails: 0,
      },
    })
  }

  private async updateDBfailedMint(userId: string) {
    return await this.client.nFDEnjoyer.update({
      where: {
        id: userId,
      },
      data: {
        consecutiveFails: { increment: 1 },
        lastMint: new Date(),
      },
    })
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

  private codeToParts(code: string): BodyParts {
    const parts = code.split(',')
    return { body: parts[0], mouth: parts[1], eyes: parts[2], code: code }
  }

  private async ensureImageExists(filename: string, name: string, code: string) {
    // If the file exists, easy just return the name
    if (fs.existsSync(filename)) {
      return filename
    }

    const parts = this.codeToParts(code)

    return this.composeNFD(parts)
      .then((canvas) => this.saveNFD(canvas, (parts.filePath = path.join(this.OUTPUT_PATH, name + '.png'))))
      .catch(() => {
        return Promise.reject('The required image fragments are missing.')
      })
  }

  private makeReply(nfd: NFDItem, interaction: CommandInteraction, owner: GuildMember, ephemeral = false) {
    const nfdName = path.basename(nfd.filename).replace('.png', '')
    const time = new Date()

    if (!owner) {
      return interaction.reply({ content: 'Username undefined' + nfd.filename, ephemeral: true })
    } else {
      // Check for the existence of the image in the cache, if it doesn't exist, make it.

      this.ensureImageExists(nfd.filename, nfd.name, nfd.code)
        .then(() => {
          const imageAttachment = new MessageAttachment(nfd.filename)
          const embed = new MessageEmbed()
            .setColor(this.NFD_COLOR)
            .setAuthor({ name: owner.nickname ?? owner.user.username, iconURL: owner.user.avatarURL() ?? undefined })
            .setTitle(nfdName)
            .setImage(`attachment://${nfdName}.png`)
            // .setFooter({ text: `Minted on ${nfd.mintDate.toLocaleDateString()} at ${nfd.mintDate.toLocaleTimeString()}` })
            // Showing minting time as a field is better as it allows local timezone conversion,
            // even if the filed name thing looks ugly
            .setDescription(`**Minted:** <t:${Math.round(nfd.mintDate.getTime() / 1000)}>`)
          return interaction.reply({
            embeds: [embed],
            files: [imageAttachment],
            ephemeral: ephemeral,
          })
        })
        .catch((reason) => {
          const err = 'Something went wrong while building the NFD: ' + reason
          console.log(err, 'filename: ', nfd.filename, 'nfd code:', nfd.code)
          return interaction.reply({
            content: err,
            ephemeral: true,
          })
        })
    }
  }
}
