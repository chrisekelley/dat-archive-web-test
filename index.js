var url = 'dat://528691905866112c90eea949bcc0712c208f0ac0803d38312dc18cfa7fda82d1'
// var url = 'dat://fork-ui-bunsen.hashbase.io/'
// console.log("dat url: " + url)
// var self = new DatArchive(url)
$(document).ready(  () => {

    // let datUuid =  datCreateWiki()
    let datUuid =  datCreateArchive()

});

const datCreateWiki = async () => {
    let elem = document.querySelector('#response');
    let message = 'Forking wiki from dat ' + url;
    console.log(message)
    elem.innerHTML = elem.innerHTML + message + "<br/>";
    let datUuid = await datForkArchive(url, 'My Wiki')
    message = "Completed forking datUuid: " + datUuid;
    console.log(message)
    elem.innerHTML = elem.innerHTML + message + "<br/>";
    let datAddress = "dat://" + datUuid

    var self = new DatArchive(datUuid)
    // enable edit if editable
    self.getInfo().then(info => {
        if (info.isOwner) {
            console.log("isOwner")
            elem.innerHTML = elem.innerHTML + "isOwner<br/>";
        } else {
            console.log("not owner")
            elem.innerHTML = elem.innerHTML + "not owner<br/>";
        }
    })
};

const datForkArchive = async(url, title)  => {
    let elem = document.querySelector('#response');
    console.log('Forking archive')
    const DefaultManager = DatArchive.DefaultManager
    // const storage =
    // DatArchive.setManager(new DefaultManager(storage))
    const archive = await DatArchive.fork(url)
    let writable = archive._archive.writable
    // saveDatSite(archive.url, title, url);
    let message = `Created new forked dat at ${archive.url} and it is indeed ${writable}`;
    console.log(message)
    elem.innerHTML = elem.innerHTML + message + "<br/>";
    const dir = await archive.readdir('/')
    message = 'Read new dat\'s dir /: ' + JSON.stringify(dir);
    console.log(message)
    elem.innerHTML = elem.innerHTML + message + "<br/>";
    // const readContents = await archive.readFile('/index.html')
    // console.log('Read contents', readContents)
    return archive.url
    // this.openAddress(archive.url)
}

// Lifted directly from dat-archive-web example
const datCreateArchive = async () => {
    const contents = `
            <title>Gateway Test</title>
            <p>Hello World!</p>
            `
    console.log('Creating new archive')
    const archive = await DatArchive.create({
        title: 'Gateway test',
        description: 'This is testing out creating new archives through the dat-gateway'
    })

    console.log(`Opened, ${archive.url}`)
    await archive.writeFile('index.html', contents)
    console.log('Wrote index.html')

    const dir = await archive.readdir('/')
    console.log('Read dir:', dir)
    const readContents = await archive.readFile('/index.html')
    console.log('Read contents', readContents)
    const sameArchive = new DatArchive(archive.url)
    await sameArchive.writeFile('index2.html', contents)
    console.log('Wrote index2.html')
    const dir2 = await sameArchive.readdir('/')
    console.log('Read dir2:', dir2)

    return archive.url
}


