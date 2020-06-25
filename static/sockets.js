document.addEventListener('DOMContentLoaded', () => {

    // Set a shortcut for document.getElementById
    const $ = document.getElementById.bind(document)

    // Connect to websocket
    var socket = io(location.protocol + '//' + document.domain + ':' + location.port);
    
    // Checking if the username is changed and is alphanumeric
    var username;
    var channel;
    var user_id;

    // When connected, configure user
    socket.on('connect', () => {
        // localStorage.debug = '*';
        // If user has already visited the site before
        if('username' in localStorage){

            // Use his old username
            username = localStorage.getItem('username');
            user_id = localStorage.getItem('user_id');

            $('shader').style.display = 'none';

            $('username-form-input').value = username;

            // jQuery('#message-form-input, #add-channel, #message-form-button, #channel-form-submit, #new-channel-name').disabled = false;
            $('message-form-input').disabled = false;
            $('add-channel').disabled = false;
            $('message-form-button').disabled = false;
            $('channel-form-submit').disabled = false;
            $('new-channel-name').disabled = false;
            
            $('submit-username').disabled = true;

            $('username-form-input').removeAttribute('autofocus');
            $('message-form-input').focus();

            if('channel' in localStorage){
                channel = localStorage.getItem('channel');
            }
            else{
                channel = 'general';
                localStorage.setItem('channel', channel);
            };

            socket.emit('join', {'user_id': user_id, 'username': username, 'channel': channel, 'channel_switch': false, 'from_dm': false});
        }
        else{
            require_username();
        };
        window.onbeforeunload = () => {

            socket.emit('leave', {'channel_switch': false, 'user_id': user_id, 'username': username, 'channel': channel}); 
            waitMs(50);
        };
    });

    socket.on('announce message', data => {
        if(data.is_dm == true){
            if($('channel-header').innerText == data.user){
                render_message(data.user, data.message, data.date.slice(12, 20), data.id);
                $('message-list-container').scrollTop = $('message-list-container').scrollHeight;
            }
            else{
                if(!jQuery(`#dm-${data.user}`).length){
                    render_dm(data.user);
                    // notify(data.user);
                    // jQuery(`#dm-${data.user}`).children().text(1);
                    // return;
                }
                notify(data.user);
                // else{
                    jQuery(`#dm-${data.user}`).children('.notification').text(+ (jQuery(`#dm-${data.user}`).children('.notification').text()) + 1);
                // }
            }
        }
        else if(sessionStorage.getItem('in_dm') == 'false'){
            render_message(data.user, data.message, data.date.slice(12, 20), data.id);
            $('message-list-container').scrollTop = $('message-list-container').scrollHeight;
        }
        else if(localStorage.getItem('username') == data.user){
            render_message(data.user, data.message, data.date.slice(12, 20), data.id);
            $('message-list-container').scrollTop = $('message-list-container').scrollHeight;
        }
    });

    socket.on('left', data => {
        if($('channel-header').innerText != data.username){
            try{
                document.getElementById(data.username).remove();
                render_message(data.username, 'has left the channel');
                $('message-list-container').scrollTop = $('message-list-container').scrollHeight;
            }
            catch{
                return false;
            }
        }
    });

    socket.on('joined', data => {        
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('username', data.username);
        localStorage.setItem('channel', data.channel);

        username = data.username;        
        channel = data.channel;
        
        jQuery('#channel-list a, #dm-list a').removeClass('active');

        jQuery(`#${data.channel}`).addClass('active');
        
        // Restart the message and user lists
        $('message-list').innerHTML = '';
        $('user-list').innerHTML = '';
        $('channel-header').innerText = data.channel;

        // Populate the user list
        const userList = JSON.parse(data.user_list);
        for(user in userList){
            render_user(userList[user]);
        }

        // Populate the messages
        if(data.messages){
            const messageList = JSON.parse(data.messages);
            if(messageList.length > 4){
                render_message_list(messageList);
            }
            else{
                for(message in messageList){
                    render_message(messageList[message].user, messageList[message].message, messageList[message].date.slice(12, 20), messageList[message].id);
                }
            }            
            $('message-list-container').scrollTop = $('message-list-container').scrollHeight;
        }
        sessionStorage.setItem('in_dm', false);
    });

    socket.on('user joined', data => {
        if(sessionStorage.getItem('in_dm') == "false" &&
            !jQuery(`#${data.username}`).length){
            render_user(data.username);
            render_message(data.username, 'has joined the channel');
            $('message-list-container').scrollTop = $('message-list-container').scrollHeight;
        }
    })

    socket.on('channel created', data => {
        // Show the new channel to everyone
        render_channel(data.channel);
    })

    socket.on('channel form reset', () => {
        // Reset the form
        $('new-channel-name').value='';
        $('channel-form-div').hidden = true;
        $('channel-button').className = 'fas fa-plus fa-lg';
    })

    socket.on('user changed name', data => {

        $(data.oldusername).innerText = data.username;
        $(data.oldusername).id = data.username;
        if($(`dm-${data.oldusername}`)){
            $(`dm-${data.oldusername}`).innerText = data.username;
            $(`dm-${data.oldusername}`).setAttribute('id', `dm-${data.username}`);
            if($('channel-header').innerText == data.oldusername){
                $('channel-header').innerText = data.username;
            }
        }   
        render_message(data.oldusername, `has changed their name to ${data.username}`);
        $('message-list-container').scrollTop = $('message-list-container').scrollHeight;
    })

    socket.on('username changed', data => {

        $('shader').style.display = 'none';
        // Let the user type messages
        // jQuery('#message-form-input, #add-channel, #message-form-button, #channel-form-submit, #new-channel-name').disabled = false;
        $('message-form-input').disabled = false;
        $('add-channel').disabled = false;
        $('message-form-button').disabled = false;
        $('channel-form-submit').disabled = false;
        $('new-channel-name').disabled = false;

        localStorage.setItem('username', data.username);
        username = data.username;
    })

    socket.on('username error', data => {
        if(data.just_joined){
            localStorage.removeItem('username');
            require_username();
        };
        $('username-form-input').classList.add('is-invalid');
        $('submit-username').disabled = true;
    })

    socket.on('channel error', () => {
        $('new-channel-name').classList.add('is-invalid');
    })

    socket.on('joined dm', data => {

        if(data.messages){
            const messageList = JSON.parse(data.messages);
            if(messageList.length > 4){
                render_message_list(messageList);
            }
            else{
                for(message in messageList){
                    render_message(messageList[message].user, messageList[message].message, messageList[message].date.slice(12, 20), messageList[message].id);
                }
            }            
            $('message-list-container').scrollTop = $('message-list-container').scrollHeight;
        }
    })


    jQuery('#user-list').on('click', 'li', function(){
        if(this.innerText != username){
            if(!jQuery(`#dm-${this.innerText}`).length){
                render_dm(this.innerText);
            }
            else if(jQuery(`#dm-${this.innerText}`).is(":hidden")){
                jQuery(`#dm-${this.innerText}`).show();
            }

            if(!jQuery(`#dm-${this.innerText}`).hasClass("active")){
                $('message-list').innerHTML = '';
                $('user-list').innerHTML = '';
                $('channel-header').innerText = this.innerText;

                render_user(username);
                render_user(this.innerText);

                jQuery('#channel-list a, #dm-list a').removeClass('active');

                jQuery(`#dm-${this.innerText}`).addClass('active');

                sessionStorage.setItem('in_dm', true);
                $('message-form-input').focus();
                socket.emit('join dm', {'user_id': user_id, 'receiver': this.innerText});
            }
        }
    });

    jQuery('#dm-list').on('click', 'a', function(e){
        if(e.target.name == 'dm-object'){
            $('message-list').innerHTML = '';
            $('user-list').innerHTML = '';
            $('channel-header').innerText = this.firstChild.nodeValue;

            render_user(username);
            render_user(this.firstChild.nodeValue);

            denotify(this.firstChild.nodeValue);
            jQuery('#channel-list a, #dm-list a').removeClass('active');

            jQuery(`#dm-${this.firstChild.nodeValue}`).addClass('active');

            sessionStorage.setItem('in_dm', true);
            $('message-form-input').focus();
            socket.emit('join dm', {'user_id': localStorage.getItem('user_id'), 'receiver': this.firstChild.nodeValue})
        }
    })

    jQuery('#channel-list').on('click', 'a', function(){
        if (!this.classList.contains('active')){
            
            jQuery('#channel-list a, #dm-list a').removeClass('active');

            const oldChannel = channel;
            const newChannel = this.innerText;
            if(sessionStorage.getItem('in_dm') == 'false' &&
                localStorage.getItem('channel') != this.innerText){
                socket.emit('leave', {'user_id': localStorage.getItem('user_id'), 'username': username, 'channel': oldChannel, 'channel_switch': true});

                sessionStorage.setItem('in_dm', false);
            
                socket.emit('join', {'user_id': localStorage.getItem('user_id'), 'username': username, 'channel': newChannel, 'channel_switch': true, 'from_dm': false});
            }
            else if(sessionStorage.getItem('in_dm') == 'true' &&
                localStorage.getItem('channel') == this.innerText){

                sessionStorage.setItem('in_dm', false);
                socket.emit('join', {'user_id': localStorage.getItem('user_id'), 'username': username, 'channel': newChannel, 'channel_switch': true, 'from_dm': true});
            }
            else if(sessionStorage.getItem('in_dm') == 'true' &&
                localStorage.getItem('channel') != this.innerText){
                socket.emit('leave', {'user_id': localStorage.getItem('user_id'), 'username': username, 'channel': oldChannel, 'channel_switch': true});

                sessionStorage.setItem('in_dm', false);
                
                socket.emit('join', {'user_id': localStorage.getItem('user_id'), 'username': username, 'channel': newChannel, 'channel_switch': true, 'from_dm': false});
                }
            
        }
    })

    jQuery('#channel-form').on('submit', function() {

        // Store the active channel and the new one in vars
        const oldChannel = localStorage.getItem('channel');
        const newChannel = $('new-channel-name').value.trim();

        user_id = localStorage.getItem("user_id");

        // Emit the event and join the new channel/leave the old one
        socket.emit('channel creation', {'user_id': user_id, 'oldchannel': oldChannel, 'newchannel': newChannel, 'username': username});

        return false;
    });
    jQuery('#username-form').on('submit', function() {

        // Set the username submit button back to disabled
        $('submit-username').disabled = true;

        // Show when user changes name in chat
        if('username' in localStorage){
            var oldUsername = localStorage.getItem('username');
        }
        else{
            var oldUsername = 0;
        };
        if('channel' in localStorage){
            channel = localStorage.getItem('channel');
        }
        else{
            channel = 0;
        };
        if('user_id' in localStorage){
            user_id = localStorage.getItem('user_id');
        }
        else{
            user_id = 0;
        }
        // Store the new username and emit
        newUsername = $('username-form-input').value;

        socket.emit('username change', {'user_id': user_id, 'newusername': newUsername, 'oldusername': oldUsername, 'channel': channel});
        
        return false;        
    })

    jQuery('#message-form').on('submit', function() {            
        const message = $('message-form-input').value.trim();

        if(message != ''){
            if(sessionStorage.getItem('in_dm') == "true"){
                socket.emit('submit dm', {'message': message, 'sender': username, 'receiver': $('channel-header').innerText});
            }
            else{socket.emit('submit message', {'message': message, 'username': username, 'channel': channel});}
        };

        $('message-form-input').value='';
        return false;
    })
    jQuery('#dm-list').on('click', 'a #dm-close', function(){
        jQuery(this).parent().hide();
        if(sessionStorage.getItem('in_dm') == "false"){
            // sessionStorage.setItem('in_dm', false);
            socket.emit('join', {'user_id': user_id, 'username': username, 'channel': localStorage.getItem('channel'), 'channel_switch': true, 'from_dm': true});
        }
    })

})

