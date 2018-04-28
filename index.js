var url = 'dat://528691905866112c90eea949bcc0712c208f0ac0803d38312dc18cfa7fda82d1'
// var url = 'dat://fork-ui-bunsen.hashbase.io/'
console.log("dat url: " + url)
var self = new DatArchive(url)
$(document).ready(function () {

    // enable edit if editable
    self.getInfo().then(info => {
        if (info.isOwner) {
            console.log("isOwner")
        } else {
            console.log("not owner")
        }
    })
})
