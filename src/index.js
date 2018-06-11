const {ipcRenderer} = require('electron')
const fs = require('fs');
const readline = require('readline');
const stream = require('stream');

const selectFileBtn = document.getElementById('selectFileBtn');
const fileSummary = document.getElementById('fileSummary');
const fileSummaryPleaseSelect = document.getElementById('fileSummaryPleaseSelect');
const fieldSelection = document.getElementById('fieldSelection');
const selectionSummary = document.getElementById('selectionSummary');
const changeFieldSelectionSection = document.getElementById('changeFieldSelectionSection');
const changeFieldSelectionLink = document.getElementById('changeFieldSelectionLink');
const extractBtn = document.getElementById('extractBtn');

var rl;
var segmentsArray = {};
var selectedFieldsArray = {};
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

changeFieldSelectionLink.addEventListener('click', (event) => {
  console.log("Click on changeFieldSelectionLink");
  // Show the field selection section
  fieldSelection.style.display = 'block';
  fileSummaryPleaseSelect.style.display = 'inline';
  // Hide the selection summary section
  selectionSummary.style.display = 'none';
  changeFieldSelectionSection.style.display = 'none';
})

extractBtn.addEventListener('click', (event) => {
  console.log("Click on extractBtn");
  selectedFieldsArray = new Array();
  // CSS selector for all inputs of type checkbox that are checked and have the class fieldCheckbox
  document.querySelectorAll('input[type="checkbox"]:checked.fieldCheckbox').forEach(function(fieldCheckbox) {
    selectedFieldsArray.push(fieldCheckbox.id.substring(6,20));
  });
  // Show the selection summary section
  selectionSummary.innerHTML = "Extracting the following fields:\n<ul>\n  <li>" + selectedFieldsArray.join("</li>\n  <li>") + "</li>\n</ul>";
  selectionSummary.style.display = 'block';
  changeFieldSelectionSection.style.display = 'block';
  // Hide the field selection section
  fieldSelection.style.display = 'none';
  fileSummaryPleaseSelect.style.display = 'none';
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
    segmentsArray[segType] = (currSegFields.length - 1);
  }
  if (segmentsArray[segType] < (currSegFields.length - 1)) {
    segmentsArray[segType] = (currSegFields.length - 1);
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
  fileSummary.innerHTML = "This file contains <strong>" + numMessages + " messages</strong> and <strong>" + numSegments + " segments</strong>.";
  fileSummaryPleaseSelect.style.display = 'inline';

  var fieldSelectionHTML = "";
  for (var seg in segmentsArray) {
    fieldSelectionHTML += '<li class="segmentSelect">\n  <div class="segment">' + seg + ' (' + segmentsArray[seg] + ' fields)</div>\n  <div class="fieldSelect">\n';
    for (var i = 0; i < segmentsArray[seg]; i++) {
      fieldSelectionHTML += '    <input type="checkbox" id="field_' + seg + '-' + (i+1) + '" class="fieldCheckbox"><label for="field_' + seg + '-' + (i+1) + '">' + seg + '-' + (i+1) + '</label><br>\n';
    }
    fieldSelectionHTML += '  </div>\n</li>\n';
  }
  fieldSelection.innerHTML = fieldSelectionHTML;
}
