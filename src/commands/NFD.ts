import { cyrb53, getRandomElement, roll_dy_x_TimesPick_z, shuffleArray } from '../commands/RPG/util'
import fs from 'fs'
import * as path from 'path'
import {
  ActionRowBuilder,
  ApplicationCommandOptionChoiceData,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  Guild,
  GuildMember,
  Message,
  MessageActionRowComponentBuilder,
  PermissionFlagsBits,
  Snowflake,
  User,
  userMention,
} from 'discord.js'
import { Discord, Guard, Slash, SlashChoice, SlashGroup, SlashOption } from 'discordx'
import { getCallerFromCommand, getNicknameFromUser } from '../utils/CommandUtils.js'
import { injectable } from 'tsyringe'
import { ORM } from '../persistence/ORM.js'
import { NFDItem } from '../../prisma/generated/prisma-client-js/index.js'
import { IsSuperUser } from '../guards/RoleChecks.js'
import sharp from 'sharp'

type BodyParts = {
  body: string
  mouth: string
  eyes: string
  code: string
  name?: string
  fileName?: string
}

type DinoStats = {
  best: NFDItem[]
  cursed: NFDItem[]
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
  private MINT_COOLDOWN_METHOD: 'DAILY' | 'PERSONAL' = 'DAILY'
  private MINT_COOLDOWN = 1000 * 60 * 60 * 23
  private MILISECONDS_IN_DAY = 86400000
  private GIFT_COOLDOWN = 1000 * 60 * 60
  private SLURP_COOLDOWN = 1000 * 60 * 60

  private COVET_TIMEOUT = 1000 * 60 * 10

  private MAXIMUM_FAILED_HATCHES = 3
  private MAXIMUM_MINT_ATTEMPTS = 10

  private MAXIMUM_ORGY_ATTENDEES = 50

  private MIN_NFD_NAME_LENGTH = 6
  private MAX_NFD_NAME_LENGTH = 25

  private MAX_NFD_PRICE_EXPONENT = 30

  private FRAGMENT_PATH = path.join(__dirname, '../../src/assets/NFD/fragments')
  private OUTPUT_PATH = path.join(__dirname, '../../src/assets/NFD/images')

  private MAX_NFD_LISTED = 25
  private MAX_COLLAGE_ITEMS = 25
  private NFD_WIDTH = 112 // pixels
  private NFD_HEIGHT = 112
  private COLLAGE_COLLUMN_MARGIN = 2 // pixels
  private COLLAGE_ROW_MARGIN = 2

  private NFD_COLOR = 0xffbf00
  private ORGY_COLOR = 0xff66ff
  private HATCH_COLOR = 0x66ff99

  private COVET_BUTTON_ID = 'nfd-covet'
  private SHUN_BUTTON_ID = 'nfd-shun'
  private FAVORITE_BUTTON_ID = 'nfd-favorite'

  private dinoMessageCache: Record<string, number> = {}

  private DINO_HOTNESS_SCALING = 0.1

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

  @Slash({ name: 'hatch', description: 'Attempt to hatch a new dino.' })
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
    if (this.MINT_COOLDOWN_METHOD == 'DAILY') {
      // If we are on a global daily cooldown then round the times to the previous UTC day then compare
      const lastDay =
        ownerRecordPrev.lastMint.getTime() - (ownerRecordPrev.lastMint.getTime() % this.MILISECONDS_IN_DAY)
      const nowtime = Date.now()
      const thisDay = nowtime - (nowtime % this.MILISECONDS_IN_DAY)
      if (thisDay <= lastDay) {
        return interaction.reply({
          content: `Don't be greedy! You can hatch again <t:${Math.round(
            (lastDay + this.MILISECONDS_IN_DAY) / 1000
          )}:R>.`,
          ephemeral: true,
        })
      }
    } else {
      // Simple 23 hour cooldown just checks that the cooldown has elapsed from the last time the user ran it.
      if (ownerRecordPrev.lastMint.getTime() + this.MINT_COOLDOWN > Date.now()) {
        return interaction.reply({
          content: `Don't be greedy! You can hatch again <t:${Math.round(
            (ownerRecordPrev.lastMint.getTime() + this.MINT_COOLDOWN) / 1000
          )}:R>.`,
          ephemeral: true,
        })
      }
    }

    // If we got this far then we are all set to hatch.
    // Roll the hatch check
    const res = roll_dy_x_TimesPick_z(4, 1, 1)

    if (res <= this.MAXIMUM_FAILED_HATCHES - ownerRecordPrev.consecutiveFails && !this.isTodayChristmas()) {
      this.updateDBfailedMint(ownerMember.id)
      const nowtime = Date.now()
      const nextMint =
        this.MINT_COOLDOWN_METHOD == 'DAILY'
          ? (nowtime - (nowtime % this.MILISECONDS_IN_DAY) + this.MILISECONDS_IN_DAY) / 1000
          : (nowtime + this.MINT_COOLDOWN) / 1000

      const numbers = ['1st', '2nd', '3rd', '4th'] // Should never get to 4th
      return interaction.reply({
        content: `You failed to hatch the egg (${
          numbers[ownerRecordPrev.consecutiveFails]
        } attempt), better luck next time. You can try again <t:${Math.round(nextMint)}:R>`,
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

    // mint was successful!
    this.composeNFD(parts)
      .then(() => this.storeNFDinDatabase(parts, getCallerFromCommand(interaction)))
      .then((nfd) => this.makeReply(nfd, interaction, ownerMember, true))
      .then(() => this.updateDBSuccessfulMint(ownerMember.id))
      .catch((_) => {
        interaction
          .reply({ content: 'An asteroid came and broke everything... what a surprise', ephemeral: true })
          .catch((err) => {
            console.error('Something really went wrong hatching this dino...', err)
          })
      })
  }

  private isTodayChristmas(): boolean {
    const today = new Date()
    // Day is between 1 and 31 while month is between 0 and 11
    return today.getDate() == 25 && today.getMonth() == 11
  }

  @Slash({ name: 'view', description: 'View an existing dino.' })
  @SlashGroup('dino')
  async view(
    @SlashOption({
      name: 'name',
      type: ApplicationCommandOptionType.String,
      required: true,
      description: "The dino's name",
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.allNFDAutoComplete(interaction).then((choices) => interaction.respond(choices))
      },
    })
    name: string,
    @SlashOption({
      name: 'silent',
      description: 'Whether to show the message only for you',
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    })
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

    return this.makeReply(nfd, interaction, owner, false, silent)
  }

  @Slash({ name: 'collection', description: "View a fellow dino enjoyer's collection." })
  @SlashGroup('dino')
  async collection(
    @SlashOption({
      name: 'owner',
      type: ApplicationCommandOptionType.User,
      required: false,
      description: "The person who's collection you want to see.",
    })
    owner: GuildMember,
    @SlashOption({
      name: 'silent',
      description: 'Whether to show the message only for you',
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    })
    silent = true,
    @SlashOption({
      name: 'type',
      description: 'The type of collection you want to see',
      type: ApplicationCommandOptionType.String,
      required: false,
    })
    @SlashChoice({ name: 'Favorites', value: 'FAVORITES' })
    @SlashChoice({ name: 'Trash', value: 'TRASH' })
    @SlashChoice({ name: 'All', value: 'ALL' })
    type: 'ALL' | 'FAVORITES' | 'TRASH' = 'ALL',
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
    await this.client.nFDEnjoyer.upsert({
      where: {
        id: owner.id,
      },
      create: {
        id: owner.id,
      },
      update: {},
    })

    let collection = await this.client.nFDItem.findMany({
      where: {
        owner: owner.id,
        ...(type == 'FAVORITES'
          ? {
              enthusiasts: {
                some: {
                  enjoyerId: owner.id,
                },
              },
            }
          : {}),
        ...(type == 'TRASH'
          ? {
              enthusiasts: {
                none: {
                  enjoyerId: owner.id,
                },
              },
            }
          : {}),
      },
    })

    const ownerName = getNicknameFromUser(owner, interaction.guild)

    if (collection.length == 0) {
      let noDinoResponse: string

      switch (type) {
        case 'FAVORITES': {
          noDinoResponse = `All of **${ownerName}**'s dinos are trash. 🗑️`
          break
        }
        case 'TRASH': {
          noDinoResponse = `**${ownerName}** doesn't have any trash. All their dinos are perfect. 😌`
          break
        }
        default: {
          noDinoResponse = `**${ownerName}** doesn't own any dinos. 🥚🙌`
          break
        }
      }

      return interaction.reply({
        content: noDinoResponse,
        ephemeral: silent,
      })
    }

    collection = shuffleArray(collection)

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

    // Create collage. Returns a buffer but discord wants a name attached with it
    // So we create that from the interaction id.
    const collage = await this.makeCollage(collection)
    const fauxFileName = `${interaction.id}.png`

    let dinoType
    switch (type) {
      case 'FAVORITES':
        dinoType = 'favorite '
        break
      case 'TRASH':
        dinoType = 'trash '
        break
      default:
        dinoType = ''
    }

    const imageAttachment = new AttachmentBuilder(collage, { name: fauxFileName })
    const embed = new EmbedBuilder()
      .setColor(this.NFD_COLOR)
      .setAuthor({
        name: ownerName,
        iconURL: owner.user.avatarURL() ?? undefined,
      })
      .setTitle(ownerName + "'s collection")
      .setImage(`attachment://${fauxFileName}`)
      .setFooter({
        text: `${ownerName} owns ${collection.length} ${dinoType}dinos worth ${totalValue.toFixed(
          2
        )} Dino Bucks in total. 🦖🙌`,
      })
      .setDescription(ostr)

    return interaction.reply({
      embeds: [embed],
      files: [imageAttachment],
      ephemeral: silent,
    })
  }

  @Slash({ name: 'gift', description: 'Gift your dino to another chatter. How kind.' })
  @SlashGroup('dino')
  async gift(
    @SlashOption({
      name: 'name',
      type: ApplicationCommandOptionType.String,
      description: 'The name of the dino to be gifted.',
      required: true,
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.userNFDAutoComplete(interaction.user.id, interaction).then((choices) => interaction.respond(choices))
      },
    })
    name: string,
    @SlashOption({
      name: 'recipient',
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

  @Slash({ name: 'rename', description: 'Give your dino a better name' })
  @SlashGroup('dino')
  async rename(
    @SlashOption({
      name: 'name',
      type: ApplicationCommandOptionType.String,
      required: true,
      description: 'The *existing* name for the dino.',
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.userNFDAutoComplete(interaction.user.id, interaction).then((choices) => interaction.respond(choices))
      },
    })
    name: string,
    @SlashOption({
      name: 'replacement',
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

    const callerName = getNicknameFromUser(interaction.user, interaction.guild)

    return interaction.reply({ content: `**${callerName}** renamed **${name}** to **${replacement}**!` })
  }

  @Slash({ name: 'favorite', description: 'Toggle a dino as a favorite.' })
  @SlashGroup('dino')
  async favourite(
    @SlashOption({
      name: 'name',
      type: ApplicationCommandOptionType.String,
      description: 'The name of the dino.',
      required: true,
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.allNFDAutoComplete(interaction).then((choices) => interaction.respond(choices))
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

    const wasAdded = await this.toggleDinoFavorite(interaction.user, nfd)

    return interaction.reply({
      content: `**${nfd.name}** has been ${wasAdded ? 'added to' : 'removed from'} your favorite dinos!`,
      ephemeral: true,
    })
  }

  @Slash({
    name: 'breed',
    description: "A lotta yall still don't get it. You can consume two dinos to create a new dino.",
  })
  @SlashGroup('dino')
  async slurp(
    @SlashOption({
      name: 'first',
      type: ApplicationCommandOptionType.String,
      description: 'The first dino to be bred.',
      required: true,
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.userNFDAutoComplete(interaction.user.id, interaction).then((choices) => interaction.respond(choices))
      },
    })
    first: string,
    @SlashOption({
      name: 'second',
      type: ApplicationCommandOptionType.String,
      description: 'The second dino to be bred.',
      required: true,
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
    const breeders: NFDItem[] = []
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

      breeders.push(nfd)
    }

    const newNFD = await this.commenceBreeding_OwO(breeders[0], breeders[1], ownerMember)

    if (!newNFD) {
      return interaction.reply({
        content: "I tried really hard but I wasn't able to make a unique dino for you. Sorry... :'(",
        ephemeral: true,
      })
    }

    await this.makeReply(newNFD, interaction, ownerMember, true)
  }

  @Slash({ name: 'orgy', description: 'Throw a trashy dino orgy.' })
  @SlashGroup('dino')
  async orgy(
    @SlashOption({
      name: 'confirm',
      type: ApplicationCommandOptionType.Boolean,
      description: 'Please confirm you are ok with your non-favorite dinos being destroyed.',
      required: false,
    })
    confirm = false,
    interaction: CommandInteraction
  ) {
    // First performs basic setup and checks, then defers the reply if all is looking good as creating
    // 25 new NFDs can be slow.

    if (!confirm) {
      return interaction.reply({
        content:
          '⚠WARNING⚠\nThis command will breed ***all*** of your non-favorite marked dinos and they will be gone forever. Please check that you have set all the dinos you want to keep as favorites, then set the `confirm` option in the command to `True` and try again.',
        ephemeral: true,
      })
    }

    const owner = getCallerFromCommand(interaction)
    if (!owner) {
      return interaction.reply({ content: "User undefined. We can't throw an orgy without a host :(", ephemeral: true })
    }
    const guild = interaction.guild
    if (!guild) {
      return interaction.reply({
        content: "Guild undefined. We can't throw an orgy without a venue :(",
        ephemeral: true,
      })
    }
    const ownerName = getNicknameFromUser(owner, guild)

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

    // Check for cooldowns.
    if (ownerRecord.lastSlurp.getTime() + this.SLURP_COOLDOWN > Date.now()) {
      return interaction.reply({
        content: `We're still cleaning up after the last breeding session! You can go again <t:${Math.round(
          (ownerRecord.lastSlurp.getTime() + this.SLURP_COOLDOWN) / 1000
        )}:R>.`,
        ephemeral: true,
      })
    }

    let nonFavorites = await this.client.nFDItem.findMany({
      where: {
        owner: owner.id,
        enthusiasts: {
          none: {
            enjoyerId: owner.id,
          },
        },
      },
    })

    // Got to have an even number of dinos
    if (nonFavorites.length % 2 == 1) {
      nonFavorites.pop()
    }

    // Maximum of in an orgy so we can display the results
    if (nonFavorites.length > this.MAXIMUM_ORGY_ATTENDEES) {
      nonFavorites = nonFavorites.slice(0, this.MAXIMUM_ORGY_ATTENDEES)
    }

    if (nonFavorites.length < 4) {
      return interaction.reply({
        content:
          'You need at least 4 non-favorite dinos to throw an orgy. I know 4 is a bit of a lame orgy, but it is *technically* the minimum.',
        ephemeral: true,
      })
    }

    // This could be a slow, so we need the defer now
    await interaction.deferReply()

    const newNFDs: NFDItem[] = []
    for (let i = 0; i < nonFavorites.length; i += 2) {
      const newNFD = await this.commenceBreeding_OwO(nonFavorites[i], nonFavorites[i + 1], owner)

      if (!newNFD) {
        // Something went bad, but we can continue with the new NFDs we have
        return interaction.followUp({
          content: `Something went wrong between **${nonFavorites[i].name}** and **${
            nonFavorites[i + 1]
          }** during the orgy. I'm stopping it now but ${newNFDs.length} successful pairs were made.`,
        })
      } else {
        // Everything went well :)
        newNFDs.push(newNFD)
      }
    }

    // Create collage. Returns a buffer but discord wants a name attached with it
    // So we create that from the interaction id.
    const collage = await this.makeCollage(newNFDs)
    const fauxFileName = `${interaction.id}.png`

    const imageAttachment = new AttachmentBuilder(collage, { name: fauxFileName })
    const embed = new EmbedBuilder()
      .setColor(this.ORGY_COLOR)
      .setAuthor({
        name: ownerName,
        iconURL: owner.user.avatarURL() ?? undefined,
      })
      .setTitle(ownerName + "'s orgy babies")
      .setImage(`attachment://${fauxFileName}`)
      .setDescription(
        `${ownerName} threw an orgy with ${nonFavorites.length} dinos and birthed: ` +
          newNFDs.map((x) => x.name).join(', ') +
          '.'
      )

    return interaction.followUp({
      embeds: [embed],
      files: [imageAttachment],
    })
  }

  @Slash({ name: 'rate', description: 'Make your approval or disapproval of a dino known.' })
  @SlashGroup('dino')
  async covet(
    @SlashOption({
      name: 'name',
      type: ApplicationCommandOptionType.String,
      description: 'The lucky dino.',
      required: true,
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.allNFDAutoComplete(interaction).then((choices) => interaction.respond(choices))
      },
    })
    name: string,
    @SlashOption({
      name: 'action',
      type: ApplicationCommandOptionType.String,
      required: true,
      description: 'Covet or Shun the dino?',
    })
    @SlashChoice({ name: 'Covet', value: 'COVET' })
    @SlashChoice({ name: 'Shun', value: 'SHUN' })
    choice: string,
    interaction: CommandInteraction
  ) {
    const user = interaction.user
    if (!user) {
      console.log('ERROR: null user in rate command')
      return interaction.reply({ content: 'User is null in rate command. :(', ephemeral: true })
    }

    const guild = interaction.guild
    if (!guild) {
      console.log('ERROR: null guild in rate command')
      return interaction.reply({ content: 'Guild is null in rate command. :(', ephemeral: true })
    }

    const nfdItem = await this.client.nFDItem.findUnique({ where: { name: name } })
    if (!nfdItem) {
      const errMsg = `I couldn't find that dino, sorry! Maybe it got to breed?`
      return interaction.reply({ content: errMsg, ephemeral: true })
    }

    const result = await this.covetOrShunDino(choice == 'COVET' ? 'COVET' : 'SHUN', nfdItem, user, interaction)
    if (result) {
      return interaction.editReply({
        content:
          `Your ${choice == 'COVET' ? 'coveting' : 'shunning'} has been noted.` +
          ` **${name}** now stands at ${this.calculateHotnessScore(result).toFixed(3)}`,
      })
    } else {
      return
    }
  }

  @Slash({ name: 'vids', description: 'Which dino is best dino? Which is most cursed?' })
  @SlashGroup('dino')
  async vids(
    @SlashOption({
      name: 'silent',
      description: 'Whether to show the message only for you',
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    })
    silent = true,
    interaction: CommandInteraction
  ) {
    const guild = interaction.guild
    if (!guild) {
      console.log('ERROR: null guild in VID command')
      return interaction.reply({ content: 'Guild is null in VID command. :(', ephemeral: true })
    }

    const getDinoStats = async (): Promise<DinoStats> => {
      const best = await this.client.$queryRawUnsafe<NFDItem[]>(
        `SELECT * FROM NFDItem WHERE hotness=(SELECT MAX(hotness) FROM NFDItem)`
      )
      const cursed = await this.client.$queryRawUnsafe<NFDItem[]>(
        `SELECT * FROM NFDItem WHERE hotness=(SELECT MIN(hotness) FROM NFDItem)`
      )
      return { best: best, cursed: cursed }
    }

    const results = await getDinoStats()
    const bestDino = getRandomElement(results.best)
    const cursedDino = getRandomElement(results.cursed)

    const bestImageValidated = await this.ensureImageExists(bestDino.filename, bestDino.name, bestDino.code)
    if (!bestImageValidated) {
      return interaction.reply({ content: 'Something went wrong fetching the image', ephemeral: true })
    }
    const bestImageAttachment = new AttachmentBuilder(bestImageValidated)
    const bestEmbed = new EmbedBuilder()
      .setColor('#33cc33')
      .setTitle('Best Dino')
      .setDescription(`**${bestDino.name}**`)
      .setImage(`attachment://${path.basename(bestImageValidated)}`)
      .addFields({ name: 'Owner', value: userMention(bestDino.owner), inline: true })
      .setFooter({
        text: `Hotness Rating: ${this.calculateHotnessScore(bestDino.hotness).toFixed(3)}`,
      })

    const cursedImageValidated = await this.ensureImageExists(cursedDino.filename, cursedDino.name, cursedDino.code)
    if (!cursedImageValidated) {
      return interaction.reply({ content: 'Something went wrong fetching the image', ephemeral: true })
    }
    const cursedImageAttachment = new AttachmentBuilder(cursedImageValidated)
    // const cursedOwner = getNicknameFromUser(interaction.user, guild)
    const cursedEmbed = new EmbedBuilder()
      .setColor('#cc0000')
      .setTitle('Cursed Dino')
      .setDescription(`**${cursedDino.name}**`)
      .setImage(`attachment://${path.basename(cursedImageValidated)}`)
      .addFields({ name: 'Owner', value: userMention(cursedDino.owner), inline: true })
      .setFooter({
        text: `Hotness Rating: ${this.calculateHotnessScore(cursedDino.hotness).toFixed(3)}`,
      })
    return interaction.reply({
      embeds: [bestEmbed, cursedEmbed],
      ephemeral: silent,
      files: [bestImageAttachment, cursedImageAttachment],
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

  private async getNFDById(id: number) {
    return this.client.nFDItem.findUnique({
      where: {
        id: id,
      },
    })
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

  private storeNFDinDatabase(parts: BodyParts, owner: GuildMember | null) {
    if (!parts.name || !parts.fileName) {
      throw Error('Name and filePath cannot be null')
    }
    if (!owner) {
      throw Error('User cannot be null.')
    }

    return this.client.nFDItem.create({
      data: {
        name: parts.name,
        code: parts.code,
        filename: parts.fileName,
        owner: owner.id,
        mintDate: new Date(),
        previousOwners: `<@${owner.id}>`,
      },
    })
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

  private async updateDBDiscordUrl(nfd: NFDItem, url: string) {
    // Ephemeral attachments do eventually go *poof* :(
    if (url.includes('ephemeral-attachments')) {
      return nfd
    } else {
      return this.client.nFDItem.update({ where: { name: nfd.name }, data: { discordUrl: url } })
    }
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

  private updateDBSuccessfulSlurp(userId: string) {
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

  private async makeCollage(nfdList: NFDItem[]) {
    const workingList = nfdList.slice(0, Math.min(nfdList.length, this.MAX_COLLAGE_ITEMS))

    const columnCount = Math.ceil(Math.sqrt(workingList.length))
    const rowCount = Math.ceil(workingList.length / columnCount)

    const collageWidth = columnCount * this.NFD_WIDTH + (columnCount - 1) * this.COLLAGE_COLLUMN_MARGIN
    const collageHeight = rowCount * this.NFD_HEIGHT + (rowCount - 1) * this.COLLAGE_ROW_MARGIN

    const compositeList = await Promise.all(
      workingList.map(async (nfd, i) => {
        const x = (i % columnCount) * (this.COLLAGE_COLLUMN_MARGIN + this.NFD_WIDTH)
        const y = Math.floor(i / columnCount) * (this.COLLAGE_ROW_MARGIN + this.NFD_HEIGHT)

        const validatedFilePath = await this.ensureImageExists(nfd.filename, nfd.name, nfd.code)
        return { input: validatedFilePath, top: y, left: x }
      })
    )

    return sharp({
      create: {
        width: collageWidth,
        height: collageHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(compositeList)
      .toFormat('png')
      .toBuffer()
  }

  private async makeReply(
    nfd: NFDItem,
    interaction: CommandInteraction,
    owner: GuildMember | undefined,
    newNFD: boolean,
    ephemeral = false
  ) {
    const nfdName = nfd.name

    const author = owner ? (owner.nickname ?? owner.user.username) : 'UNKNOWN'
    const avatar = owner ? (owner.user.avatarURL() ?? undefined) : undefined

    // Check for the existence of the image in the cache, if it doesn't exist, make it.

    this.ensureImageExists(nfd.filename, nfd.name, nfd.code)
      .then(async (validatedFilePath) => {
        if (!validatedFilePath) {
          return interaction.reply({ content: 'Something went wrong fetching the image', ephemeral: true })
        }

        const covetButton = new ButtonBuilder()
          .setStyle(ButtonStyle.Success)
          .setCustomId(this.COVET_BUTTON_ID)
          .setLabel('Covet')
          .setEmoji('1025015012630212659')
        const shunButton = new ButtonBuilder()
          .setStyle(ButtonStyle.Danger)
          .setCustomId(this.SHUN_BUTTON_ID)
          .setLabel('Shun')
          .setEmoji('1025015013959807096')
        const favoriteButton = new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(this.FAVORITE_BUTTON_ID)
          .setLabel('Favorite')
          .setEmoji('🫶') // Heart-hand emoji

        const hotnessScore = this.getHotnessScoreForNFD(nfd)

        let imageAttachment: AttachmentBuilder | undefined = undefined
        let imageUrl = nfd.discordUrl
        if (!imageUrl) {
          imageAttachment = new AttachmentBuilder(validatedFilePath)
          imageUrl = `attachment://${path.basename(validatedFilePath)}`
        }

        const covetRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents([
          covetButton,
          shunButton,
          favoriteButton,
        ])

        const embed = new EmbedBuilder()
          .setColor(newNFD ? this.HATCH_COLOR : this.NFD_COLOR)
          .setAuthor({ name: author, iconURL: avatar })
          .setTitle(nfdName)
          .setImage(imageUrl)
          .setFooter({
            text:
              `${nfd.name} is worth ${this.getNFDPrice(nfd).toFixed(2)} Dino Bucks!` +
              `\nHotness Rating: ${hotnessScore.toFixed(3)}.`,
          })
          .setDescription(`**Created:** <t:${Math.round(nfd.mintDate.getTime() / 1000)}>`)

        const message = await interaction.reply({
          embeds: [embed],
          files: imageAttachment ? [imageAttachment] : [],
          ephemeral: ephemeral,
          components: [covetRow],
          fetchReply: true,
        })

        setTimeout(async () => {
          const reply = await interaction.fetchReply()
          const editedEmbed = EmbedBuilder.from(reply.embeds[0])
            // THIS IS NEEDED TO PREVENT THE DINO CONTAINMENT BREACH...
            .setImage(imageUrl)

          // Remove the covet/shun button row
          await interaction.editReply({ embeds: [editedEmbed], components: [] })
        }, this.COVET_TIMEOUT)

        if (!(message instanceof Message)) {
          // Something has gone very wrong.
          return interaction.followUp({
            content: "`message` isn't a `Message`. Foul play is afoot...",
          })
        }

        // We had to attach the dino so grab the cdn url and save it to the
        if (imageAttachment) {
          const previousEmbed = message.embeds[0]
          if (previousEmbed.image) {
            await this.updateDBDiscordUrl(nfd, previousEmbed.image.url)
          }
        }

        // Add it to the name cache
        this.dinoMessageCache[message.id] = nfd.id

        // Handle button Presses
        const collector = message.createMessageComponentCollector()
        collector.on('collect', async (collectionInteraction: ButtonInteraction) => {
          // await collectionInteraction.deferUpdate()
          const messageId = collectionInteraction.message.id
          const guild = collectionInteraction.guild

          if (!guild) {
            console.log(`ERROR: Guild is null in dino hatch response for message ${messageId}`)
            await collectionInteraction.reply({
              content: `Something went wrong and the guild was null for your dino hatch response.`,
              ephemeral: true,
            })
            return
          } else {
            // Check the messageId is in the cache
            if (!this.dinoMessageCache[messageId]) {
              console.log('ERROR: Message id missing from dino message cache')
              console.log(messageId, typeof messageId)
              console.log('Cache:', Object.keys(this.dinoMessageCache))
              await collectionInteraction.reply({
                content: `Sorry, I don't remember the details of the message you're responding to. Try viewing the dino or covet/shun it directly.`,
                ephemeral: true,
              })
              return
            }

            const dinoId = this.dinoMessageCache[messageId]

            const nfd = await this.getNFDById(dinoId)
            if (!nfd) {
              await collectionInteraction.reply({
                content: `Sorry, that dino has gone missing :'(`,
                ephemeral: true,
              })
              return
            }

            let covetShunDifference: null | number = null
            if (collectionInteraction.customId == this.COVET_BUTTON_ID) {
              covetShunDifference = await this.covetOrShunDino(
                'COVET',
                nfd,
                collectionInteraction.user,
                collectionInteraction
              )
            } else if (collectionInteraction.customId == this.SHUN_BUTTON_ID) {
              covetShunDifference = await this.covetOrShunDino(
                'SHUN',
                nfd,
                collectionInteraction.user,
                collectionInteraction
              )
            } else if (collectionInteraction.customId == this.FAVORITE_BUTTON_ID) {
              const wasAdded = await this.toggleDinoFavorite(collectionInteraction.user, nfd)
              if (wasAdded) {
                await collectionInteraction.reply({
                  content: `Added **${nfd.name}** to your list of favorites.`,
                  ephemeral: true,
                })
              } else {
                await collectionInteraction.reply({
                  content: `Removed **${nfd.name}** from your list of favorites.`,
                  ephemeral: true,
                })
              }
              return
            } else {
              console.log(
                `ERROR: Interaction id ${collectionInteraction.customId} is unknown for dino hatch message ${messageId}`
              )
              await collectionInteraction.reply({
                content: `Something went wrong and the type was unknown for your dino hatch response.`,
                ephemeral: true,
              })
              return
            }

            if (covetShunDifference !== null) {
              const newHotnessScore = this.calculateHotnessScore(covetShunDifference)

              const editedEmbed = EmbedBuilder.from(message.embeds[0])
                .setTitle(nfd.name)
                .setFooter({
                  text:
                    `${nfd.name} is worth ${this.getNFDPrice(nfd).toFixed(2)} Dino Bucks!` +
                    `\nHotness Rating: ${newHotnessScore.toFixed(3)}.`,
                })
                // THIS IS NEEDED TO PREVENT THE DINO CONTAINMENT BREACH...
                .setImage(imageUrl)

              // Clear out attachments if we had to generate one
              await interaction.editReply({ embeds: [editedEmbed] })
            }
          }
        })

        return message
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

  private async commenceBreeding_OwO(firstNFD: NFDItem, secondNFD: NFDItem, user: GuildMember) {
    // Both NFDs are verified now. First generate a new NFD before deleting anything.
    const parts = await this.makeNFDcode()

    // Check to see if we failed to make a unique one
    if (!parts) {
      return null
    }

    try {
      await this.composeNFD(parts)

      // We have the new NFD ready to go. Delete the old two.
      const deleteNfds = this.client.nFDItem.deleteMany({
        where: {
          id: {
            in: [firstNFD.id, secondNFD.id],
          },
        },
      })
      const createNfd = this.storeNFDinDatabase(parts, user)
      const successfulSlurp = this.updateDBSuccessfulSlurp(user.id)

      const [_delete, nfd, _enjoyer] = await this.client.$transaction([deleteNfds, createNfd, successfulSlurp])

      return nfd
    } catch (err) {
      console.error(`Something really went wrong breeding dinos ${firstNFD.id} X ${secondNFD.id} ...`, err)
      return null
    }
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

  private async covetOrShunDino(
    action: 'COVET' | 'SHUN',
    nfd: NFDItem,
    user: User,
    collectionInteraction: ButtonInteraction | CommandInteraction
  ): Promise<number | null> {
    if (collectionInteraction instanceof CommandInteraction) {
      await collectionInteraction.deferReply({ ephemeral: true })
    } else {
      await collectionInteraction.deferUpdate()
    }

    let newShunners: string[]
    if (nfd.shunners.length == 0) {
      newShunners = []
    } else {
      newShunners = nfd.shunners.split(',')
    }
    let newCoveters: string[]
    if (nfd.coveters.length == 0) {
      newCoveters = []
    } else {
      newCoveters = nfd.coveters.split(',')
    }

    if (action == 'COVET') {
      // First check if the user already covets the dino
      if (newCoveters.includes(user.id)) {
        const errMsg = `I understand you love **${nfd.name}** very much, but I'm not counting you twice.`
        if (collectionInteraction instanceof CommandInteraction) {
          await collectionInteraction.editReply({ content: errMsg })
        } else {
          await collectionInteraction.followUp({ content: errMsg, ephemeral: true })
        }
        return null
      } else {
        newCoveters.push(user.id)
        // Remove the user from the shun list if they are there.
        newShunners = newShunners.filter((id) => {
          return id != user.id
        })
      }
    } else {
      // First check if the user already shuns the dino
      if (newShunners.includes(user.id)) {
        const errMsg = `You hate **${nfd.name}**. We get it. Don't be a bully.`
        if (collectionInteraction instanceof CommandInteraction) {
          await collectionInteraction.editReply({ content: errMsg })
        } else {
          await collectionInteraction.followUp({ content: errMsg, ephemeral: true })
        }
        return null
      } else {
        newShunners.push(user.id)
        // Remove the user from the covet list if they are there.
        newCoveters = newCoveters.filter((id) => {
          return id != user.id
        })
      }
    }

    const difference = newCoveters.length - newShunners.length

    // commit the change
    await this.client.nFDItem.update({
      where: {
        name: nfd.name,
      },
      data: {
        coveters: newCoveters.join(','),
        shunners: newShunners.join(','),
        hotness: difference,
      },
    })

    return difference
  }

  private async toggleDinoFavorite(user: User, nfd: NFDItem) {
    const userEntry = await this.client.nFDEnjoyer.findUnique({
      where: { id: user.id },
      include: { favorites: true },
    })

    const enthusiastConnection = {
      dinoId: nfd.id,
      enjoyerId: user.id,
    }

    if (!userEntry) {
      // Create the enjoyer and add a new favorite
      await this.client.nFDEnjoyer.create({
        data: {
          id: user.id,
          favorites: {
            create: { dinoId: nfd.id },
          },
        },
      })
      return true
    }

    if (
      userEntry.favorites.find((dino) => {
        return dino.dinoId === nfd.id
      })
    ) {
      // Removes the favorite
      await this.client.nFDEnjoyer.update({
        where: { id: user.id },
        data: {
          favorites: {
            delete: {
              dinoId_enjoyerId: enthusiastConnection,
            },
          },
        },
      })

      return false
    } else {
      // creates the favorite
      await this.client.nFDEnjoyer.update({
        where: { id: user.id },
        data: {
          favorites: {
            create: { dinoId: nfd.id },
          },
        },
      })
      return true
    }
  }

  private calculateHotnessScore(covetShunDifference: number) {
    return Math.tanh(covetShunDifference * this.DINO_HOTNESS_SCALING)
  }

  private getHotnessScoreForNFD(nfd: NFDItem) {
    return this.calculateHotnessScore(nfd.hotness)
  }

  // ==================
  // MODERATOR BASEMENT
  // ==================

  @Slash({
    name: 'purge',
    description: 'Remove a dino from the database.',
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  })
  // @SlashGroup('mod', 'nfd')
  @Guard(IsSuperUser)
  async purge(
    @SlashOption({
      name: 'name',
      description: 'The name of the dino to delete',
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

  @Slash({
    name: 'cooldown',
    description: 'Reset hatch, gift, and/or breed cooldowns.',
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  })
  // @SlashGroup('mod', 'nfd')
  @Guard(IsSuperUser)
  async cooldown(
    @SlashOption({
      name: 'chatter',
      type: ApplicationCommandOptionType.User,
      required: true,
      description: "The chatter who's cooldowns should be reset",
    })
    chatter: User | GuildMember,
    @SlashOption({
      name: 'cooldown',
      type: ApplicationCommandOptionType.String,
      required: true,
      description: 'Which dino cooldown should be cooled down.',
    })
    @SlashChoice({ name: 'Hatch', value: 'HATCH' })
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
            lastGiftGiven: new Date('0'),
            lastSlurp: new Date('0'),
          },
        })
        break
      default:
        console.log(`Unexpected cooldown type: ${cooldown}`)
        break
    }

    return interaction.reply({ content: `${interaction.user} reset ${cooldown} cooldown for ${chatter}.` })
  }

  @Slash({
    name: 'reassign',
    description: "Forcibly change a dino's owner.",
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  })
  // @SlashGroup('mod', 'nfd')
  @Guard(IsSuperUser)
  async reassign(
    @SlashOption({
      name: 'nfd',
      type: ApplicationCommandOptionType.String,
      description: 'The name of the dino to be gifted.',
      required: true,
      autocomplete: function (this: NFD, interaction: AutocompleteInteraction) {
        this.allNFDAutoComplete(interaction).then((choices) => interaction.respond(choices))
      },
    })
    @SlashOption({
      name: 'recipient',
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
