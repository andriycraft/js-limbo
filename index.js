const mc = require('minecraft-protocol')
const Chunk = require('prismarine-chunk')('1.16.3')
const Vec3 = require('vec3')
const config = require('./config.json')
const server = mc.createServer({
  'online-mode': config.onlinemode,
  encryption: true,
  host: config.host,
  port: config.port,
  motd: config.motd,
  version: '1.16.3'
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

server.on('login', function (client) {
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
  
  client.write('position', {
    x: 15,
    y: 101,
    z: 15,
    yaw: 137,
    pitch: 0,
    flags: 0x00
  })
})
