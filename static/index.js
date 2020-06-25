const $ = document.getElementById.bind(document)

var allowedChars = /^[0-9a-zA-Z]+$/;

if($('username-form-input').value.length < 3){
    $('submit-username').disabled = true;
}
$('username-form-input').oninput = function(){

    if(!this.value.match(allowedChars) 
      || this.value.length < 3
      || this.value.length > 16)
    {
        this.classList.add('is-invalid');
        $('submit-username').disabled = true;
    }
    else if(this.value.trim() == localStorage.getItem("username")){
        this.classList.remove('is-invalid');
        $('submit-username').disabled = true;
    }
    else{
        this.classList.remove('is-invalid');
        $('submit-username').disabled = false;
    };
}

// Checking validity of a new channel
// Fix the first click/being able to submit empty name
$('new-channel-name').onfocus = function(){
    this.classList.add('is-invalid');
    $('channel-form-submit').disabled = true;
}

// Checking the channel name
$('new-channel-name').oninput = function(){

    // Checking if the channel name is not used already
    var check;
    document.getElementsByName('channel-object').forEach(
        (channel) => {
            if(channel.innerText == this.value.trim()){
                check = true;
            };
        });

    if(!this.value.match(allowedChars)
      || this.value.length < 3
      || this.value.length > 16
      || check)
    {
        this.classList.add('is-invalid');
        $('channel-form-submit').disabled = true;
    }
    else{
        this.classList.remove('is-invalid');
        $('channel-form-submit').disabled = false;
    };
}

// Popping up the channel form
$('add-channel').onclick = () => {
    if($('channel-form-div').hasAttribute('hidden')){
        $('channel-button').className = 'fas fa-plus fa-plus-x fa-lg';
        $('channel-form-div').hidden = false;
        $('channel-form').addEventListener('animationend', function(){
            $('new-channel-name').focus();
        });
    }
    else{
        $('channel-button').className = 'fas fa-plus fa-lg';
        $('channel-form-div').hidden = true;
    }    
}

$('message-form-input').onkeydown = function(){
    if(this.value.trim() === '' || this.value.length > 200){
        $('message-form-button').disabled = true;
    }
    else{
        $('message-form-button').disabled = false;
    }
}


function require_username() {
    $('username-form-input').focus();
    $('message-form-input').disabled = true;
    $('message-form-button').disabled = true;
    $('channel-form-submit').disabled = true;
    $('new-channel-name').disabled = true;
    $('add-channel').disabled = true;
}

function render_message(user, message, time, id) {
    const messageObject = document.createElement('li');
    const messageOwner = document.createElement('span');
    const messageLine = document.createElement('div');
    const messageTime = document.createElement('span');

    var messageId;
    if(id == 100){
        messageId = document.getElementsByClassName('message-object list-group-item py-0 message-dummy').length + 1;
    }
    else{
        messageId = id;
    }
    messageObject.className = 'message-object list-group-item py-0';
    messageLine.className = 'message-line';
    messageLine.innerText = `${message}`;

    if(time){
        messageOwner.className = 'message-owner';
        messageTime.className = 'text-muted small message-time';
        messageTime.innerText = `${time.replace(/^0+/, '')}`;
        messageOwner.innerText = `${user}`;
        messageObject.id = messageId;
        messageObject.setAttribute('name', `${user}${time}`);
        messageObject.classList.add('message-dummy');

        if($(`${messageId - 1}`)){
            if($(`${messageId - 1}`).getAttribute('name') === `${user}${time}`){
                messageTime.style.visibility = "hidden";
            }
        }

        messageObject.append(messageTime, messageOwner, messageLine);   
    }
    else{
        messageObject.innerText = `${user} ${message}`
        messageObject.classList.add('message-status');
        messageObject.classList.add('font-italic');

        setTimeout(function(){
            jQuery(messageObject).fadeTo("4000", 0, () => {
                jQuery(messageObject).slideUp("2000", () => {
                    messageObject.remove();
                });                
            });
        }
        , 10000);
    }
    $('message-list').append(messageObject);
}

function render_message_list(messageList){
    let newElements = '';
    for(message in messageList){
        let messageTime = messageList[message].date.slice(12, 20);
        let messageOwner = messageList[message].user;
        let messageLine = messageList[message].message;
        let messageId = messageList[message].id;
        newElements += `<li class="message-object list-group-item py-0 message-dummy" id="${messageId}" name="${messageOwner}${messageTime}">
        <span class="text-muted small message-time">${messageTime.replace(/^0+/, '')}</span>
        <span class="message-owner">${messageOwner}</span>
        <div class="message-line">${messageLine}</div></li>`
    }
    $('message-list').innerHTML = newElements;
}

function render_channel(channel) {
    const newChannelObject = document.createElement('a');
    newChannelObject.className = 'channel-object mx-auto rounded-lg list-group-item bg-transparent border-0'
    newChannelObject.href = '#';
    newChannelObject.id = channel;
    newChannelObject.name = 'channel-object';
    newChannelObject.innerText = `${channel}`;

    $('channel-list').append(newChannelObject);
    return(newChannelObject);
}

function render_dm(dm) {
    const newChannelObject = document.createElement('a');
    newChannelObject.className = 'dm-object mx-auto rounded-lg list-group-item bg-transparent border-0'
    newChannelObject.href = '#';
    newChannelObject.id = `dm-${dm}`;
    newChannelObject.name = 'dm-object';
    newChannelObject.innerText = `${dm}`;

    const counter = document.createElement('span');
    counter.className = 'notification';
    const dmClose = document.createElement('span');
    dmClose.className = 'fas fa-times';
    dmClose.id = 'dm-close';

    newChannelObject.append(counter);
    newChannelObject.append(dmClose);

    $('dm-list').append(newChannelObject);

}

function notify(dm) {
    $(`dm-${dm}`).classList.remove('border-0');
    $(`dm-${dm}`).classList.add('notification-border');
    jQuery(`#dm-${dm}`).show();

}

function denotify(dm) {
    jQuery(`#dm-${dm}`).children().text('');
    $(`dm-${dm}`).classList.remove('notification-border');
    $(`dm-${dm}`).classList.add('border-0');
}

function render_user(user) {
    const userName = document.createElement('li');
    userName.className = 'list-group-item user-list-item mx-auto rounded-lg bg-transparent';
    userName.setAttribute('type', 'button');
    userName.id = user;
    userName.setAttribute('name', 'user-object');
    userName.innerText = user;
    
    $('user-list').append(userName);
}

setInterval(function() {
    var userCounter = document.querySelectorAll('.user-list-item').length;
    $('users-area-header').setAttribute('data-value', userCounter);
}, 500);

// Small function for a delay, fixing rapid F5 in firefox causing multiple same users
function waitMs(ms) {
    var start = Date.now()
    var now = start;
    while(now - start < ms){
        now = Date.now()
    }
}
jQuery('#dm-list').on("mouseenter", 'a', function(){
    jQuery('.notification', this).hide();
    jQuery('#dm-close', this).show();
})
jQuery('#dm-list').on("mouseleave", 'a', function(){
    jQuery('.notification', this).show();
    jQuery('#dm-close', this).hide();
})

// jQuery('#channel-header').on('mouseenter', function(){
//     console.log("meow");
//     $('channels-area-div').classList.toggle('channels-area-div-active');
// })
