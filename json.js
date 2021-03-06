const fs = require('fs').promises
const { join } = require('path')

const rooms = async () => {
  return (await fs.readdir(__dirname))
    .filter(roomid => !Number.isNaN(Number(roomid)))
}

const records = async roomid => (await fs.readdir(join(__dirname, String(roomid)))).map(date => date.replace('.txt', ''))

const roomsRecords = async () => {
  return Object.assign(...await Promise.all(
    (await rooms())
    .map(async roomid => ({
      [roomid]: await records(roomid)
    }))
  ))
}

const read = async (roomid, date, getUname = false) => {
  let raw = String(await fs.readFile(join(__dirname, `${roomid}/${date}.txt`)))
  let info = raw.split('\n')
  let result = { danmaku: [], raw, speakers: {}, online: Array(1440).fill(1) }
  let currentMinutes = 0
  for (let i = 0; i < info.length; i++) {
    if (info[i] === '') {
      continue
    }

    if (info[i] === 'V1') {
      continue
    }

    if (info[i].startsWith('TIME') && info[i].includes('ONLINE') && !info[i].includes('SPEAKERNUM')) {
      let meta = info[i].replace('TIME', '').split('ONLINE')
      currentTime = meta[0].split(':')
      currentMinutes = Number(currentTime[0]) * 60 + Number(currentTime[1])
      let online = Number(meta[1])
      result.online[currentMinutes] = online
      continue
    }

    if (info[i].startsWith('SPEAKERNUM')) {
      if (info[i].split(';')[1]) {
        info[i].split(';')[1].split(',')
          .map(user => user.split(':'))
          .map(user => ({ mid: user[0], uname: user[1] }))
          .forEach(({ mid, uname }) => {
            if (result.speakers[mid]) {
              result.speakers[mid].uname = uname
            }
          })
      } else {
        result.speakerNum = Number(info[i].replace('SPEAKERNUM', ''))
      }
      continue
    }

    let [time, mid, ...text] = info[i].split(':')
    let danmaku = { time: currentMinutes }
    if (time > 946656000000 && !Number.isNaN(Number(mid))) {
      danmaku.timestamp = Number(time)
      danmaku.mid = Number(mid)
      danmaku.text = text.join(':')
      if (!result.speakers[mid]) {
        result.speakers[mid] = { speakerNum: 0 }
      }
      result.speakers[mid].speakerNum++
    } else if (!Number.isNaN(Number(time)) && mid) {
      danmaku.mid = Number(time)
      danmaku.text = [mid, ...text].join(':')
      if (!result.speakers[time]) {
        result.speakers[time] = { speakerNum: 0 }
      }
      result.speakers[time].speakerNum++
    } else {
      danmaku.text = info[i]
    }
    result.danmaku.push(danmaku)
  }

  if (Object.keys(result.speakers).length) {
    result.speakerNum = Object.keys(result.speakers).length
  }
  return result
}

module.exports = {
  rooms,
  records,
  roomsRecords,
  read
}
