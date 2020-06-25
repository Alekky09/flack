import os
import datetime
import json

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)


# Keep track of all the users
users = {}

# Keep track of all the channels, general channel will always be there
channels = {
    "general":{
        "owner": None,
        "users": [],
        "messages": []
    }
}
user_id = 0
dms = {}

def generate_user_id():
    global user_id
    user_id += 1
    if user_id in users:
        generate_user_id()
    return f"{user_id}"

def generate_dm_id():
    global dm_id
    dm_id += 1
    if dm_id in dms:
        generate_dm_id()
    return f"{dm_id}"

@app.route("/")
def index():
    return render_template("index.html", channels=channels)

@socketio.on('connect')
def user_connect():
    print("User connected!")

# This is used whenever a user joins a channel (on connecting, on switching channels and on creating it)
@socketio.on("join")
def join(data):
    
    username = data["username"]
    user_id = data["user_id"]
    current_channel = data["channel"]

    if not user_id:
        user_id = generate_user_id()
    if not data["channel_switch"]:    
        # If the user already exists (if the username is taken)
        for user in users:
            if users[user][0] == username and user != user_id:
                emit("username error", {"just_joined": True})
                return

    # If the channel doesn't exist
    if current_channel not in channels:
        current_channel = "general"

    # Add him to the list of users and join the socket room
    join_room(current_channel)
    user_object = (username, request.sid)
    users[user_id] = user_object

    if username not in channels[current_channel]["users"]:
        channels[current_channel]["users"].append(username)

    message_list = json.dumps(channels[current_channel]["messages"])
    user_list = json.dumps(channels[current_channel]["users"])

    print(f"{username} joined {current_channel} channel!")

    # Emit "joined" for the user to display all the previous messages and the users on the channel
    emit("joined", {
            "user_id": user_id,
            "username": username, 
            "channel": current_channel, 
            "messages": message_list, 
            "user_list": user_list
        })
    
    # Emit "user joined" for the other users on the channel when someone joins
    if data["from_dm"] == False:
        emit("user joined", {
                "username": username, 
                "user_list": user_list,
                "channel": current_channel
            }, 
            room=current_channel, 
            include_self=False)

# This is used whenever a user leaves a channel (on disconnecting, switching channels, or creating one)
@socketio.on("leave")
def leave(data):
    # Grab the channel that the user is leaving and the username
    try:
        old_channel = data["channel"]
    except KeyError:
        return

    username = data["username"]
    user_id = data["user_id"]
    # Leave the channels room
    leave_room(old_channel)

    # Remove the user from the channels user list
    try:
        if username in channels[old_channel]["users"]:
            channels[old_channel]["users"].remove(username)
    except KeyError:
        pass

    if not data["channel_switch"]:
        if user_id in users:
            users.pop(user_id)
        
    print(f"{username} left {old_channel} channel.")
    
    emit("left", {"username": username}, room=old_channel)

@socketio.on('disconnect')
def user_disconnect():

    for user in users.copy():
        if users[user][1] == request.sid:            
            for channel in channels:
                if users[user][0] in channels[channel]["users"]:
                    channels[channel]["users"].remove(users[user][0])                    
                    emit("left", {"username": users[user][0]}, room=channel)

            users.pop(user)

    print('Client disconnected!')

@socketio.on("submit message")
def submit_message(data):

    current_channel = data["channel"]

    if len(channels[current_channel]["messages"]) > 99:
        channels[current_channel]["messages"].pop(0)
        for amessage in channels[current_channel]["messages"]:
            amessage["id"] -= 1      

    message = {
        "id": len(channels[current_channel]["messages"]) + 1,
        "user": data["username"],
        "message": data["message"],
        "date": datetime.datetime.now().strftime("%d/%m/%Y, %I:%M %p")
    }
    
    channels[current_channel]["messages"].append(message)

    print(f"{message['user']}: {message['message']}  {message['date']} in {current_channel}")

    emit("announce message", {
            "id": message["id"],
            "user": message["user"], 
            "message": message["message"], 
            "date": message["date"],
            "is_dm": False
        }, 
        room=current_channel)

