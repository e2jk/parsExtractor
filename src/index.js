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
var fileContentArray = {};
var segmentsArray = {};
var selectedFieldsArray = {};
var selectedFieldsSortedArray = {};
var numMessages = 0;
var numSegments = 0;
var readStartTime = 0;
var readEndTime = 0;
var writeStartTime = 0;
var writeEndTime = 0;

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
  var segType = "";
  // CSS selector for all inputs of type checkbox that are checked and have the class fieldCheckbox
  document.querySelectorAll('input[type="checkbox"]:checked.fieldCheckbox').forEach(function(fieldCheckbox) {
    // Two arrays: first one is a plain array with the list of selected fields
    selectedFieldsArray.push(fieldCheckbox.id.substring(6,20));
    // The second has 2 levels, first per segment type then fields (used when extracting, as processing is per segment)
    segType = fieldCheckbox.id.substring(6,9);
    if (!selectedFieldsSortedArray.hasOwnProperty(segType)) {
      selectedFieldsSortedArray[segType] = new Array();
    }
    selectedFieldsSortedArray[segType].push(fieldCheckbox.id.substring(10,20));
  });
  // Show the selection summary section
  selectionSummary.innerHTML = "Extracting the following fields:\n<ul>\n  <li>" + selectedFieldsArray.join("</li>\n  <li>") + "</li>\n</ul>";
  selectionSummary.style.display = 'block';
  changeFieldSelectionSection.style.display = 'block';
  // Hide the field selection section
  fieldSelection.style.display = 'none';
  fileSummaryPleaseSelect.style.display = 'none';
  // Send signal to main renderer to show the Save dialog
  ipcRenderer.send('save-dialog');
})

ipcRenderer.on('saved-file', (event, path) => {
  if (!path) {
    // Not doing anything if Cancel was pressed, maybe user wants to change the selected fields?
  } else {
    // Generating content to be saved in CSV file
    var fieldsInThisMessageArray;
    var segmentPositionInCSVArray = new Array();
    var fieldPositionInCSVArray = new Array();
    var CSVHeader = "";
    var CSVContent = "";
    var CSVContentArray;
    var surroundWithQuotes = "";
    var multSeg;
    writeStartTime = Date.now();
    for (var seg in fileContentArray) {
      if (fileContentArray.hasOwnProperty(seg)) {
        fields = fileContentArray[seg];
        // New message, i.e. new line in CSV file
        if ("MSH" == fields[0]) {
          // First save of the previous message's content, if any
          if (CSVContentArray != undefined) {
            for (var i = 0; i < CSVContentArray.length; i++) {
              // If the value contains a quote, surround the value with double quotes
              surroundWithQuotes = CSVContentArray[i].includes('"') ? '"' : "";
              CSVContent += (i > 0 ? ";" : "") + surroundWithQuotes + CSVContentArray[i] + surroundWithQuotes;
            }
            CSVContent += "\n";
          }
          // Then reinitialize the arrays to process the new message
          CSVContentArray = new Array();
          fieldsInThisMessageArray = new Array();
        }
        // Only process segments that have fields to be exported in the CSV file
        if (selectedFieldsSortedArray.hasOwnProperty(fields[0])) {
          // Keep track how many of this segment type are in this message (handle up to 1000 multiple segments)
          multSeg = 0;
          for (var i = 0; i < 1000; i++) {
            if (!fieldsInThisMessageArray.hasOwnProperty(fields[0] + "_" + i)) {
              multSeg = i;
              fieldsInThisMessageArray[fields[0] + "_" + multSeg] = "";
              break;
            }
          }
          // Check which position in the CSV file is reserved for this iteration of that segment
          if (!segmentPositionInCSVArray.hasOwnProperty(fields[0] + "_" + multSeg)){
            segmentPositionInCSVArray[fields[0] + "_" + multSeg] = Object.keys(segmentPositionInCSVArray).length;
            for (var field in selectedFieldsSortedArray[fields[0]]) {
              if (selectedFieldsSortedArray[fields[0]].hasOwnProperty(field)) {
                fieldPositionInCSVArray[fields[0] + "-" + selectedFieldsSortedArray[fields[0]][field] + "_" + multSeg] = Object.keys(fieldPositionInCSVArray).length;
              }
            }
          }
          // Keeping the value in the array that will be written to the CSV file
          for (var field in selectedFieldsSortedArray[fields[0]]) {
            if (selectedFieldsSortedArray[fields[0]].hasOwnProperty(field)) {
              CSVContentArray[fieldPositionInCSVArray[fields[0] + "-" + selectedFieldsSortedArray[fields[0]][field] + "_" + multSeg]] = fields[selectedFieldsSortedArray[fields[0]][field]];
            }
          }
        }
      }
    }

    // Add CSV header to content to be saved
    for (var i = 0; i < selectedFieldsArray.length; i++) {
      CSVHeader += (i > 0 ? ";" : "") + selectedFieldsArray[i];
    }
    CSVContent = CSVHeader + "\n" + CSVContent;

    // Saving CSV file
    fs.writeFile(path, CSVContent, (err) => {
      if (err) throw err;
      console.log(`The file has been saved: ${path}`);
      writeEndTime = Date.now();
      var elapsedTime = writeEndTime - writeStartTime;
      console.log("Done writing CSV file in", elapsedTime, "msec");
    });
  }
})

ipcRenderer.on('selected-file', (event, file) => {
  fileContentArray = new Array();
  segmentsArray = {};
  numMessages = 0;
  numSegments = 0;
  console.log("Opening file: " + file);

  // Stream file instead of opening at once asynchronously, via https://coderwall.com/p/ohjerg/read-large-text-files-in-nodejs
  var instream = fs.createReadStream(file);
  var outstream = new stream;
  rl = readline.createInterface(instream, outstream);

  readStartTime = Date.now();

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
  // Store for use when extracting
  fileContentArray.push(currSegFields);
  // Segment identifier
  var segType = currSegFields[0];

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
  readEndTime = Date.now();
  var elapsedTime = readEndTime - readStartTime;
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
