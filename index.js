
if (window.location.href.substr(0, 5) === 'dat://') {
    window.datAddress = window.location.href
} else {
    window.datAddress = `dat://${buffer.Buffer.from(base32.decode(window.location.host.split('.')[0]), "ascii").toString("hex")}`
}

// if (!window.DatArchive) {
//     DatArchive.setManager(new PersistantManager())
//     window.DatArchive = DatArchive
// }

// const populateMessage = async () => {
//   window.messageBox.value = 'Loading...'
//   let archive = new DatArchive(window.datAddress)
//   let message =  await archive.readFile('message.txt')
//   window.messageBox.value = message
// }

const wikiDat = 'dat://wysiwywiki-pfrazee.hashbase.io'

const forkThisArchive = async () => {
  window.linkToFork.innerHTML = `Please wait...`
  let forkedArchive = await DatArchive.fork(window.datAddress)
  window.linkToFork.innerHTML = `
        Fork creation successful! The fork's address is ${forkedArchive.url} <br>
        <a href="${forkedArchive.url}">Click to open the fork of this archive</a>
    `
}

$(document).ready(  () => {
  // populateMessage()
  // window.forkButton.addEventListener('click', forkThisArchive)
  // window.saveMessageButton.addEventListener('click', saveMessage)
  const searchBox = document.getElementById('search')
  const goButton = document.getElementById('go')
  const frame = document.getElementById('client-frame')
  searchBox.value = wikiDat;
  goButton.addEventListener('click', addDat)


  const server = new RPC.Server(window, frame.contentWindow, {
    storage,
    addArchive,
    selectArchive
  })
  window.gatewayServer = server

});

const selectQueue = []

const storage = randomAccessIdb('dat://storage')
window.gatewayStorage = storage

function addDat() {
  const searchBox = document.getElementById('search')
  const dat = searchBox.value
  console.log("added " + dat)
}

function addArchive (key, secretKey, options, callback) {
  const archiveList = getArchives()
  archiveList.push({
    key,
    secretKey,
    details: options
  })
  setArchives(archiveList)
}

function selectArchive (options, callback) {
  selectQueue.push({
    options: options,
    callback: callback
  })

  showNext()
}

function setArchives (newList) {
  window.localStorage.archives = JSON.stringify(newList)
}

function getArchives () {
  return JSON.parse(window.localStorage.archives || '[]')
}

const saveMessage = async () => {
    window.messageBoxStatus.innerHTML = "Saving..."
    let archive = new DatArchive(window.datAddress)
    try {
        await archive.writeFile('message.txt', window.messageBox.value)
        window.messageBoxStatus.innerHTML = "Saved!"
        setTimout(() => window.messageBoxStatus.innerHTML = '', 2000)
    } catch(e) {
        window.messageBoxStatus.innerHTML = "Failed to save :("
        console.log(e)
    }
}


