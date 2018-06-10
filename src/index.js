const {ipcRenderer} = require('electron')
const fs = require('fs');
const readline = require('readline');
const stream = require('stream');

const HL7FileContent = document.getElementById('HL7FileContent')
var rl;
var segmentsArray = {};
var numMessages = 0;
var numSegments = 0;
var startTime = 0;
var endTime = 0;

// Set defaults, actual values will be read from each message's MSH segment
var fieldSep   = '|';
var compSep    = '^';
var subCompSep = '&';
var escapeChar = '\\';
var repeatSep  = '~';

HL7FileContent.addEventListener('click', (event) => {
  console.log("Opening file via click on HL7FileContent");
  ipcRenderer.send('open-file-dialog')
})

ipcRenderer.on('selected-file', (event, file) => {
  segmentsArray = {};
  numMessages = 0;
  numSegments = 0;
  console.log("Opening file: " + file);
  document.getElementById('HL7FileContent').innerHTML = "Please wait while opening file: " + file
  document.getElementById('HL7FileContent').classList.remove("empty");

  // Stream file instead of opening at once asynchronously, via https://coderwall.com/p/ohjerg/read-large-text-files-in-nodejs
  var instream = fs.createReadStream(file);
  var outstream = new stream;
  rl = readline.createInterface(instream, outstream);

  startTime = Date.now();

  rl.on('line', function(line) {
    analyzeSegment(line);
  });

  rl.on('close', function() {
    // do something on finish here
    endTime = Date.now();
    var elapsedTime = endTime - startTime;
    console.log("Done analyzing file in", elapsedTime, "msec");
    console.log("This file contains", numMessages,"messages and",numSegments,"segments");
    console.log(JSON.stringify(segmentsArray));
    console.log(segmentsArray);
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

function analyzeSegment(line) {
  numSegments++;
  if ("MSH" ==  line.substring(0,3)){
    numMessages++;
    determineEncChars(line.substring(0,8));
  }
  // Split segment in its fields
  var currSegFields = line.split(fieldSep);
  // Remove last item if the segments ends with the field separator
  if (currSegFields[(currSegFields.length - 1)] == '') currSegFields.splice(-1,1);
  // Segment identifier
  segType = currSegFields[0];

  // Determine the maximum number of fields in a segment
  if (!segmentsArray[segType]) {
    segmentsArray[segType] = currSegFields.length;
  }
  if (segmentsArray[segType] < currSegFields.length) {
    segmentsArray[segType] = currSegFields.length;
  }
}

// Determine the Encoding Characters from the MSH segment
function determineEncChars(encChars) {
  fieldSep   = encChars.substring(3,4);
  compSep    = encChars.substring(4,5);
  repeatSep  = encChars.substring(5,6);
  escapeChar = encChars.substring(6,7);
  subCompSep = encChars.substring(7,8);
}
