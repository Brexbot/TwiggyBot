import { cyrb53, getRandomElement, roll_dy_x_TimesPick_z, shuffleArray } from '../commands/RPG/util'
import fs from 'fs'
import * as path from 'path'
import {
  ApplicationCommandOptionChoiceData,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  AutocompleteInteraction,
  CommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  Snowflake,
  User,
} from 'discord.js'
import { Discord, Guard, Slash, SlashChoice, SlashGroup, SlashOption } from 'discordx'
import { getCallerFromCommand, getNicknameFromUser, isTwitchSub } from '../utils/CommandUtils'
import { injectable } from 'tsyringe'
import { ORM } from '../persistence'
import { NFDItem } from '../../prisma/generated/prisma-client-js'
import { IsSuperUser } from '../guards/RoleChecks'
import sharp from 'sharp'

type BodyParts = {
  body: string
  mouth: string
  eyes: string
  code: string
  name?: string
  fileName?: string
}

@Discord()
@SlashGroup({ name: 'dino', description: 'Birth, collect, and trade adorable dinos.' })
// @SlashGroup({
//   name: 'mod',
//   description: 'Moderator only commands',
//   root: 'nfd',
// })
@injectable()
class NFD {
  private MINT_COOLDOWN = 1000 * 60 * 60 * 23
  private GIFT_COOLDOWN = 1000 * 60 * 60
  private RENAME_COOLDOWN = 1000 * 60 * 60
  private SLURP_COOLDOWN = 1000 * 60 * 60

  private MAXIMUM_MINT_ATTEMPTS = 10

  private MIN_NFD_NAME_LENGTH = 6
  private MAX_NFD_NAME_LENGTH = 25

  private MAX_NFD_PRICE_EXPONENT = 30

  private FRAGMENT_PATH = path.join(__dirname, '../../src/assets/NFD/fragments')
  private OUTPUT_PATH = path.join(__dirname, '../../src/assets/NFD/images')

  private MAX_NFD_LISTED = 10

  private NFD_COLOR = 0xffbf00

  public constructor(private client: ORM) {
    // Check for the existence of the required directories
    if (!fs.existsSync(this.FRAGMENT_PATH)) {
      console.error(this.FRAGMENT_PATH + ' was missing, dino hatching will not work!')
    }

    if (!fs.existsSync(this.OUTPUT_PATH)) {
      fs.mkdirSync(this.OUTPUT_PATH)
      console.log(this.OUTPUT_PATH + ' did not exist so I created it.')
    }
  }

  @Slash('hatch', { description: 'Attempt to hatch a new dino. Being a subscriber makes hatching more likely.' })
  @SlashGroup('dino')
  async mint(interaction: CommandInteraction) {
    const ownerMember = getCallerFromCommand(interaction)
    if (!ownerMember) {
      return interaction.reply({ content: 'User undefined X(', ephemeral: true })
    }
    const guild = interaction.guild
    if (!guild) {
      return interaction.reply({ content: 'Guild is null X(', ephemeral: true })
    }

    // Check for the cooldowns
    const ownerRecordPrev = await this.getUserFromDB(ownerMember.id)
    if (ownerRecordPrev.lastMint.getTime() + this.MINT_COOLDOWN > Date.now()) {
      return interaction.reply({
        content: `Don't be greedy! You can hatch again <t:${Math.round(
          (ownerRecordPrev.lastMint.getTime() + this.MINT_COOLDOWN) / 1000
        )}:R>.`,
        ephemeral: true,
      })
    }

    const parts = await this.makeNFDcode()

    // Check to see if we failed to make a unique one
    if (!parts) {
      return interaction.reply({
        content: "I tried really hard but I wasn't able to make a unique dino for you. Sorry... :'(",
        ephemeral: true,
      })
    }

    // If we got this far then we are all set to hatch.
    // Roll the hatch check
    let res = roll_dy_x_TimesPick_z(4, 1, 1)

    // Twitch subs get a re-roll
    if (isTwitchSub(ownerMember, guild)) {
      res = Math.max(res, roll_dy_x_TimesPick_z(4, 1, 1))
    }

    if (res <= 3 - ownerRecordPrev.consecutiveFails) {
      this.updateDBfailedMint(ownerMember.id)
      const nextMint = Math.round((Date.now() + this.MINT_COOLDOWN) / 1000)
      const numbers = ['1st', '2nd', '3rd', '4th'] // Should never get to 4th
      return interaction.reply({
        content: `You failed to hatch the egg (${
          numbers[ownerRecordPrev.consecutiveFails]
        } attempt), better luck next time. You can try again <t:${nextMint}:R>`,
      })
    }

    // mint was successful!
    this.composeNFD(parts)
      .then(() => this.storeNFDinDatabase(parts, getCallerFromCommand(interaction)))
      .then((nfd) => this.makeReply(nfd, interaction, ownerMember))
      .then(() => this.updateDBSuccessfulMint(ownerMember.id))
      .catch((err) => {
        interaction
          .reply({ content: 'An asteroid came and broke everything... what a surprise', ephemeral: true })
          .catch((err) => {
            console.error('Something really went wrong hatching this dino...', err)
          })
      })
  }

