// getting all required elements
const searchWrapper = document.querySelector(".search-input");
const inputBox = searchWrapper.querySelector("input");
const suggBox = searchWrapper.querySelector(".autocom-box");
const icon = searchWrapper.querySelector(".icon");
let linkTag = searchWrapper.querySelector("a");
let webLink;
let selectedData = [];

const socket = io();
let allFilesUpload = [];
// Function to fetch allFilesUpload from the server
function fetchAllFilesUpload() {
    socket.emit("get-all-files", {});

    socket.on("all-files", function (data) {
        // Process the data received from the server
        allFilesUpload = data;
        // You can update the UI or perform any actions with the received data here
    });
}
inputBox.onclick = () => {
    // Fetch allFilesUpload from the server
    fetchAllFilesUpload();
};
// if the user presses any key and releases
inputBox.onkeyup = (e) => {
    let userData = e.target.value; // user entered data
    let emptyArray = [];
    if (userData) {
        icon.onclick = () => {
            let allHiden = true;
            let selectData = inputBox.value;
            let searchTerm = inputBox.value.toLowerCase();
            let allItems = document.querySelectorAll(".files-list .item");

            allItems.forEach((item) => {
                let fileNameElement = item.querySelector(".filename");
                let fileName = fileNameElement.textContent.toLowerCase();

                // Check if the filename matches the search term
                if (fileName.startsWith(searchTerm)) {
                    // If it matches, show the item
                    item.style.display = "block";
                    allHiden = false;
                } else {
                    // If it doesn't match, hide the item
                    item.style.display = "none";
                }
            });
            if (selectData.trim() !== "") {

                if (allHiden == true) {
                    let [filename, uid] = selectData.split(' - Author: ');
                    selectedData = [filename.trim(), uid.trim()];
                }

                let [selectedFilename, selectedUid] = selectedData;
                let find_file = false;

                for (let i = 0; i < allFilesUpload.length; i++) {
                    let file = allFilesUpload[i];
                    if (file.filename === selectedFilename && file.uid === selectedUid) {
                        socket.emit("request-download", {
                            client_request: client_id,
                            uid: selectedUid,
                            filename: selectedFilename,
                        });
                        find_file = true;
                    }
                }
                if (find_file == false) {
                    // Handle not find
                    alert("File not found");
                }
            }
        }


        emptyArray = allFilesUpload.filter((data) => {
            // filtering array value and user characters to lowercase

            return data.filename.toLowerCase().startsWith(userData.toLowerCase());
        });

        emptyArray = emptyArray.map((data) => {
            // passing return data inside li tag
            return `<li>${data.filename} - Author: ${data.uid}</li>`;
        });

        searchWrapper.classList.add("active"); // show autocomplete box
        showSuggestions(emptyArray);
        let allList = suggBox.querySelectorAll("li");
        for (let i = 0; i < allList.length; i++) {
            // adding onclick attribute to all li tags
            allList[i].setAttribute("onclick", "select(this)");
        }
    } else {
        searchWrapper.classList.remove("active"); // hide autocomplete box
    }
};

function select(element) {
    let selectData = element.textContent;
    inputBox.value = selectData;
    searchWrapper.classList.remove("active");
}

function showSuggestions(list) {
    let listData;
    if (!list.length) {
        listData = `<li>No matches found</li>`;
    } else {
        listData = list.join('');
    }
    suggBox.innerHTML = listData;
}


(function () {

})();