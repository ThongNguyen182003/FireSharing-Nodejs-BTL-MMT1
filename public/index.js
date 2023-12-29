

function register() {
    // Get values from input fields
    const username = document.getElementById("clientName").value.trim();
    const password = document.getElementById("password").value.trim();
    const socket = io();

    // Emit the registration request to the server
    socket.emit("register", { username, password });

    // Listen for the server response
    socket.on("register-fail", () => {
        // Display an alert when registration fails
        alert("Tài khoản đã tồn tại !!!");
        // Optionally, you can keep the socket open or perform additional actions
        socket.close();
    });

    socket.on("folderCreated", () => {
        // If registration is successful, close the socket
        alert("Đăng kí thành công !!!");
        socket.close();
    });
}



function login() {
    // Get values from input fields
    var client_id;
    const username = document.getElementById("clientName").value.trim();
    const password = document.getElementById("password").value.trim();

    // Perform login logic (you can send these values to the server via sockets)
    // ...
    const socket = io();
    socket.emit("login", { username, password });
    // Optionally, you can show a message to the user or perform additional actions

    socket.on("loginResponse", (response) => {
        if (response.success) {
            // Successful login, you can perform actions here
            alert("Hello !!! " + response.userData.username);
            const userInputElement = document.querySelector(".user-input");
            userInputElement.innerHTML = `<h3>Hello !!! ${response.userData.username}</h3>`;
            client_id = response.userData.username;

            document.getElementById('file-input').addEventListener('change', handleFileSelect);

            function handleFileSelect(event) {

                const files = event.target.files;
                const filenames = [];
                for (const file of files) {
                    filenames.push(file.name);
                }
                socket.emit("file-can-share", {
                    user_send: response.userData.username,
                    filenames: filenames,
                });
                // Phía client (trình duyệt)


            }
        } else {
            // Unsuccessful login, display an alert or handle accordingly
            alert("Đăng nhập thất bại:", response.message);
            socket.close();
        }
    });
    // ...
    socket.on("active-users", ({ users }) => {
        // Hiển thị danh sách người dùng đang hoạt động
        const activeUsersList = document.querySelector('.list-client-online');
        const userFileList = document.getElementById('userFileList');
        userFileList.innerHTML = '';
        activeUsersList.innerHTML = '';

        // Lưu trữ user đã được chọn
        let selectedUser = null;

        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.classList.add("user-Item");
            userItem.textContent = user;

            // Lắng nghe sự kiện click 
            userItem.addEventListener('click', () => {
                // Xóa lớp selected từ user trước đó
                if (selectedUser) {
                    selectedUser.classList.remove('selected');
                }

                // Đánh dấu user mới được chọn
                selectedUser = userItem;
                selectedUser.classList.add('selected');

                // Gửi yêu cầu lấy danh sách file của người dùng được chọn
                socket.emit('get-user-files', { username: user });
            });

            activeUsersList.appendChild(userItem);
        });
    });

    socket.on('user-files', ({ username, files }) => {
        console.log(`List of files for user ${username}:`, files);

        // Hiển thị danh sách file trong giao diện người dùng
        const userFileList = document.getElementById('userFileList');
        userFileList.innerHTML = ''; // Xóa danh sách cũ trước khi thêm danh sách mới

        const searchInput = document.querySelector('.search-input input');

        files.forEach((file) => {
            const listItem = document.createElement("li");
            listItem.textContent = file;

            // Thêm sự kiện click cho mỗi listItem
            listItem.addEventListener('click', () => {
                // Kết hợp tên file và tên người dùng vào định dạng filename - username
                const combinedValue = `${file} - ${username}`;

                // Đặt giá trị mới vào ô input
                searchInput.value = combinedValue;
            });

            // Append the list item to the user file list
            userFileList.appendChild(listItem);
        });
    });




    socket.on("list-file", ({ username, files }) => {
        console.log(`List of files for user ${username}:`, files);

        // Hiển thị danh sách file trong giao diện người dùng
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = ''; // Xóa danh sách cũ trước khi thêm danh sách mới

        files.forEach((file) => {
            // Tạo một thẻ li để chứa thông tin file và nút xóa
            const fileDivContainer = document.createElement("div");
            fileDivContainer.classList.add("file-container");

            const listItem = document.createElement("li");

            // Tạo một thẻ div chứa tên file
            const fileDiv = document.createElement("div");
            fileDiv.textContent = file;
            fileDiv.classList.add("file-name"); // Thêm class cho thẻ div

            // Tạo nút xóa
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "x";
            deleteButton.classList.add("delete-button"); // Thêm class cho nút xóa

            // Xử lý sự kiện khi click nút xóa  
            deleteButton.addEventListener("click", () => {
                // Handle the file deletion here
                console.log(`Deleting file: ${file}`);
                // You can emit a socket event to inform the server about the file deletion
                const userFileList = document.getElementById('userFileList');
                userFileList.innerHTML = ''; // Xóa danh sách cũ trước khi thêm danh sách mới
                socket.emit("delete-file", { username, filename: file });
            });
            listItem.appendChild(fileDiv);
            fileDivContainer.appendChild(listItem);
            fileDivContainer.appendChild(deleteButton);
            fileList.appendChild(fileDivContainer);
        });
    });
    document.querySelector('.icon').addEventListener('click', () => {
        // Lấy giá trị từ ô input
        const inputValue = document.querySelector('.search-input input').value;

        // Tách giá trị thành file và username
        const [filename, username_send] = inputValue.split(' - ');

        // Gửi thông tin filename và username lên server
        socket.emit('search-file', { client_id, filename, username_send });
    });
    // Client-side code

    // ...

    // Lắng nghe sự kiện file-chunk-received từ server
    // Biến để lưu trữ nội dung của file
    let fileContent = '';

    // Lắng nghe sự kiện file-chunk-received từ server
    socket.on('file-chunk-received', ({ filename, content, isLastChunk }) => {
        // Xử lý nội dung chunk tại đây (ví dụ: lưu vào biến fileContent)
        fileContent += content;

        if (isLastChunk) {
            // Đây là chunk cuối cùng, bạn có thể tải xuống file ở đây
            downloadFile(filename, fileContent);

            // Reset biến fileContent để sử dụng cho các file khác (nếu có)
            fileContent = '';
        }
    });

    // ...


    socket.on('file-request', ({ client_id, filename, username_send }) => {
        // Tạo một đối tượng div để chứa input file và thông báo
        const inputDiv = document.createElement('div');
        inputDiv.classList.add("inputDiv");

        // Tạo một đối tượng input file mới
        const inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.name = 'requestedFile'; // Tên của input file, bạn có thể đặt tên tùy ý

        // Tạo một đối tượng paragraph (p) để chứa thông báo
        const messageParagraph = document.createElement('p');
        messageParagraph.textContent = `Client ${client_id} is requesting file ${filename} from ${username_send}`;

        // Tạo một đối tượng nút xóa
        const closeButton = document.createElement('button');
        closeButton.classList.add("button-request");
        closeButton.textContent = 'x';

        // Thêm sự kiện lắng nghe cho nút xóa
        closeButton.addEventListener('click', () => {
            inputDiv.remove(); // Xóa inputDiv khi nút xóa được nhấn
        });

        // Thêm input file, thông báo và nút xóa vào inputDiv
        inputDiv.appendChild(closeButton);
        inputDiv.appendChild(messageParagraph);
        inputDiv.appendChild(inputFile);

        // Thêm inputDiv vào DOM (đặt nó dưới thẻ có class là "search")
        const searchInputWrapper = document.querySelector('.search');
        searchInputWrapper.appendChild(inputDiv);

        // (Optional) Bạn có thể tự động kích hoạt sự kiện change của input file nếu muốn
        // inputFile.dispatchEvent(new Event('change'));
        // Gửi thông báo về server khi người dùng chọn file

        inputFile.addEventListener('change', () => {
            const selectedFile = inputFile.files[0];

            // Kiểm tra trạng thái của WebSocket trước khi tiếp tục
            const chunkSize = 1024 * 1024; // 1MB chunks (điều này có thể điều chỉnh tùy thuộc vào nhu cầu của bạn)
            let offset = 0;

            const readAndSendChunk = () => {
                const reader = new FileReader();
                const chunk = selectedFile.slice(offset, offset + chunkSize);

                reader.onload = function (e) {
                    const fileContent = e.target.result;

                    // Gửi nội dung của file và thông tin tới server
                    socket.emit('upload-file-chunk', {
                        client_id,
                        filename: selectedFile.name,
                        content: fileContent,
                        offset,
                        isLastChunk: offset + chunkSize >= selectedFile.size,
                        username_send,
                    });

                    offset += chunkSize;

                    if (offset < selectedFile.size) {
                        // Đọc và gửi chunk tiếp theo
                        readAndSendChunk();
                    }
                };

                // Đọc file dưới dạng ArrayBuffer
                reader.readAsArrayBuffer(chunk);
            };

            // Bắt đầu đọc và gửi chunk
            readAndSendChunk();
        });

    });

}
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const link = document.createElement('a');

    link.href = window.URL.createObjectURL(blob);
    link.download = filename;

    // Tự động kích hoạt sự kiện click để tải xuống
    link.dispatchEvent(new MouseEvent('click'));
}



