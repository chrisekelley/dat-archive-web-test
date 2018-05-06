
if (window.location.href.substr(0, 5) === 'dat://') {
    window.datAddress = window.location.href
} else {
    window.datAddress = `dat://${Buffer.from(base32.decode(window.location.host.split('.')[0]), "ascii").toString("hex")}`
}

if (!window.DatArchive) {
    DatArchive.setManager(new PersistantManager())
    window.DatArchive = DatArchive
}

$(document).ready(  () => {
    populateMessage()
    window.forkButton.addEventListener('click', forkThisArchive)
    window.saveMessageButton.addEventListener('click', saveMessage) 
});

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

const forkThisArchive = async () => {
    window.linkToFork.innerHTML = `Please wait...`
    let forkedArchive = await DatArchive.fork(window.datAddress)
    window.linkToFork.innerHTML = `
        Fork creation successful! The fork's address is ${forkedArchive.url} <br>
        <a href="${forkedArchive.url}">Click to open the fork of this archive</a>
    `
} 

const populateMessage = async () => {
    window.messageBox.value = 'Loading...'
    let archive = new DatArchive(window.datAddress)
    let message =  await archive.readFile('message.txt')
    window.messageBox.value = message
}