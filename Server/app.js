const express = require("express");
const {Server} = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server,{
    cors:{
        origin:"*",
        methods:["GET"]
    }
});

let connectedusers = 0;

const user = new Map();
const socketToUser = new Map();

//connections 
io.on("connection",(socket)=>{
    connectedusers++;
    console.log("New User connected", socket.id);
    console.log("Total Connected users:", connectedusers);
    

    socket.on("register",({username})=>{

        if(user.has(username)){
            console.log("Username already taken:", username);
            socket.emit("register-response", {
                success: false,
                message: "Username already taken. Try Another one."
            });
            return;
        }
        
        user.set(username, socket.id);
        socketToUser.set(socket.id, username);
        console.log(`Registered user: '${username}', with ID:, ${socket.id}`);
        
        socket.emit("register-response", {
            success: true,
            message: "Registered successfully",
            username
        });
    });

    socket.on("send-message",({to, message})=>{
        const targetSocketId = user.get(to);
        if(targetSocketId){
            io.to(targetSocketId).emit("receive-message", {
                from: socketToUser.get(socket.id),
                message
            });
            console.log("Message sent to", to);
        }else{
            console.log("User not found:", to);
        }
    })

    socket.on("disconnect",()=>{
        connectedusers--;
        console.log("User disconnected", socket.id);
        console.log("Total Connected users:", Math.max(connectedusers,0));

        const username = socketToUser.get(socket.id);
        socketToUser.delete(socket.id);
        user.delete(username);
        
    });
});


app.get("/",( req, res ) => {
    res.send("Hello World");
});

app.post("/set-notification",(req,res)=>{
    const {title,message} = req.query;

    io.emit("notification", {title,message});
    res.send("Notification sent to all connected clients");
})

server.listen(8069,()=>{
    console.log("App is listening at port 8069");
});
