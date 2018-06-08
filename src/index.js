const {ipcRenderer} = require('electron')
const fs = require('fs');
const readline = require('readline');
const stream = require('stream');

const HL7FileContent = document.getElementById('HL7FileContent')
var rl;

HL7FileContent.addEventListener('click', (event) => {
  console.log("Opening file via click on HL7FileContent");
  ipcRenderer.send('open-file-dialog')
})

ipcRenderer.on('selected-file', (event, file) => {
  console.log("Opening file: " + file);
  document.getElementById('HL7FileContent').innerHTML = "Please wait while opening file: " + file
  document.getElementById('HL7FileContent').classList.remove("empty");

  // Stream file instead of opening at once asynchronously, via https://coderwall.com/p/ohjerg/read-large-text-files-in-nodejs
  var instream = fs.createReadStream(file);
  var outstream = new stream;
  rl = readline.createInterface(instream, outstream);

  console.log(new Date().getTime());

  rl.on('line', function(line) {
    // process line here
    //console.log(line);
    //console.log("AA");
    //document.getElementById('HL7FileContent').innerHTML = document.getElementById('HL7FileContent').innerHTML + "<br>" + line;
  });

  rl.on('close', function() {
    // do something on finish here
    console.log(new Date().getTime());
    console.log("Done reading file");
  });

  /*
  // Reading the file at once, asynchronously
  console.log(new Date().getTime());
  fs.readFile(file, 'utf8', function (err, data) {
    console.log(new Date().getTime());
    if (err) return console.log(err);
    // data is the contents of the text file we just read
    console.log("File length: " + data.length);
    //event.sender.send('selected-file', data)
    //document.getElementById('HL7FileContent').innerHTML = data
    console.log("File length: " + data);
  });
  */
})
