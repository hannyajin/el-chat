$(function() {
  var textarea = $('.chat-textarea');
  var chatName = $('.chat-name');
  var chatStatus = $('.chat-status span');
  var chatMessages = $('.chat-messages');

  function setStatus(str) {
    chatStatus.text(str);
    setTimeout(function() {
      chatStatus.text('Idle');
    }, 4000);
  }

  function newMessageElement(name, message) {
    var el = "<div class='chat-message'><span class='name'>"
                + name +
                "</span>" + ": " + "<span class='message'>"
                + message +
                "</span></div>";
    return el;
  }

  try {
    var socket = io.connect("http://127.0.0.1:40223");
  } catch (err) {
    // TODO Status to warn user

  }

  if (socket !== undefined) {
    socket.emit('join', {
      topic: 'Default'
    });

    // Listen for enter key
    textarea.on('keyup', function(evt) {
      evt.preventDefault;

      var name = chatName.val();
      if (evt.which == 13 && !evt.shiftKey) { // Enter Key
        var data = {
          name: name,
          message: textarea.val()
        };

        socket.emit('message', data);

        textarea.val("");
      }
    });

    // listen for responses from server
    socket.on('status', function(data) {
      console.log("Status Received.");
      setStatus(data.status);
    });

    socket.on('message', function(data) {
      var el = newMessageElement(data.from, data.message);
      chatMessages.append(el);
      chatMessages.scrollTop( chatMessages[0].scrollHeight );

      $('.chat-message').last().hide();
      $('.chat-message').last().fadeIn();
    });
  }


  /** Front-end */
  var list = $('.chat-window nav ul li');
  var active = list.last();
  list.each(function(index) {
    $(this).on('click', function() {
      if (active) {
        try {
          active.removeClass('active-room');
        } catch (err) {
          console.log("error in active removeclass server.js ln 37");
        }
      }
      if (active !== $(this)) {
        $('.chat-message').empty();
      }
      active = $(this);
      active.addClass('active-room');
      socket.emit('join', {
        topic: active.text()
      });
    })
  });

});