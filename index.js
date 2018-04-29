var url = 'dat://528691905866112c90eea949bcc0712c208f0ac0803d38312dc18cfa7fda82d1'
// var url = 'dat://fork-ui-bunsen.hashbase.io/'
// console.log("dat url: " + url)
// var self = new DatArchive(url)
$(document).ready(  () => {

    let datUuid =  datCreateWiki()

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
    const archive = await DatArchive.fork(url)
    // saveDatSite(archive.url, title, url);
    let message = `Forked dat at ${archive.url}`;
    console.log(message)
    elem.innerHTML = elem.innerHTML + message + "<br/>";
    const dir = await archive.readdir('/')
    message = 'Read dir /: ' + JSON.stringify(dir);
    console.log(message)
    elem.innerHTML = elem.innerHTML + message + "<br/>";
    // const readContents = await archive.readFile('/index.html')
    // console.log('Read contents', readContents)
    return archive.url
    // this.openAddress(archive.url)
}