@socketio.on("channel creation")
def channel_creation(data):

    old_channel = data["oldchannel"]
    new_channel = data["newchannel"]
    username = data["username"]
    user_id = data["user_id"]

    if new_channel in channels or new_channel == "":
        emit("channel error")
        return

    i = 0
    for channel in channels:
        if channels[channel]["owner"] == user_id:
            i += 1
            if i > 3:
                emit("channel error")
                return

    leave_room(old_channel)
    join_room(new_channel)

    channels[old_channel]["users"].remove(username)

    channels[new_channel] = {
        "owner": user_id,
        "users": [],
        "messages": []
    }
    channels[new_channel]["users"].append(username)

    user_list = json.dumps(channels[new_channel]["users"])

    print(f"{username} joined {new_channel} channel.")

    emit("left", {"username": username}, room=old_channel)

    emit("channel created", {"channel": new_channel}, broadcast=True)

    emit("joined", {
            "user_id": user_id,
            "channel": new_channel, 
            "username": username, 
            "user_list": user_list
            }, 
            room=new_channel)

    emit("channel form reset")

@socketio.on("username change")
def username_change(data):

    oldusername = data["oldusername"]
    newusername = data["newusername"]
    user_id = data["user_id"]

    if oldusername == 0:
        current_channel = "general"
    else:
        current_channel = data["channel"]
    if not user_id:
        user_id = generate_user_id()
    
    for user in users:
        if users[user][0] == newusername:
            emit("username error", {"just_joined": False})
            return

    user_object = (newusername, request.sid)  
    users[user_id] = user_object

    messages = []
    user_list = []

    if oldusername in channels[current_channel]["users"]:
        channels[current_channel]["users"].remove(oldusername)
    
    channels[current_channel]["users"].append(newusername)
    messages = json.dumps(channels[current_channel]["messages"])
    user_list = json.dumps(channels[current_channel]["users"])

    if oldusername == 0:
        join_room("general")

        emit("joined", {
                "user_id": user_id,
                "username": newusername, 
                "channel": "general", 
                "messages": messages, 
                "user_list": user_list
            })

        emit("user joined", {
                "username": newusername, 
                "user_list": user_list
            }, 
            room="general", 
            include_self=False)

    else:
        emit("user changed name", { 
                "oldusername": oldusername, 
                "username": newusername
            }, 
            room=current_channel)

    emit("username changed", {
            "username": newusername
        })


@socketio.on("submit dm")
def submit_dm(data):

    sender = data["sender"]
    receiver = data["receiver"]

    message = {
        "user": data["sender"],
        "message": data["message"],
        "date": datetime.datetime.now().strftime("%d/%m/%Y, %I:%M %p")
    }

    receiver_id = 0
    sender_id = 0
    for user in users:
        if users[user][0] == receiver:
            receiver_socket = users[user][1]
            receiver_id = user
        if users[user][0] == sender:
            sender_id = user

    check = False
    for dm in dms:
        if sender_id in dm and receiver_id in dm:
            message["id"] = len(dms[dm]) + 1
            dms[dm].append(message)
            check = True

    if not check:
        message["id"] = 1
        dms[(sender_id, receiver_id)] = [message]

    emit("announce message", {
        "id": message["id"],
        "user": sender, 
        "message": message["message"], 
        "date": datetime.datetime.now().strftime("%d/%m/%Y, %I:%M %p"),
        "is_dm": False
    })

    emit("announce message", {
        "id": message["id"],
        "user": sender, 
        "message": message["message"], 
        "date": datetime.datetime.now().strftime("%d/%m/%Y, %I:%M %p"),
        "is_dm": True
    }, room=receiver_socket)

@socketio.on("join dm")
def join_dm(data):
    user_id = data["user_id"]
    receiver = data["receiver"]

    receiver_id = 0
    for user in users:
        if users[user][0] == receiver:
            receiver_id = user

    messages = 0
    for dm in dms:
        if user_id in dm and receiver_id in dm:
            messages = json.dumps(dms[dm])

    emit("joined dm", {
        "messages": messages
    })