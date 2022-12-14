const mc = require('minecraft-protocol')
const Chunk = require('prismarine-chunk')('1.16.3')
const Vec3 = require('vec3')
const fs = require('fs')
const config = require('./config.json')
const server = mc.createServer({
  'online-mode': config.onlinemode,
  encryption: true,
  host: config.host,
  port: config.port,
  motd: config.motd,
  version: '1.16.5',
  maxPlayers: config.maxPlayers,
  favicon: config.favicon
})
const mcData = require('minecraft-data')(server.version)
const loginPacket = mcData.loginPacket
const chunk = new Chunk()

for (let x = 0; x < 16; x++) {
  for (let z = 0; z < 16; z++) {
    chunk.setBlockType(new Vec3(x, 100, z), mcData.blocksByName.grass_block.id)
    chunk.setBlockData(new Vec3(x, 100, z), 1)
    for (let y = 0; y < 256; y++) {
      chunk.setSkyLight(new Vec3(x, y, z), 15)
    }
  }
}

function chat(client, message) {
  client.write('chat', { message: JSON.stringify(message), position: 0, sender: '0' })
}


const date = new Date()
const id = Math.floor(Math.random() * 1000000)

function log(message, type) {
  if (config.enableLogging) { 
    fs.appendFile(`./logs/Limbo-server_${id}`, `${type}: ${message}\n`, function (err) { })
  }
  if (!config.enableConsole) { return }
  console.log(`${type}: ${message}`)
}

log('Limbo server started on port ' + config.port, 'info')
log('To enable /hub command you must have some hub plugin installed on bungeecord/velocity proxy!', 'warning')


process.on('uncaughtException', function (err) {
  log(`An error while running \n: ${err.stack}`, 'error')
})

process.on('unhandledRejection', function (promise) {
  log(`An error while running \n: ${promise}`, 'error')
})

function broadcast(message) {
  let client
  for (const clientId in server.clients) {
    if (server.clients[clientId] === undefined) continue

    client = server.clients[clientId]
    const msg = {
      text: `${message}`
    }
    client.write('chat', { message: JSON.stringify(msg), position: 0, sender: '0' })
  }
}

server.on('login', function (client) {
  log('Player ' + client.username + ' connected with UUID: ' + client.uuid + ' IP: ' + client.socket.remoteAddress, 'info')
  client.write('login', {
    entityId: client.id,
    isHardcore: config.hardcore,
    gameMode: config.gamemode,
    previousGameMode: config.gamemode,
    worldNames: loginPacket.worldNames,
    dimensionCodec: loginPacket.dimensionCodec,
    dimension: loginPacket.dimension,
    worldName: config.worldname,
    hashedSeed: [0, 0],
    maxPlayers: server.maxPlayers,
    viewDistance: 10,
    reducedDebugInfo: false,
    enableRespawnScreen: true,
    isDebug: false,
    isFlat: false
  })
  
  client.registerChannel('brand', ['string'])
  client.writeChannel('brand', `AC 2.0 Limbo Server (1). Info at: https://github.com/andriycraft/js-limbo/`)
  
  
  const header = { text: config.tabheader }
  const footer = { text: config.tabfooter }
  client.write('playerlist_header', {
    header: JSON.stringify(header),
    footer: JSON.stringify(footer)
  })
  
  client.write('map_chunk', {
    x: 0,
    z: 0,
    groundUp: true,
    biomes: chunk.dumpBiomes !== undefined ? chunk.dumpBiomes() : undefined,
    heightmaps: {
      type: 'compound',
      name: '',
      value: {}
    },
    bitMap: chunk.getMask(),
    chunkData: chunk.dump(),
    blockEntities: []
  })
  
  chat(client, config.welcomemsg)
  
  
  client.write('position', {
    x: 15,
    y: 101,
    z: 15,
    yaw: 137,
    pitch: 0,
    flags: 0x00
  })

  client.on('chat', (packet) => {
    if (packet.message.length > 256) {
      log(client.username + ' was kicked for sending message that is veryyyyyyyyyy long', 'info')
      client.end(config.kick_baddata.replace('%error%', config.errors_msgtoolong))
      return
    }
    if (packet.message.length = 0) {
      log(client.username + ' was kicked for sending invalid message', 'warning')
      client.end(config.kick_baddata.replace('%error%', config.errors_invalidmessage))
      return
    }
    if (packet.message.startsWith('/')) {
      chat(client, config.hubcommandtip)
    } else {
      if (!config.chat_enabled) { return }
      broadcast(config.chatformat.replace('%player', client.username).config.chatformat.replace('%message', packet.message) )
    }
  })

  client.on('end', (client) => {
    log(client.username + ' left', 'info')
  })
})
