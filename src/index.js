const {ipcRenderer} = require('electron')
const fs = require('fs');
const readline = require('readline');
const stream = require('stream');

const selectFileBtn = document.getElementById('selectFileBtn');
const fieldSelection = document.getElementById('fieldSelection');
const fileSummary = document.getElementById('fileSummary');

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

selectFileBtn.addEventListener('click', (event) => {
  console.log("Opening file via click on selectFileBtn");
  ipcRenderer.send('open-file-dialog')
})

ipcRenderer.on('selected-file', (event, file) => {
  segmentsArray = {};
  numMessages = 0;
  numSegments = 0;
  console.log("Opening file: " + file);

  // Stream file instead of opening at once asynchronously, via https://coderwall.com/p/ohjerg/read-large-text-files-in-nodejs
  var instream = fs.createReadStream(file);
  var outstream = new stream;
  rl = readline.createInterface(instream, outstream);

  startTime = Date.now();

  rl.on('line', function(line) {
    analyzeSegment(line);
  });

  rl.on('close', function() {
    fileAnalyzed();
  });
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

function fileAnalyzed() {
  endTime = Date.now();
  var elapsedTime = endTime - startTime;
  console.log("Done analyzing file in", elapsedTime, "msec");
  fileSummary.innerHTML = "This file contains " + numMessages + " messages and " + numSegments + " segments.<br>Please select which fields you would like to extract:";
  console.log(JSON.stringify(segmentsArray));
  console.log(segmentsArray);

  var fieldSelectionHTML = "";
  for (var seg in segmentsArray) {
    console.log("segmentsArray." + seg + " = " + segmentsArray[seg]);
    fieldSelectionHTML += '<li class="segmentSelect">\n  <div class="segment">' + seg + ' (' + segmentsArray[seg] + ' fields)</div>\n  <div class="fieldSelect">\n';
    for (var i = 0; i < segmentsArray[seg]; i++) {
      fieldSelectionHTML += '    <input type="checkbox" id="field_' + seg + '-' + (i+1) + '"><label for="field_' + seg + '-' + (i+1) + '">' + seg + '-' + (i+1) + '</label><br>\n';
    }
    fieldSelectionHTML += '  </div>\n</li>\n';
  }
  fieldSelection.innerHTML = fieldSelectionHTML;
}
