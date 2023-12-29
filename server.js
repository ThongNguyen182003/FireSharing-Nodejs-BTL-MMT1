const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const serverPort = 3000;
const serverIP = '192.168.238.101';


app.use(express.static(path.join(__dirname, 'public')));
const publicClientPath = path.join(__dirname, 'public', 'client');
const publicServerPath = path.join(__dirname, 'public', 'server');

// Đường dẫn đến tệp tin lưu thông tin đăng ký
const userDataFilePath = path.join(publicServerPath, 'usersData.json');

// Tải thông tin đăng ký từ tệp tin JSON khi server khởi động
let usersDataRegister = loadUserData();
const usersDataLogin = {};

function loadUserData() {
    try {
        const data = fs.readFileSync(userDataFilePath, 'utf-8');
        if (data.trim() === "") {
            // If the file is empty, return an empty array
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading user data:', error);
        // If there's an error, return an empty array
        return [];
    }
}


function saveUserData() {
    try {
        const data = JSON.stringify(usersDataRegister, null, 2);
        fs.writeFileSync(userDataFilePath, data, 'utf-8');
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}


app.use(express.static(publicClientPath));

io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('register', ({ username, password }) => {
        // Check if the username already exists
        const userExists = usersDataRegister.some(user => user.username === username);

        if (!userExists) {
            const folderPath = path.join(publicClientPath, username);
            if (!fs.existsSync(folderPath)) {
                fs.mkdir(folderPath, { recursive: true }, (err) => {
                    if (err) {
                        console.error('Error creating folder:', err);
                        socket.emit('folderCreationFailed', { success: false, message: 'Folder creation failed' });
                    } else {
                        console.log('Folder created successfully:', folderPath);

                        // Store user information in the usersDataRegister array
                        const userData = { username, password, files: [] };
                        usersDataRegister.push(userData);

                        // Save updated user data to the JSON file
                        saveUserData();

                        // Send a success message and user information back to the client
                        socket.emit('folderCreated', { success: true, userData });
                    }
                });
            } else {
                console.log('Folder already exists:', folderPath);
                socket.emit('folderExists', { success: false, message: 'Folder already exists' });
                socket.emit('register-fail');
            }
        } else {
            // Username already exists, send an error message
            socket.emit('register-fail');
        }
    });

    socket.on('login', ({ username, password }) => {
        // Check if the user is registered
        if (usersDataRegister.length > 0) {
            const userDataRegister = usersDataRegister.find(user => user.username === username && user.password === password);

            if (userDataRegister) {
                const uid = socket.id;
                usersDataLogin[uid] = userDataRegister;
                console.log(uid);
                console.log("Đăng nhập thành công : ", usersDataLogin[uid]);

                // Join the user to their room
                socket.join(username);

                // Check if userDataRegister has a files property
                if ('files' in userDataRegister) {
                    // Emit the list-file event with the user's files
                    socket.emit("list-file", { username, files: userDataRegister.files });
                    console.log("File Shared: ", userDataRegister.files);
                } else {
                    // If there are no files, you can emit an empty list or handle it accordingly
                    socket.emit("list-file", { username, files: [] });
                }

                // Send the success response to the client
                socket.emit('loginResponse', { success: true, userData: { uid, username } });
                io.emit("active-users", { users: Object.values(usersDataLogin).map(user => user.username) });
            } else {
                // If the user is not registered or credentials don't match, send a failure message
                socket.emit('loginResponse', { success: false, message: 'Invalid credentials' });
                console.log("Đăng nhập thất bại !!!");
            }
        } else {
            // Send a message that no users are registered
            socket.emit('loginResponse', { success: false, message: 'No users are registered' });
        }
    });


    socket.on('file-can-share', ({ user_send, filenames }) => {
        // Xử lý sự kiện khi có yêu cầu chia sẻ file
        console.log(`User ${user_send} wants to share the following files:`, filenames);

        // Thực hiện xử lý khác tùy thuộc vào yêu cầu của bạn
        const userData = usersDataRegister.find(user => user.username === user_send);
        if (userData) {
            // Lọc ra các giá trị không trùng lặp từ filenames và thêm vào mảng files của người dùng
            const uniqueFiles = filenames.filter(filename => !userData.files.includes(filename));
            userData.files.push(...uniqueFiles);

            // Lưu cập nhật vào tệp JSON
            saveUserData();

            console.log(`Files added to ${user_send}'s shared files:`, uniqueFiles);
        } else {
            console.log(`User ${user_send} not found.`);
        }
        socket.emit("list-file", { user_send, files: userData.files });
        console.log("File Shared: ", userData.files);
    });
    socket.on("delete-file", ({ username, filename: file }) => {
        const userData = usersDataRegister.find(user => user.username === username);

        if (userData) {
            // Lọc ra các files không trùng với filename để xóa
            userData.files = userData.files.filter(existingFile => existingFile !== file);

            // Lưu cập nhật vào tệp JSON
            saveUserData();

            console.log(`File ${file} deleted from ${username}'s shared files`);

            // Gửi thông báo về việc xóa file thành công cho client
            socket.emit("file-deleted", { username, filename: file });


            // (Optional) Cập nhật danh sách file ngay lập tức trên client
            socket.emit("list-file", { username, files: userData.files });
        } else {
            console.log(`User ${username} not found.`);
        }
    });
    socket.on('get-user-files', ({ username }) => {
        // Tìm thông tin người dùng trong mảng usersDataRegister
        const userData = usersDataRegister.find(user => user.username === username);

        if (userData) {
            // Gửi danh sách file của người dùng đến client
            socket.emit('user-files', { username, files: userData.files });
        } else {
            // Nếu không tìm thấy người dùng, gửi thông báo về client
            socket.emit('user-not-found', { username });
        }
    });


    // ...

    // Lắng nghe sự kiện upload-file-chunk từ client
    socket.on('upload-file-chunk', ({ client_id, filename, content, isLastChunk, username_send }) => {
        // Gửi nội dung của chunk đến client_id
        console.log("Client " + username_send + " sended file " + filename + " to " + client_id);
        io.to(client_id).emit('file-chunk-received', { filename, content, isLastChunk });

        if (isLastChunk) {
            // Gửi sự kiện file-received để thông báo rằng tất cả các chunks đã được nhận
            io.to(client_id).emit('file-received', { filename });
        }
    });


    // ...

    socket.on('search-file', ({ client_id, filename, username_send }) => {
        console.log("Client " + client_id + " request file " + filename + " from " + username_send);
        io.to(username_send).emit('file-request', { client_id, filename, username_send });
    });

    socket.on('disconnect', () => {
        // Remove user data on disconnect
        const uid = socket.id;

        console.log("User disconnected: ", uid);
        // Check if the user data exists before attempting to delete
        if (usersDataLogin[uid]) {
            console.log("User logout: ", usersDataLogin[uid]);
            delete usersDataLogin[uid];
            io.emit("active-users", { users: Object.values(usersDataLogin).map(user => user.username) });
        }
    });
    // Server-side code

});
function combineChunks(chunksDirectory, filename) {
    // Lấy danh sách tất cả các tệp tin chunks
    const chunkFiles = fs.readdirSync(chunksDirectory);

    // Sắp xếp theo số thứ tự (ví dụ: chunk0, chunk1, ...)
    chunkFiles.sort((a, b) => {
        const aIndex = parseInt(a.split('_')[1]);
        const bIndex = parseInt(b.split('_')[1]);
        return aIndex - bIndex;
    });

    // Kết hợp các nội dung của các chunks
    const combinedContent = chunkFiles.map(chunkFile => {
        return fs.readFileSync(path.join(chunksDirectory, chunkFile));
    });

    // Gộp các chunks thành một mảng Buffer và chuyển thành ArrayBuffer
    return Buffer.concat(combinedContent).buffer;
}

function deleteChunksDirectory(chunksDirectory) {
    // Xóa toàn bộ thư mục và nội dung của nó
    fs.rmdirSync(chunksDirectory, { recursive: true });
}
function enableFileUpload(username) {
    const fileInput = document.getElementById("file-input-client");

    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];

        if (file) {
            const chunkSize = 1024 * 1024; // 1MB chunks (you can adjust this based on your needs)
            let offset = 0;

            const readAndSendChunk = () => {
                const reader = new FileReader();
                const chunk = file.slice(offset, offset + chunkSize);

                reader.onload = function () {
                    const buffer = new Uint8Array(reader.result);

                    // Emit the file chunk data to the server
                    socket.emit("file-upload", {
                        username,
                        filename: file.name,
                        buffer,
                        isLastChunk: offset + chunkSize >= file.size,
                    });

                    offset += chunkSize;

                    if (offset < file.size) {
                        // Read and send the next chunk
                        readAndSendChunk();
                    }
                };

                reader.readAsArrayBuffer(chunk);
            };

            // Start reading and sending chunks
            readAndSendChunk();
        }
    });
}

// ... (your existing code)

server.listen(serverPort, serverIP, () => {
    console.log(`Server is running on http://${serverIP}:${serverPort}`);
});