  @Slash('view', { description: 'View an existing dino.' })
  @SlashGroup('dino')
  async view(
    @SlashOption('name', {
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.allNFDAutoComplete(interaction).then((choices) => interaction.respond(choices))
      },
    })
    name: string,
    @SlashOption('silent', { type: ApplicationCommandOptionType.Boolean, required: false })
    silent = true,
    interaction: CommandInteraction
  ) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'The ecosystem is broken. The guild is missing :(', ephemeral: true })
    }

    const nfd = await this.getNFDByName(name)
    if (!nfd) {
      return interaction.reply({ content: "I couldn't find a dino with that name.", ephemeral: true })
    }

    const owner = interaction.guild.members.cache.get(nfd.owner)

    return this.makeReply(nfd, interaction, owner, silent)
  }

  @Slash('collection', { description: "View a fellow dino enjoyer's collection." })
  @SlashGroup('dino')
  async colleciton(
    @SlashOption('owner', {
      type: ApplicationCommandOptionType.User,
      required: false,
      description: "The person who's collection you want to see.",
    })
    owner: GuildMember,
    @SlashOption('silent', { type: ApplicationCommandOptionType.Boolean, required: false })
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
          content: 'The calling user is missing, and no alternative owner was provided. No one to look for.',
          ephemeral: true,
        })
      }
      owner = caller
    }

    // Get (or create) the owner of the collection from the database
    const ownerRecord = await this.client.nFDEnjoyer.upsert({
      where: {
        id: owner.id,
      },
      create: {
        id: owner.id,
      },
      update: {},
    })

    let collection = await this.client.nFDItem.findMany({
      where: { owner: owner.id },
    })

    const ownerName = getNicknameFromUser(owner, interaction.guild)

    if (collection.length == 0) {
      return interaction.reply({
        content: `**${ownerName}** doesn't own any dinos. 🥚🙌`,
        ephemeral: silent,
      })
    }

    collection = shuffleArray(collection)

    // We want the user's favourite NFD to take pride of place in the collection
    // so try to find it and remove it from the masses.

    let favourite: NFDItem | undefined

    if (ownerRecord.favourite) {
      // Pick the user's favourite out of their collection.
      // Remains undefined if missing
      for (let i = 0; i < collection.length; i++) {
        if (collection[i].name == ownerRecord.favourite) {
          favourite = collection[i]
        }
      }
      // Remove the favourite from the collection.
      collection.filter((x) => {
        x.name == ownerRecord.favourite
      })
    }

    let totalValue = 0
    for (let i = 0; i < collection.length; i++) {
      totalValue += this.getNFDPrice(collection[i])
    }

    // Truncate the output length to stop spam.
    let toShow: NFDItem[]
    let remainder: number

    if (collection.length > this.MAX_NFD_LISTED) {
      toShow = collection.slice(0, this.MAX_NFD_LISTED)
      remainder = collection.length - this.MAX_NFD_LISTED
    } else {
      toShow = collection
      remainder = 0
    }

    let ostr = toShow.map((x) => x.name).join(', ')

    if (remainder > 1) {
      ostr += ` and ${remainder} others.`
    } else {
      ostr += '.'
    }

    // The picture in the embed should either be the favourite or the first in the list
    const imageNFD = favourite ?? toShow[0]

    this.ensureImageExists(imageNFD.filename, imageNFD.name, imageNFD.code)
      .then((validatedFilePath) => {
        if (!validatedFilePath) {
          return interaction.reply({ content: 'Something went wrong fetching the image', ephemeral: true })
        }
        const imageAttachment = new AttachmentBuilder(validatedFilePath)
        const embed = new EmbedBuilder()
          .setColor(this.NFD_COLOR)
          .setAuthor({
            name: ownerName,
            iconURL: owner.user.avatarURL() ?? undefined,
          })
          .setTitle(ownerName + "'s collection")
          .setImage(`attachment://${path.basename(validatedFilePath)}`)
          .setFooter({
            text: `${ownerName} owns ${collection.length} dinos worth ${totalValue.toFixed(
              2
            )} Dino Bucks in total. 🦖🙌`,
          })
          .setDescription(ostr)

        if (favourite) {
          embed.addFields({ name: 'Favourite:', value: favourite.name, inline: true })
        }

        return interaction.reply({
          embeds: [embed],
          files: [imageAttachment],
          ephemeral: silent,
        })
      })
      .catch((err) => {
        console.error('something went very wrong in making a collection', err)
      })
  }

  @Slash('gift', { description: 'Gift your dino to another chatter. How kind.' })
  @SlashGroup('dino')
  async gift(
    @SlashOption('name', {
      type: ApplicationCommandOptionType.String,
      description: 'The name of the dino to be gifted.',
      required: true,
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.userNFDAutoComplete(interaction.user.id, interaction).then((choices) => interaction.respond(choices))
      },
    })
    name: string,
    @SlashOption('recipient', {
      type: ApplicationCommandOptionType.User,
      description: 'The chatter to receive the dino.',
      required: true,
    })
    recipient: User | GuildMember,
    interaction: CommandInteraction
  ) {
    return this.performGift(name, recipient, false, interaction)
  }

  // Function that actually carries out the transaction
  private async performGift(
    nfd: string,
    recipient: User | GuildMember,
    sudo: boolean,
    interaction: CommandInteraction
  ) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'The Guild is missing. No idea why, but it is.',
        ephemeral: true,
      })
    }
    // Confirm the caller isn't on cooldown (sudo overrides)
    if (!sudo) {
      const caller = await this.client.nFDEnjoyer.findUnique({ where: { id: interaction.user.id } })
      if (!caller) {
        return interaction.reply({
          content: 'The dinos have run amok. The calling user is missing :(',
          ephemeral: true,
        })
      }

      if (caller.lastGiftGiven.getTime() + this.GIFT_COOLDOWN > Date.now()) {
        return interaction.reply({
          content: `You're gifting too often. You can gift again in <t:${Math.round(
            (caller.lastGiftGiven.getTime() + this.GIFT_COOLDOWN) / 1000
          )}:R>.`,
          ephemeral: true,
        })
      }
      // and confirm the caller isn't gifting to themselves (sudo overrides)
      if (recipient.id == interaction.user.id) {
        return interaction.reply({
          content: "It's cute that you tried, but you can't gift something to yourself.",
          ephemeral: true,
        })
      }
    }

    // Now confirm the NFD exists
    const nfd_item = await this.getNFDByName(nfd)
    if (!nfd_item) {
      return interaction.reply({ content: "I couldn't find a dino with that name.", ephemeral: true })
    }

    // Confirm that the caller owns the NFD (sudo overrides)
    if (nfd_item.owner != interaction.user.id && !sudo) {
      return interaction.reply({ content: "You can't gift something you don't own!", ephemeral: true })
    }

    // All checks have passed. Carry out the change of owner.
    const ownerList = nfd_item.previousOwners + `,<@${recipient.id}>`
    await this.client.nFDItem.update({
      where: {
        name: nfd_item.name,
      },
      data: {
        previousOwners: ownerList,
        owner: recipient.id,
      },
    })

    const callerName = getNicknameFromUser(interaction.user, interaction.guild)
    const receiverName = getNicknameFromUser(recipient, interaction.guild)
    if (sudo) {
      return interaction.reply({
        content: `**${callerName}** reassigned ${nfd_item.name} to **${receiverName}** using their mod powers.`,
      })
    } else {
      await this.updateDBSuccessfulGift(interaction.user.id)
      return interaction.reply({
        content: `**${callerName}** gifted ${nfd_item.name} to **${receiverName}**! How kind!`,
      })
    }
  }

  @Slash('rename', { description: 'Give your dino a better name' })
  @SlashGroup('dino')
  async rename(
    @SlashOption('name', {
      type: ApplicationCommandOptionType.String,
      required: true,
      description: 'The *existing* name for the dino.',
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.userNFDAutoComplete(interaction.user.id, interaction).then((choices) => interaction.respond(choices))
      },
    })
    name: string,
    @SlashOption('replacement', {
      type: ApplicationCommandOptionType.String,
      required: true,
      description: 'The *new* name for the dino.',
    })
    replacement: string,
    interaction: CommandInteraction
  ) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'The dinoverse is broken. The guild is missing :(', ephemeral: true })
    }

    // Sanity check the new name. Only alphanumeric characters allowed
    if (
      replacement.length < this.MIN_NFD_NAME_LENGTH ||
      replacement.length > this.MAX_NFD_NAME_LENGTH ||
      replacement.match(/[^a-zA-Z0-9]/g)
    ) {
      return interaction.reply({
        content: `That name is bad. Names must be ${this.MIN_NFD_NAME_LENGTH}-${this.MAX_NFD_NAME_LENGTH} alphanumeric characters.`,
        ephemeral: true,
      })
    }

    // Check the user's cooldowns.
    const user = await this.client.nFDEnjoyer.findUnique({ where: { id: interaction.user.id } })
    if (!user) {
      return interaction.reply({
        content: "It seems you don't exist in the database. Try minting something first!",
        ephemeral: true,
      })
    }
    if (user.lastRename.getTime() + this.RENAME_COOLDOWN > Date.now()) {
      return interaction.reply({
        content: `Please wait. You can rename again <t:${Math.round(
          (user.lastRename.getTime() + this.RENAME_COOLDOWN) / 1000
        )}:R>.`,
        ephemeral: true,
      })
    }

    // Confirm the NFD exists
    const nfd = await this.getNFDByName(name)
    if (!nfd) {
      return interaction.reply({ content: "I couldn't find a dino with that name.", ephemeral: true })
    }

    // Confirm that the caller owns the NFD
    if (nfd.owner != interaction.user.id) {
      return interaction.reply({ content: "You can't rename something you don't own!", ephemeral: true })
    }

    // Confirm that no NFD already exists with that name
    const existing = await this.client.nFDItem.findUnique({
      where: {
        name: replacement,
      },
    })
    if (existing) {
      return interaction.reply({ content: 'A dino already exists with that name.', ephemeral: true })
    }

    // All checks passed, update the record and announce it.
    await this.client.nFDItem.update({
      where: {
        name: name,
      },
      data: {
        name: replacement,
      },
    })

    // If this was the user's favourite NFD, update the record to the new name
    const favourite = user.favourite == nfd.name ? replacement : user.favourite
    await this.client.nFDEnjoyer.update({
      where: {
        id: user.id,
      },
      data: {
        lastRename: new Date(),
        favourite: favourite,
      },
    })

    const callerName = getNicknameFromUser(interaction.user, interaction.guild)

    return interaction.reply({ content: `**${callerName}** renamed **${name}** to **${replacement}**!` })
  }

  @Slash('favourite', { description: 'Set your favourite dino.' })
  @SlashGroup('dino')
  async favourite(
    @SlashOption('name', {
      type: ApplicationCommandOptionType.String,
      description: 'The name of your new favourite dino.',
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.userNFDAutoComplete(interaction.user.id, interaction).then((choices) => interaction.respond(choices))
      },
    })
    name: string,
    interaction: CommandInteraction
  ) {
    // Confirm the NFD exists
    const nfd = await this.getNFDByName(name)
    if (!nfd) {
      return interaction.reply({ content: "I couldn't find a dino with that name.", ephemeral: true })
    }

    // Confirm that the caller owns the NFD
    if (nfd.owner != interaction.user.id) {
      return interaction.reply({ content: "You can't favourite something you don't own!", ephemeral: true })
    }

    // upsert should never create, because a user that doesn't exist doesn't own anything.
    await this.client.nFDEnjoyer.upsert({
      where: {
        id: interaction.user.id,
      },
      create: {
        id: interaction.user.id,
        favourite: nfd.name,
      },
      update: {
        favourite: nfd.name,
      },
    })

    return interaction.reply({ content: nfd.name + ' has been set as your favourite dino!', ephemeral: true })
  }

  @Slash('breed', {
    description: "A lotta yall still don't get it. You can consume two dinos to create a new dino.",
  })
  @SlashGroup('dino')
  async slurp(
    @SlashOption('first', {
      type: ApplicationCommandOptionType.String,
      description: 'The first dino to be bred.',
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.userNFDAutoComplete(interaction.user.id, interaction).then((choices) => interaction.respond(choices))
      },
    })
    first: string,
    @SlashOption('second', {
      type: ApplicationCommandOptionType.String,
      description: 'The second dino to be bred.',
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.userNFDAutoComplete(interaction.user.id, interaction).then((choices) => interaction.respond(choices))
      },
    })
    second: string,
    interaction: CommandInteraction
  ) {
    const ownerMember = getCallerFromCommand(interaction)
    if (!ownerMember) {
      return interaction.reply({ content: 'User undefined X(', ephemeral: true })
    }

    // Check for cooldowns.
    const ownerRecord = await this.getUserFromDB(ownerMember.id)
    if (ownerRecord.lastSlurp.getTime() + this.SLURP_COOLDOWN > Date.now()) {
      return interaction.reply({
        content: `Don't be greedy! You can breed again <t:${Math.round(
          (ownerRecord.lastSlurp.getTime() + this.SLURP_COOLDOWN) / 1000
        )}:R>.`,
        ephemeral: true,
      })
    }

    if (first === second) {
      return interaction.reply({
        content: `While a dino *can* "breed" with itself, it doesn't make new dinos.`,
        ephemeral: true,
      })
    }

    // Loop over the two NFDs, confirming that they exist and that the caller owns them
    const nfdNames = [first, second]
    for (let i = 0; i < 2; i++) {
      const nfd = await this.getNFDByName(nfdNames[i])
      // Confirm the NFD exists
      if (!nfd) {
        return interaction.reply({ content: `I couldn't find a dino with the name "${nfdNames[i]}".`, ephemeral: true })
      }

      // Confirm that the caller owns the NFD
      if (nfd.owner != interaction.user.id) {
        return interaction.reply({
          content: `You don't own "${nfdNames[i]}"! You can't breed something you don't own!`,
          ephemeral: true,
        })
      }
    }

    // Both NFDs are verified now. First generate a new NFD before deleting anything.
    const parts = await this.makeNFDcode()

    // Check to see if we failed to make a unique one
    if (!parts) {
      return interaction.reply({
        content: "I tried really hard but I wasn't able to make a unique dino for you. Sorry... :'(",
        ephemeral: true,
      })
    }

    // We have the new NFD ready to go. Delete the old two.
    this.client.nFDItem
      .deleteMany({
        where: {
          name: {
            in: [first, second],
          },
        },
      })
      .then(() => this.composeNFD(parts))
      .then(() => this.storeNFDinDatabase(parts, getCallerFromCommand(interaction)))
      .then((nfd) => this.makeReply(nfd, interaction, ownerMember))
      .then(() => this.updateDBSuccessfulSlurp(ownerMember.id))
      .catch((err) => {
        interaction.reply({ content: 'The dinoverse broke... what a surprise', ephemeral: true }).catch((err) => {
          console.error('Something really went wrong hatching this dino...', err)
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

    return { body: body, mouth: mouth, eyes: eyes, code: code }
  }

  private async composeNFD(parts: BodyParts) {
    const out = sharp(path.join(this.FRAGMENT_PATH, parts.body)).composite([
      {
        input: path.join(this.FRAGMENT_PATH, parts.mouth),
        blend: 'over',
      },
      {
        input: path.join(this.FRAGMENT_PATH, parts.eyes),
        blend: 'over',
      },
    ])
    if (!parts.fileName) {
      parts.fileName = parts.name + '.png'
    }
    await out.toFile(path.join(this.OUTPUT_PATH, parts.fileName))
    return Promise.resolve(parts)
  }

  private async getNFDByCode(code: string) {
    return this.client.nFDItem.findUnique({
      where: {
        code: code,
      },
    })
  }

  private async getNFDByName(name: string) {
    return this.client.nFDItem.findUnique({
      where: {
        name: name,
      },
    })
  }

  private async storeNFDinDatabase(parts: BodyParts, owner: GuildMember | null) {
    if (!parts.name || !parts.fileName) {
      return Promise.reject('Name and filePath cannot be null')
    }
    if (!owner) {
      return Promise.reject('User cannot be null.')
    }

    const entry = await this.client.nFDItem.create({
      data: {
        name: parts.name,
        code: parts.code,
        filename: parts.fileName,
        owner: owner.id,
        mintDate: new Date(),
        previousOwners: `<@${owner.id}>`,
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
    return this.client.nFDEnjoyer.upsert({
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
    return this.client.nFDEnjoyer.upsert({
      where: {
        id: userId,
      },
      update: {
        mintCount: { increment: 1 },
        successfulMints: { increment: 1 },
        lastMint: new Date(),
        consecutiveFails: 0,
      },
      create: {
        id: userId,
        mintCount: 1,
        successfulMints: 1,
        lastMint: new Date(),
        consecutiveFails: 0,
      },
    })
  }

  private async updateDBfailedMint(userId: string) {
    return this.client.nFDEnjoyer.upsert({
      where: {
        id: userId,
      },
      update: {
        consecutiveFails: { increment: 1 },
        lastMint: new Date(),
      },
      create: {
        id: userId,
        consecutiveFails: 1,
        lastMint: new Date(),
      },
    })
  }

  private async updateDBSuccessfulGift(userId: string) {
    return this.client.nFDEnjoyer.upsert({
      where: {
        id: userId,
      },
      update: {
        lastGiftGiven: new Date(),
      },
      create: {
        id: userId,
        lastGiftGiven: new Date(),
      },
    })
  }

  private async updateDBSuccessfulSlurp(userId: string) {
    return this.client.nFDEnjoyer.upsert({
      where: {
        id: userId,
      },
      update: {
        lastSlurp: new Date(),
      },
      create: {
        id: userId,
        lastSlurp: new Date(),
      },
    })
  }

  private codeToParts(code: string): BodyParts {
    const parts = code.split(',')
    return { body: parts[0], mouth: parts[1], eyes: parts[2], code: code }
  }

  private getNFDPrice(nfd: NFDItem): number {
    // Stupid little function to make an NFD more "valuable" the more times it has been traded, with a bit of drift
    const exponent =
      Math.tanh((nfd.previousOwners.split(',').length - 1 + Math.random()) / this.MAX_NFD_PRICE_EXPONENT) *
      this.MAX_NFD_PRICE_EXPONENT
    return 2 ** exponent
  }

  private async ensureImageExists(fileName: string, name: string, code: string) {
    const fullPath = path.join(this.OUTPUT_PATH, fileName)
    // If the file exists, easy just return the name
    if (fs.existsSync(fullPath)) {
      return Promise.resolve(fullPath)
    }

    const parts = this.codeToParts(code)
    parts.fileName = fileName
    parts.name = name

    return this.composeNFD(parts)
      .then((parts) => {
        this.client.nFDItem.update({ where: { name: name }, data: { filename: parts.fileName } })
        return Promise.resolve(fullPath)
      })
      .catch(() => {
        return Promise.reject('The required image fragments are missing.')
      })
  }

  private makeReply(nfd: NFDItem, interaction: CommandInteraction, owner: GuildMember | undefined, ephemeral = false) {
    const nfdName = nfd.name

    const author = owner ? owner.nickname ?? owner.user.username : 'UNKNOWN'
    const avatar = owner ? owner.user.avatarURL() ?? undefined : undefined

    // Check for the existence of the image in the cache, if it doesn't exist, make it.

    this.ensureImageExists(nfd.filename, nfd.name, nfd.code)
      .then((validatedFilePath) => {
        if (!validatedFilePath) {
          return interaction.reply({ content: 'Something went wrong fetching the image', ephemeral: true })
        }
        const imageAttachment = new AttachmentBuilder(validatedFilePath)
        const embed = new EmbedBuilder()
          .setColor(this.NFD_COLOR)
          .setAuthor({ name: author, iconURL: avatar })
          .setTitle(nfdName)
          .setImage(`attachment://${path.basename(validatedFilePath)}`)
          .setFooter({
            text: `${nfd.name} is worth ${this.getNFDPrice(nfd).toFixed(2)} Dino Bucks!`,
          })
          .setDescription(`**Created:** <t:${Math.round(nfd.mintDate.getTime() / 1000)}>`)
        return interaction.reply({
          embeds: [embed],
          files: [imageAttachment],
          ephemeral: ephemeral,
        })
      })
      .catch((reason) => {
        const err = 'Something went wrong while building the dino: ' + reason
        console.log(err, 'filename: ', nfd.filename, 'nfd code:', nfd.code)
        return interaction.reply({
          content: err,
          ephemeral: true,
        })
      })
  }

  private async makeNFDcode() {
    // Loop through, repeatedly trying to make an NFD that doesn't already exist yet
    let i = 0
    let parts: BodyParts
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
        console.log('clashing dino is ' + isClash.code)
        continue
      }

      return parts
    } while (i++ < this.MAXIMUM_MINT_ATTEMPTS)
    return null
  }

  private async userNFDAutoComplete(userId: Snowflake, interaction: AutocompleteInteraction) {
    return this.client.nFDItem
      .findMany({
        where: {
          owner: userId,
          name: { startsWith: interaction.options.getFocused(true).value },
        },
        orderBy: [{ name: 'asc' }],
        take: 25,
      })
      .then((nfds) =>
        nfds.map<ApplicationCommandOptionChoiceData>((nfd) => {
          return { name: nfd.name, value: nfd.name }
        })
      )
  }

  private async allNFDAutoComplete(interaction: AutocompleteInteraction) {
    return this.client.nFDItem
      .findMany({
        where: {
          name: { startsWith: interaction.options.getFocused(true).value },
        },
        orderBy: [{ name: 'asc' }],
        take: 25,
      })
      .then((nfds) =>
        nfds.map<ApplicationCommandOptionChoiceData>((nfd) => {
          return { name: nfd.name, value: nfd.name }
        })
      )
  }

  // ==================
  // MODERATOR BASEMENT
  // ==================

  @Slash('purge', {
    description: 'Remove a dino from the database.',
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  })
  // @SlashGroup('mod', 'nfd')
  @Guard(IsSuperUser)
  async purge(
    @SlashOption('name', {
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.allNFDAutoComplete(interaction).then((choices) => interaction.respond(choices))
      },
    })
    name: string,
    interaction: CommandInteraction
  ) {
    const nfd = await this.getNFDByName(name)
    if (!nfd) {
      return interaction.reply({ content: "I couldn't find a dino with that name.", ephemeral: true })
    }

    await this.client.nFDItem.delete({
      where: {
        name: nfd.name,
      },
    })

    return interaction.reply({ content: `${nfd.name} has been deleted from the database.` })
  }

  @Slash('cooldown', {
    description: 'Reset hatch, gift, and/or rename cooldowns.',
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  })
  // @SlashGroup('mod', 'nfd')
  @Guard(IsSuperUser)
  async cooldown(
    @SlashOption('chatter', {
      type: ApplicationCommandOptionType.User,
      required: true,
      description: "The chatter who's cooldowns should be reset",
    })
    chatter: User | GuildMember,
    @SlashOption('cooldown', {
      type: ApplicationCommandOptionType.String,
      required: true,
      description: 'Which dino cooldown should be cooled down.',
    })
    @SlashChoice({ name: 'Hatch', value: 'HATCH' })
    @SlashChoice({ name: 'Rename', value: 'RENAME' })
    @SlashChoice({ name: 'Gift', value: 'GIFT' })
    @SlashChoice({ name: 'Breed', value: 'BREED' })
    @SlashChoice({ name: 'All', value: 'ALL' })
    cooldown: string,
    interaction: CommandInteraction
  ) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'The dinoverse is broken. The guild is missing :(', ephemeral: true })
    }

    switch (cooldown) {
      case 'HATCH':
        await this.client.nFDEnjoyer.upsert({
          where: {
            id: chatter.id,
          },
          create: {
            id: chatter.id,
          },
          update: {
            lastMint: new Date('0'),
          },
        })
        break
      case 'RENAME':
        await this.client.nFDEnjoyer.upsert({
          where: {
            id: chatter.id,
          },
          create: {
            id: chatter.id,
          },
          update: {
            lastRename: new Date('0'),
          },
        })
        break
      case 'GIFT':
        await this.client.nFDEnjoyer.upsert({
          where: {
            id: chatter.id,
          },
          create: {
            id: chatter.id,
          },
          update: {
            lastGiftGiven: new Date('0'),
          },
        })
        break
      case 'BREED':
        await this.client.nFDEnjoyer.upsert({
          where: {
            id: chatter.id,
          },
          create: {
            id: chatter.id,
          },
          update: {
            lastSlurp: new Date('0'),
          },
        })
        break
      case 'ALL':
        await this.client.nFDEnjoyer.upsert({
          where: {
            id: chatter.id,
          },
          create: {
            id: chatter.id,
          },
          update: {
            lastMint: new Date('0'),
            lastRename: new Date('0'),
            lastGiftGiven: new Date('0'),
            lastSlurp: new Date('0'),
          },
        })
        break
    }

    const callerName = getNicknameFromUser(interaction.user, interaction.guild)
    const targetName = getNicknameFromUser(chatter, interaction.guild)
    return interaction.reply({ content: `${interaction.user} reset ${cooldown} cooldown for ${chatter}.` })
  }

  @Slash('reassign', {
    description: "Forcibly change a dino's owner.",
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  })
  // @SlashGroup('mod', 'nfd')
  @Guard(IsSuperUser)
  async reassign(
    @SlashOption('nfd', {
      type: ApplicationCommandOptionType.String,
      description: 'The name of the dino to be gifted.',
      required: true,
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.allNFDAutoComplete(interaction).then((choices) => interaction.respond(choices))
      },
    })
    @SlashOption('recipient', {
      type: ApplicationCommandOptionType.User,
      description: 'The chatter to receive the dino.',
      required: true,
    })
    nfd: string,
    recipient: User | GuildMember,
    interaction: CommandInteraction
  ) {
    // Call gift with sudo enabled.
    return this.performGift(nfd, recipient, true, interaction)
  }
}
